require "test_helper"

# Endpoint tests: they check status codes, JSON and that the rules are reachable
# through the API. The rules themselves are tested in test/models.
class AppointmentRequestsControllerTest < ActionDispatch::IntegrationTest
  include ActionMailer::TestHelper

  setup do
    @rita = nutritionists(:rita)
    @rita_60 = services(:rita_consulta)   # 60 min
    @rita_30 = services(:rita_followup)   # 30 min
    @joao_60 = services(:joao_consulta)   # other nutritionist
  end

  # --- POST /appointment_requests --------------------------------------------

  test "create stores a pending request and returns it" do
    assert_difference -> { AppointmentRequest.count }, 1 do
      post appointment_requests_url, params: payload(@rita_60, "Ana@X.com", at(10)), as: :json
    end

    assert_response :created
    body = response.parsed_body
    assert_equal "pending", body["status"]
    assert_equal "ana@x.com", body["guest_email"]
    assert_equal @rita_60.id, body.dig("service", "id")
    assert_equal "Rita Silva", body.dig("nutritionist", "name")
    assert_equal Time.zone.parse(body["starts_at"]) + 60.minutes, Time.zone.parse(body["ends_at"])
  end

  test "create cancels the previous pending request of the same email (rule 1)" do
    post appointment_requests_url, params: payload(@rita_60, "ana@x.com", at(10)), as: :json
    first_id = response.parsed_body["id"]

    post appointment_requests_url, params: payload(@joao_60, "ana@x.com", at(15)), as: :json

    assert_response :created
    assert_equal "cancelled", AppointmentRequest.find(first_id).status
    assert_equal 1, AppointmentRequest.pending.where(guest_email: "ana@x.com").count
  end

  test "create sends no email" do
    assert_no_enqueued_emails do
      post appointment_requests_url, params: payload(@rita_60, "ana@x.com", at(10)), as: :json
    end
  end

  test "create returns 422 with the field errors for invalid data" do
    post appointment_requests_url, params: payload(@rita_60, "not-an-email", at(10), name: ""), as: :json

    assert_response :unprocessable_content
    body = response.parsed_body
    assert_equal "Validation failed", body["error"]
    assert body["details"].key?("guest_name")
    assert body["details"].key?("guest_email")
  end

  test "create returns 422 for a date in the past" do
    post appointment_requests_url, params: payload(@rita_60, "ana@x.com", 1.day.ago), as: :json

    assert_response :unprocessable_content
    assert response.parsed_body["details"].key?("starts_at")
  end

  test "create returns 422 when starts_at is missing or not a date" do
    post appointment_requests_url, params: payload(@rita_60, "ana@x.com", nil), as: :json
    assert_response :unprocessable_content

    post appointment_requests_url, params: payload(@rita_60, "ana@x.com", "tomorrow-ish"), as: :json
    assert_response :unprocessable_content
  end

  test "create returns 422 when the slot overlaps an accepted request" do
    accepted = AppointmentRequest.submit!(service: @rita_60, guest_name: "Bia", guest_email: "bia@x.com", starts_at: at(10))
    accepted.accept!

    post appointment_requests_url, params: payload(@rita_30, "ana@x.com", at(10, 30)), as: :json

    assert_response :unprocessable_content
    assert_equal [ "is not available" ], response.parsed_body.dig("details", "starts_at")
  end

  test "create returns 404 for an unknown service" do
    post appointment_requests_url, params: payload(@rita_60, "ana@x.com", at(10)).merge(service_id: 0), as: :json

    assert_response :not_found
    assert_equal "Not found", response.parsed_body["error"]
  end

  test "create returns 400 when service_id is missing" do
    post appointment_requests_url, params: { guest_name: "Ana", guest_email: "ana@x.com", starts_at: at(10) }, as: :json

    assert_response :bad_request
  end

  # --- GET /nutritionists/:id/appointment_requests ----------------------------

  test "index lists only the pending requests of that nutritionist, soonest first" do
    later = submit(@rita_60, "ana@x.com", at(15))
    sooner = submit(@rita_30, "bia@x.com", at(9))
    answered = submit(@rita_60, "cris@x.com", at(12))
    answered.reject!
    submit(@joao_60, "dino@x.com", at(10)) # other nutritionist

    get nutritionist_appointment_requests_url(@rita)

    assert_response :success
    body = response.parsed_body
    assert_equal({ "id" => @rita.id, "name" => "Rita Silva" }, body["nutritionist"])
    assert_equal [ sooner.id, later.id ], body["appointment_requests"].map { |r| r["id"] }
  end

  test "index shows what the nutritionist needs to answer" do
    submit(@rita_60, "ana@x.com", at(10), name: "Ana Guest")

    get nutritionist_appointment_requests_url(@rita)

    item = response.parsed_body["appointment_requests"].first
    assert_equal "Ana Guest", item["guest_name"]
    assert_equal "ana@x.com", item["guest_email"]
    assert_equal "Consulta de nutrição", item.dig("service", "name")
    assert item["starts_at"].present?
  end

  test "index is empty when there is nothing pending" do
    get nutritionist_appointment_requests_url(@rita)

    assert_response :success
    assert_equal [], response.parsed_body["appointment_requests"]
  end

  test "index returns 404 for an unknown nutritionist" do
    get nutritionist_appointment_requests_url(nutritionist_id: 0)

    assert_response :not_found
  end

  # --- PATCH /appointment_requests/:id/accept ---------------------------------

  test "accept accepts the request and emails the guest (rule 4)" do
    request = submit(@rita_60, "ana@x.com", at(10))

    assert_enqueued_email_with AppointmentRequestMailer, :accepted, args: [ request ] do
      patch accept_appointment_request_url(request)
    end

    assert_response :success
    assert_equal "accepted", response.parsed_body["status"]
    assert request.reload.accepted?
  end

  test "accept rejects the overlapping pending requests of the nutritionist (rule 3)" do
    chosen = submit(@rita_60, "ana@x.com", at(10))
    overlapping = submit(@rita_30, "bia@x.com", at(10, 30))
    other_slot = submit(@rita_60, "cris@x.com", at(14))
    other_nutritionist = submit(@joao_60, "dino@x.com", at(10))

    assert_enqueued_emails 2 do # 1 accepted + 1 rejected
      patch accept_appointment_request_url(chosen)
    end

    assert overlapping.reload.rejected?
    assert other_slot.reload.pending?
    assert other_nutritionist.reload.pending?
  end

  test "accept returns 409 when the request was already answered" do
    request = submit(@rita_60, "ana@x.com", at(10))
    request.reject!

    assert_no_enqueued_emails do
      patch accept_appointment_request_url(request)
    end

    assert_response :conflict
    assert_match(/not pending/, response.parsed_body["error"])
  end

  test "accept returns 404 for an unknown request" do
    patch accept_appointment_request_url(id: 0)

    assert_response :not_found
  end

  # --- PATCH /appointment_requests/:id/reject ---------------------------------

  test "reject rejects the request and emails the guest (rule 4)" do
    request = submit(@rita_60, "ana@x.com", at(10))

    assert_enqueued_email_with AppointmentRequestMailer, :rejected, args: [ request ] do
      patch reject_appointment_request_url(request)
    end

    assert_response :success
    assert_equal "rejected", response.parsed_body["status"]
  end

  test "reject leaves the overlapping requests alone" do
    chosen = submit(@rita_60, "ana@x.com", at(10))
    overlapping = submit(@rita_30, "bia@x.com", at(10, 30))

    patch reject_appointment_request_url(chosen)

    assert overlapping.reload.pending?
  end

  test "reject returns 409 when the request was already answered" do
    request = submit(@rita_60, "ana@x.com", at(10))
    request.accept!

    patch reject_appointment_request_url(request)

    assert_response :conflict
    assert request.reload.accepted?
  end

  private

  def at(hour, minute = 0)
    30.days.from_now.in_time_zone.change(hour: hour, min: minute)
  end

  def payload(service, email, starts_at, name: "Guest")
    { service_id: service.id, guest_name: name, guest_email: email, starts_at: starts_at }
  end

  def submit(service, email, starts_at, name: "Guest")
    AppointmentRequest.submit!(service: service, guest_name: name, guest_email: email, starts_at: starts_at)
  end
end
