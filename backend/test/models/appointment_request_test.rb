require "test_helper"

class AppointmentRequestTest < ActiveSupport::TestCase
  include ActionMailer::TestHelper
  setup do
    @rita_60 = services(:rita_consulta)   # 60 min
    @rita_30 = services(:rita_followup)   # 30 min, mesma nutricionista
    @joao_60 = services(:joao_consulta)   # outra nutricionista
  end

  # --- Validações e campos calculados ---------------------------------------

  test "is valid with name, email, date and service" do
    assert build(@rita_60, "ana@x.com", at(10)).valid?
  end

  test "requires guest name" do
    request = build(@rita_60, "ana@x.com", at(10), name: "")

    assert_not request.valid?
    assert request.errors[:guest_name].any?
  end

  test "requires a valid email" do
    assert_not build(@rita_60, "", at(10)).valid?
    assert_not build(@rita_60, "not-an-email", at(10)).valid?
  end

  test "requires starts_at" do
    assert_not build(@rita_60, "ana@x.com", nil).valid?
  end

  test "normalizes email to lowercase without spaces" do
    assert_equal "ana@x.com", build(@rita_60, "  Ana@X.COM ", at(10)).guest_email
  end

  test "ends_at is starts_at plus the service duration" do
    assert_equal at(11), submit(@rita_60, "a@x.com", at(10)).ends_at
    assert_equal at(10, 30), submit(@rita_30, "b@x.com", at(10)).ends_at
  end

  test "starts_at cannot be in the past" do
    request = build(@rita_60, "ana@x.com", 1.hour.ago)

    assert_not request.valid?
    assert_includes request.errors[:starts_at], "must be in the future"
  end

  test "submit! refuses a request in the past" do
    assert_raises(ActiveRecord::RecordInvalid) { submit(@rita_60, "ana@x.com", 1.day.ago) }
  end

  test "new requests start as pending" do
    assert submit(@rita_60, "ana@x.com", at(10)).pending?
  end

  # --- Regra 1: um pedido pendente por email --------------------------------

  test "a new request cancels the previous pending one of the same email" do
    first = submit(@rita_60, "ana@x.com", at(10))
    second = submit(@rita_60, "ana@x.com", at(14))

    assert first.reload.cancelled?
    assert second.pending?
  end

  test "email matching ignores case and spaces" do
    first = submit(@rita_60, "ana@x.com", at(10))
    submit(@rita_60, " ANA@x.com", at(14))

    assert first.reload.cancelled?
  end

  test "cancels the previous pending even when it was for another nutritionist" do
    first = submit(@joao_60, "ana@x.com", at(10))
    submit(@rita_60, "ana@x.com", at(14))

    assert first.reload.cancelled?
  end

  test "does not touch pending requests of other emails" do
    other = submit(@rita_60, "bia@x.com", at(10))
    submit(@rita_60, "ana@x.com", at(14))

    assert other.reload.pending?
  end

  test "does not cancel accepted requests of the same email" do
    accepted = submit(@rita_60, "ana@x.com", at(10))
    accepted.accept!
    submit(@rita_60, "ana@x.com", at(14))

    assert accepted.reload.accepted?
  end

  test "an invalid new request leaves the previous pending untouched" do
    first = submit(@rita_60, "ana@x.com", at(10))

    assert_raises(ActiveRecord::RecordInvalid) do
      AppointmentRequest.submit!(service: @rita_60, guest_name: "", guest_email: "ana@x.com", starts_at: at(14))
    end

    assert first.reload.pending?
  end

  # --- Colisão com pedidos já aceites ---------------------------------------

  test "cannot request a time that overlaps an accepted request" do
    submit(@rita_60, "ana@x.com", at(10)).accept!   # 10:00-11:00

    error = assert_raises(ActiveRecord::RecordInvalid) do
      submit(@rita_60, "bia@x.com", at(10, 30))
    end
    assert_match(/not available/, error.message)
  end

  test "overlap with an accepted request is detected across services of the same nutritionist" do
    submit(@rita_60, "ana@x.com", at(10)).accept!   # 10:00-11:00

    assert_raises(ActiveRecord::RecordInvalid) { submit(@rita_30, "bia@x.com", at(10, 30)) }
  end

  test "a request starting exactly when an accepted one ends is allowed" do
    submit(@rita_60, "ana@x.com", at(10)).accept!   # 10:00-11:00

    assert submit(@rita_60, "bia@x.com", at(11)).persisted?
  end

  test "an accepted request of another nutritionist does not block" do
    submit(@joao_60, "ana@x.com", at(10)).accept!

    assert submit(@rita_60, "bia@x.com", at(10)).persisted?
  end

  # --- Regra 3: aceitar rejeita os pendentes sobrepostos --------------------

  test "accepting rejects overlapping pending requests of the same nutritionist" do
    chosen = submit(@rita_60, "ana@x.com", at(10))        # 10:00-11:00
    overlap_same_service = submit(@rita_60, "bia@x.com", at(10, 30))
    overlap_other_service = submit(@rita_30, "carla@x.com", at(10, 15))

    chosen.accept!

    assert chosen.reload.accepted?
    assert overlap_same_service.reload.rejected?
    assert overlap_other_service.reload.rejected?
  end

  test "accepting does not touch requests that only touch the edges" do
    chosen = submit(@rita_60, "ana@x.com", at(10))        # 10:00-11:00
    before = submit(@rita_60, "bia@x.com", at(9))         # 09:00-10:00
    after = submit(@rita_60, "carla@x.com", at(11))       # 11:00-12:00

    chosen.accept!

    assert before.reload.pending?
    assert after.reload.pending?
  end

  test "accepting does not touch requests of other nutritionists" do
    chosen = submit(@rita_60, "ana@x.com", at(10))
    other = submit(@joao_60, "bia@x.com", at(10))

    chosen.accept!

    assert other.reload.pending?
  end

  test "accepting does not change requests that were already decided" do
    chosen = submit(@rita_60, "ana@x.com", at(10))
    cancelled = submit(@rita_60, "bia@x.com", at(10, 15))
    cancelled.cancelled!

    chosen.accept!

    assert cancelled.reload.cancelled?
  end

  # --- Transições de estado -------------------------------------------------

  test "reject! marks a pending request as rejected" do
    request = submit(@rita_60, "ana@x.com", at(10))

    request.reject!

    assert request.reload.rejected?
  end

  test "only pending requests can be accepted or rejected" do
    %i[accepted rejected cancelled].each_with_index do |status, i|
      request = submit(@rita_60, "guest#{i}@x.com", at(8 + i * 2))
      request.update_columns(status: status)

      assert_raises(AppointmentRequest::InvalidTransition) { request.accept! }
      assert_raises(AppointmentRequest::InvalidTransition) { request.reject! }
    end
  end

  test "a stale in-memory request cannot be accepted after it changed in the database" do
    request = submit(@rita_60, "ana@x.com", at(10))
    AppointmentRequest.find(request.id).cancelled!   # outra "sessão" muda-o

    assert request.pending?   # o objeto em memória ainda acha que está pendente
    assert_raises(AppointmentRequest::InvalidTransition) { request.accept! }
  end

  # --- Regra 4: emails ao guest ---------------------------------------------

  test "accepting enqueues an accepted email to the guest" do
    request = submit(@rita_60, "ana@x.com", at(10))

    assert_enqueued_email_with AppointmentRequestMailer, :accepted, args: [ request ] do
      request.accept!
    end
  end

  test "rejecting enqueues a rejected email to the guest" do
    request = submit(@rita_60, "ana@x.com", at(10))

    assert_enqueued_email_with AppointmentRequestMailer, :rejected, args: [ request ] do
      request.reject!
    end
  end

  test "requests rejected automatically by accepting also get a rejected email" do
    chosen = submit(@rita_60, "ana@x.com", at(10))
    overlap = submit(@rita_60, "bia@x.com", at(10, 30))

    assert_enqueued_emails 2 do   # 1 accepted + 1 rejected
      chosen.accept!
    end
    assert_enqueued_email_with AppointmentRequestMailer, :rejected, args: [ overlap ]
  end

  test "submitting a request (and cancelling the previous one) sends no email" do
    submit(@rita_60, "ana@x.com", at(10))

    assert_no_enqueued_emails do
      submit(@rita_60, "ana@x.com", at(14))   # cancela o anterior
    end
  end

  test "no email is enqueued when accept! fails and the transaction rolls back" do
    chosen = submit(@rita_60, "ana@x.com", at(10))
    submit(@rita_60, "bia@x.com", at(10, 30))

    # Faz o accept! rebentar DEPOIS de accepted! (e do email enfileirado).
    with_failing_overlap_query do
      assert_no_enqueued_emails do
        assert_raises(RuntimeError) { chosen.accept! }
      end
    end

    assert chosen.reload.pending?
  end

  test "no email is enqueued for an invalid transition" do
    request = submit(@rita_60, "ana@x.com", at(10))
    request.update_columns(status: :cancelled)

    assert_no_enqueued_emails do
      assert_raises(AppointmentRequest::InvalidTransition) { request.accept! }
      assert_raises(AppointmentRequest::InvalidTransition) { request.reject! }
    end
  end

  # --- Rede de segurança na base de dados -----------------------------------

  test "database refuses two pending requests for the same email" do
    submit(@rita_60, "ana@x.com", at(10))
    duplicate = build(@rita_60, "ana@x.com", at(14))   # save! direto, sem submit!

    assert_raises(ActiveRecord::RecordNotUnique) { duplicate.save! }
  end

  test "database refuses an invalid status" do
    request = submit(@rita_60, "ana@x.com", at(10))

    assert_raises(ActiveRecord::CheckViolation) { request.update_columns(status: "banana") }
  end

  private

  # Substitui o scope `overlapping` por um que rebenta, e repõe o original no fim.
  def with_failing_overlap_query
    original = AppointmentRequest.method(:overlapping)
    AppointmentRequest.define_singleton_method(:overlapping) { |*| raise "boom" }
    yield
  ensure
    AppointmentRequest.define_singleton_method(:overlapping, original)
  end

  # Data sempre no futuro (daqui a 30 dias), senão os testes partiam com o tempo.
  def at(hour, minute = 0)
    30.days.from_now.in_time_zone.change(hour: hour, min: minute)
  end

  def build(service, email, starts_at, name: "Guest")
    AppointmentRequest.new(service: service, guest_name: name, guest_email: email, starts_at: starts_at)
  end

  def submit(service, email, starts_at)
    AppointmentRequest.submit!(service: service, guest_name: "Guest", guest_email: email, starts_at: starts_at)
  end
end
