require "test_helper"

class NutritionistTest < ActiveSupport::TestCase
  test "requires a name" do
    assert_not Nutritionist.new(name: "").valid?
  end

  test "strips spaces around the name" do
    assert_equal "Rita", Nutritionist.new(name: " Rita ").name
  end

  test "has many services" do
    assert_equal 2, nutritionists(:rita).services.count
  end

  test "appointment_requests reach requests of all her services" do
    rita = nutritionists(:rita)
    at = 30.days.from_now.in_time_zone.change(hour: 10)

    a = submit(services(:rita_consulta), "a@x.com", at)
    b = submit(services(:rita_followup), "b@x.com", at + 2.hours)
    submit(services(:joao_consulta), "c@x.com", at)

    assert_equal [ a, b ].sort_by(&:id), rita.appointment_requests.sort_by(&:id)
  end

  private

  def submit(service, email, starts_at)
    AppointmentRequest.submit!(service: service, guest_name: "Guest", guest_email: email, starts_at: starts_at)
  end
end
