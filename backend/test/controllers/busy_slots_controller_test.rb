require "test_helper"

class BusySlotsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @rita = nutritionists(:rita)
    @rita_60 = services(:rita_consulta)   # 60 min
    @rita_30 = services(:rita_followup)   # 30 min
    @joao_60 = services(:joao_consulta)   # other nutritionist
    @day = 30.days.from_now.in_time_zone.beginning_of_day
  end

  test "lists the accepted requests of the nutritionist, with start and end only" do
    accepted = submit(@rita_60, "ana@x.com", at(10))
    accepted.accept!

    get_slots(@rita)

    assert_response :success
    slots = response.parsed_body["busy_slots"]
    assert_equal 1, slots.size
    assert_equal %w[ends_at starts_at], slots.first.keys.sort
    assert_equal accepted.starts_at, Time.zone.parse(slots.first["starts_at"])
    assert_equal accepted.starts_at + 60.minutes, Time.zone.parse(slots.first["ends_at"])
  end

  test "pending, rejected and cancelled requests do not block anything" do
    submit(@rita_60, "ana@x.com", at(9))
    rejected = submit(@rita_60, "bia@x.com", at(11))
    rejected.reject!
    submit(@rita_60, "cris@x.com", at(13))
    submit(@rita_60, "cris@x.com", at(14)) # cancels the previous one

    get_slots(@rita)

    assert_equal [], response.parsed_body["busy_slots"]
  end

  test "does not list the accepted requests of other nutritionists" do
    submit(@joao_60, "ana@x.com", at(10)).accept!

    get_slots(@rita)

    assert_equal [], response.parsed_body["busy_slots"]
  end

  test "lists the accepted requests of all the services of the nutritionist, soonest first" do
    submit(@rita_60, "ana@x.com", at(15)).accept!
    submit(@rita_30, "bia@x.com", at(9)).accept!

    get_slots(@rita)

    starts = response.parsed_body["busy_slots"].map { |s| Time.zone.parse(s["starts_at"]) }
    assert_equal [ at(9), at(15) ], starts
  end

  test "only lists what overlaps the asked range" do
    submit(@rita_60, "ana@x.com", at(10)).accept!
    submit(@rita_60, "bia@x.com", at(10) + 5.days).accept!

    get_slots(@rita, from: @day, to: @day + 1.day)

    assert_equal 1, response.parsed_body["busy_slots"].size
  end

  test "includes a request that starts before the range and ends inside it" do
    submit(@rita_60, "ana@x.com", at(23, 30)).accept! # ends at 00:30 of the next day

    get_slots(@rita, from: @day + 1.day, to: @day + 2.days)

    assert_equal 1, response.parsed_body["busy_slots"].size
  end

  test "returns 400 when from or to is missing" do
    get nutritionist_busy_slots_url(@rita), params: { from: @day.iso8601 }

    assert_response :bad_request
  end

  test "returns 400 when the dates are not valid" do
    get nutritionist_busy_slots_url(@rita), params: { from: "tomorrow", to: "later" }

    assert_response :bad_request
    assert_match(/ISO 8601/, response.parsed_body["error"])
  end

  test "returns 400 when to is not after from" do
    get_slots(@rita, from: @day + 1.day, to: @day)

    assert_response :bad_request
  end

  test "returns 400 when the range is too long" do
    get_slots(@rita, from: @day, to: @day + 63.days)

    assert_response :bad_request
    assert_match(/62 days/, response.parsed_body["error"])
  end

  test "returns 404 for an unknown nutritionist" do
    get nutritionist_busy_slots_url(nutritionist_id: 0), params: { from: @day.iso8601, to: (@day + 1.day).iso8601 }

    assert_response :not_found
  end

  private

  def get_slots(nutritionist, from: @day - 1.day, to: @day + 31.days)
    get nutritionist_busy_slots_url(nutritionist), params: { from: from.iso8601, to: to.iso8601 }
  end

  def at(hour, minute = 0)
    @day.change(hour: hour, min: minute)
  end

  def submit(service, email, starts_at)
    AppointmentRequest.submit!(service: service, guest_name: "Guest", guest_email: email, starts_at: starts_at)
  end
end
