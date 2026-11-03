class ApplicationController < ActionController::API
  # Every error has the same shape: { "error": "...", "details": { ... } }.
  # `details` only exists for validation errors (422).
  rescue_from ActiveRecord::RecordNotFound do
    render json: { error: "Not found" }, status: :not_found
  end

  rescue_from ActiveRecord::RecordInvalid do |e|
    render json: { error: "Validation failed", details: e.record.errors.to_hash }, status: :unprocessable_content
  end

  rescue_from ActionController::ParameterMissing do |e|
    render json: { error: "Parameter missing: #{e.param}" }, status: :bad_request
  end

  # Accepting or rejecting a request that was already answered.
  rescue_from AppointmentRequest::InvalidTransition do |e|
    render json: { error: e.message }, status: :conflict
  end
end
