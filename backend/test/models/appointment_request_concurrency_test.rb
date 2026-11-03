require "test_helper"

# Estes testes usam threads com ligações reais à BD, por isso NÃO podem correr
# dentro da transação que envolve os testes normais (senão as threads não se vêem).
# Em troca, limpam os pedidos que criam.
class AppointmentRequestConcurrencyTest < ActiveSupport::TestCase
  self.use_transactional_tests = false

  teardown { AppointmentRequest.delete_all }

  test "simultaneous requests from the same email to different nutritionists leave exactly one pending" do
    services = [ services(:rita_consulta), services(:joao_consulta) ]
    starts_at = 30.days.from_now.change(min: 0)

    20.times do |round|
      AppointmentRequest.delete_all
      barrier = Queue.new   # todas as threads esperam pelo "já" para arrancarem juntas

      threads = services.map do |service|
        Thread.new do
          ActiveRecord::Base.connection_pool.with_connection do
            barrier.pop
            AppointmentRequest.submit!(service: service, guest_name: "Ana", guest_email: "ana@x.com", starts_at: starts_at)
          end
        end
      end
      services.size.times { barrier << :go }

      threads.each(&:join)   # se alguma thread rebentou, o join relança o erro e o teste falha

      pending = AppointmentRequest.pending.where(guest_email: "ana@x.com").count
      assert_equal 1, pending, "round #{round}: expected exactly 1 pending request, got #{pending}"
    end
  end

  test "accepting still works when an overlapping pending request is rejected by hand at the same time" do
    rita = services(:rita_consulta)
    chosen = AppointmentRequest.submit!(service: rita, guest_name: "A", guest_email: "a@x.com", starts_at: 30.days.from_now.change(hour: 10, min: 0))
    overlap = AppointmentRequest.submit!(service: rita, guest_name: "B", guest_email: "b@x.com", starts_at: 30.days.from_now.change(hour: 10, min: 30))

    locked = Queue.new
    release = Queue.new

    # Outra "sessão": segura o lock do pedido sobreposto, e só depois o rejeita.
    manual_reject = Thread.new do
      ActiveRecord::Base.connection_pool.with_connection do
        AppointmentRequest.find(overlap.id).with_lock do
          locked << :locked
          release.pop
          AppointmentRequest.find(overlap.id).update_columns(status: "rejected")
        end
      end
    end

    locked.pop   # a outra sessão já tem o lock do sobreposto

    accepting = Thread.new do
      ActiveRecord::Base.connection_pool.with_connection { AppointmentRequest.find(chosen.id).accept! }
    end

    sleep 0.3          # dá tempo ao accept! para chegar ao pedido sobreposto e ficar à espera
    release << :go     # a outra sessão rejeita e faz commit

    manual_reject.join
    accepting.join     # se o accept! rebentou, o join relança o erro e o teste falha

    assert AppointmentRequest.find(chosen.id).accepted?
    assert AppointmentRequest.find(overlap.id).rejected?
  end
end
