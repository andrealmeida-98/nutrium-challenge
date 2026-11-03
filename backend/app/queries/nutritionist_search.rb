# Searches nutritionists for the guest search page.
#
# - `q` matches the nutritionist's name or the name of one of her services
#   (ignoring case and accents). If it matches the nutritionist's name, all her
#   services are listed; if it only matches a service, only that service is.
# - `location` is a city name. When it is blank or unknown we use Braga.
# - Results are ordered by distance, nearest first. The distance of a
#   nutritionist is the distance of her nearest service. The calculation,
#   ordering and pagination all happen in SQL.
class NutritionistSearch
  DEFAULT_PER_PAGE = 10
  MAX_PER_PAGE = 50
  EARTH_RADIUS_KM = 6371.0

  Result = Struct.new(:location, :page, :per_page, :total_count, :nutritionists, :services_by_nutritionist,
                      keyword_init: true) do
    def total_pages
      (total_count.to_f / per_page).ceil
    end
  end

  # What the user asked for and what we used instead (see `fallback`).
  Location = Struct.new(:requested, :city, :fallback, keyword_init: true)

  def initialize(q: nil, location: nil, page: nil, per_page: nil)
    @q = q.to_s.strip
    @requested_location = location.to_s.strip
    @page = [ page.to_i, 1 ].max
    @per_page = per_page.to_i.clamp(1, MAX_PER_PAGE) if per_page.present?
    @per_page ||= DEFAULT_PER_PAGE
  end

  def call
    city = City.resolve(@requested_location)
    # Only a city the user typed and we do not know counts as a fallback.
    # An empty field just means "use the default", and there is nothing to warn about.
    fallback = city.nil? && @requested_location.present?
    city ||= City.default

    distance = distance_sql(city)
    matching = Nutritionist.joins(services: :city).where(match_condition)

    nutritionists = matching
      .group("nutritionists.id")
      .select("nutritionists.*, MIN(#{distance}) AS distance_km")
      .order(Arel.sql("distance_km ASC, nutritionists.name ASC, nutritionists.id ASC"))
      .limit(@per_page)
      .offset((@page - 1) * @per_page)
      .to_a

    Result.new(
      location: Location.new(requested: @requested_location.presence, city: city, fallback: fallback),
      page: @page,
      per_page: @per_page,
      total_count: matching.distinct.count(:id),
      nutritionists: nutritionists,
      services_by_nutritionist: services_for(nutritionists, distance)
    )
  end

  private

  # Services shown in each card, nearest first. Uses the same filter as the
  # main query, so a search for "sports" does not list the other services.
  def services_for(nutritionists, distance)
    Service.joins(:nutritionist, :city)
           .where(nutritionist_id: nutritionists.map(&:id))
           .where(match_condition)
           .select("services.*, cities.name AS city_name, #{distance} AS distance_km")
           .order(Arel.sql("distance_km ASC, services.name ASC, services.id ASC"))
           .group_by(&:nutritionist_id)
  end

  # A service is listed when `q` matches its nutritionist's name or its own name.
  def match_condition
    return nil if @q.blank?

    pattern = "%#{ActiveRecord::Base.sanitize_sql_like(@q)}%"
    [ "unaccent(nutritionists.name) ILIKE unaccent(:pattern) OR unaccent(services.name) ILIKE unaccent(:pattern)",
      { pattern: pattern } ]
  end

  # Haversine formula: distance in km between the city and `cities` in the query.
  # LEAST(1, ...) avoids a rounding error making asin() fail on identical points.
  def distance_sql(city)
    lat = city.latitude.to_f
    lng = city.longitude.to_f

    <<~SQL.squish
      (2 * #{EARTH_RADIUS_KM} * asin(LEAST(1, sqrt(
        power(sin(radians(cities.latitude::float8 - #{lat}) / 2), 2) +
        cos(radians(#{lat})) * cos(radians(cities.latitude::float8)) *
        power(sin(radians(cities.longitude::float8 - #{lng}) / 2), 2)
      ))))
    SQL
  end
end
