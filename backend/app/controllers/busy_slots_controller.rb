# Time ranges of a nutritionist that are already taken, so the guest does not
# pick them. Only accepted requests block a time (pending ones do not: several
# guests can ask for the same time and the nutritionist chooses).
# Only the times are returned, nothing about who booked them.
class BusySlotsController < ApplicationController
  MAX_RANGE = 62.days

  class InvalidRange < StandardError; end

  rescue_from InvalidRange do |e|
    render json: { error: e.message }, status: :bad_request
  end

  # GET /nutritionists/:nutritionist_id/busy_slots?from=<ISO 8601>&to=<ISO 8601>
  def index
    nutritionist = Nutritionist.find(params[:nutritionist_id])
    from = parse_time(:from)
    to = parse_time(:to)
    raise InvalidRange, "to must be after from" unless to > from
    raise InvalidRange, "the range can be at most #{MAX_RANGE.in_days.to_i} days" if to - from > MAX_RANGE

    slots = AppointmentRequest.accepted
                              .for_nutritionist(nutritionist.id)
                              .overlapping(from, to)
                              .order(:starts_at)
                              .pluck(:starts_at, :ends_at)

    render json: { busy_slots: slots.map { |starts_at, ends_at| { starts_at: starts_at, ends_at: ends_at } } }
  end

  private

  def parse_time(key)
    Time.iso8601(params.require(key))
  rescue ArgumentError
    raise InvalidRange, "#{key} must be a date and time in ISO 8601 format"
  end
end
