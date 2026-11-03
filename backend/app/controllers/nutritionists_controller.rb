class NutritionistsController < ApplicationController
  # GET /nutritionists?q=&location=&page=&per_page=
  def index
    result = NutritionistSearch.new(
      q: params[:q], location: params[:location], page: params[:page], per_page: params[:per_page]
    ).call

    render json: {
      location: {
        requested: result.location.requested,
        resolved: result.location.city.name,
        fallback: result.location.fallback
      },
      meta: {
        page: result.page,
        per_page: result.per_page,
        total_count: result.total_count,
        total_pages: result.total_pages
      },
      nutritionists: result.nutritionists.map { |n| nutritionist_json(n, result.services_by_nutritionist[n.id]) }
    }
  end

  private

  def nutritionist_json(nutritionist, services)
    {
      id: nutritionist.id,
      name: nutritionist.name,
      license_number: nutritionist.license_number,
      distance_km: nutritionist.distance_km.round(1),
      services: services.map { |s| service_json(s) }
    }
  end

  def service_json(service)
    {
      id: service.id,
      name: service.name,
      price_cents: service.price_cents,
      duration_minutes: service.duration_minutes,
      city: service.city_name,
      distance_km: service.distance_km.round(1)
    }
  end
end
