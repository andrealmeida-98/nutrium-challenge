# JSON shape of an appointment request, shared by every endpoint that returns one.
# Callers should preload `service: [ :city, :nutritionist ]` when serializing a list.
class AppointmentRequestSerializer
  def self.call(request)
    service = request.service

    {
      id: request.id,
      status: request.status,
      guest_name: request.guest_name,
      guest_email: request.guest_email,
      starts_at: request.starts_at,
      ends_at: request.ends_at,
      service: {
        id: service.id,
        name: service.name,
        price_cents: service.price_cents,
        duration_minutes: service.duration_minutes,
        city: service.city.name
      },
      nutritionist: { id: service.nutritionist.id, name: service.nutritionist.name }
    }
  end
end
