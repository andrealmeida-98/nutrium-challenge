class CitiesController < ApplicationController
  DEFAULT_LIMIT = 8
  MAX_LIMIT = 20

  # GET /cities?q=por&limit=8
  # Suggestions for the location field of the search: only these cities can be searched.
  def index
    limit = params[:limit].present? ? params[:limit].to_i.clamp(1, MAX_LIMIT) : DEFAULT_LIMIT

    cities = City.suggest(params[:q], limit: limit)

    render json: { cities: cities.map { |city| { id: city.id, name: city.name } } }
  end
end
