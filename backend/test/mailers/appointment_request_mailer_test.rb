require "test_helper"

class AppointmentRequestMailerTest < ActionMailer::TestCase
  test "accepted" do
    request = AppointmentRequest.submit!(
      service: services(:rita_consulta),
      guest_name: "Ana",
      guest_email: "ana@example.com",
      starts_at: 30.days.from_now.utc.change(hour: 10, min: 0)
    )

    mail = AppointmentRequestMailer.accepted(request)

    assert_equal "Your appointment request was accepted", mail.subject
    assert_equal [ "ana@example.com" ], mail.to
    assert_match "Hi Ana", mail.body.encoded
    assert_match "Rita Silva", mail.body.encoded
    assert_match "Consulta de nutrição", mail.body.encoded
    assert_match "Braga", mail.body.encoded
    assert_match "10:00 to 11:00", mail.body.encoded
    assert_match "€40.00", mail.body.encoded
  end

  test "rejected" do
    request = AppointmentRequest.submit!(
      service: services(:rita_consulta),
      guest_name: "Ana",
      guest_email: "ana@example.com",
      starts_at: 30.days.from_now.utc.change(hour: 10, min: 0)
    )

    mail = AppointmentRequestMailer.rejected(request)

    assert_equal "Your appointment request was declined", mail.subject
    assert_equal [ "ana@example.com" ], mail.to
    assert_match "Hi Ana", mail.body.encoded
    assert_match "Rita Silva", mail.body.encoded
    assert_match "10:00 to 11:00", mail.body.encoded
  end
end
