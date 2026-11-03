class AppointmentRequestMailer < ApplicationMailer
  def accepted(request)
    @request = request
    @service = request.service
    @nutritionist = @service.nutritionist

    mail to: request.guest_email, subject: "Your appointment request was accepted"
  end

  def rejected(request)
    @request = request
    @service = request.service
    @nutritionist = @service.nutritionist

    mail to: request.guest_email, subject: "Your appointment request was declined"
  end
end
