class AppointmentRequestsController < ApplicationController
  # GET /nutritionists/:nutritionist_id/appointment_requests
  # Pending requests of a nutritionist, soonest first. There is no login, so the
  # nutritionist is identified by the URL.
  def index
    nutritionist = Nutritionist.find(params[:nutritionist_id])
    requests = AppointmentRequest.pending
                                 .for_nutritionist(nutritionist.id)
                                 .includes(service: [ :city, :nutritionist ])
                                 .order(:starts_at, :id)

    render json: {
      nutritionist: { id: nutritionist.id, name: nutritionist.name },
      appointment_requests: requests.map { |r| AppointmentRequestSerializer.call(r) }
    }
  end

  # POST /appointment_requests  { service_id, guest_name, guest_email, starts_at }
  # Rules 1 (one pending request per guest) and the overlap check live in the model.
  def create
    service = Service.includes(:city, :nutritionist).find(params.require(:service_id))

    appointment = AppointmentRequest.submit!(
      service: service,
      guest_name: params[:guest_name],
      guest_email: params[:guest_email],
      starts_at: params[:starts_at]
    )

    render json: AppointmentRequestSerializer.call(appointment), status: :created
  end

  # PATCH /appointment_requests/:id/accept
  # Rejects the overlapping pending requests of the same nutritionist (rule 3)
  # and emails the guests (rule 4). All of it is done by the model.
  def accept
    respond_with_answer(&:accept!)
  end

  # PATCH /appointment_requests/:id/reject
  def reject
    respond_with_answer(&:reject!)
  end

  private

  def respond_with_answer
    appointment = AppointmentRequest.includes(service: [ :city, :nutritionist ]).find(params[:id])
    yield appointment

    render json: AppointmentRequestSerializer.call(appointment.reload)
  end
end
