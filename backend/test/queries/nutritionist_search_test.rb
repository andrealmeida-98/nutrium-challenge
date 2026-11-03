require "test_helper"

class NutritionistSearchTest < ActiveSupport::TestCase
  # Fixtures: Rita (2 services in Braga), João (1 service in Porto).
  setup do
    @faro = City.create!(name: "Faro", latitude: 37.0194, longitude: -7.9322)
    @ana = Nutritionist.create!(name: "Ana Água", license_number: "9001N")
    @ana_sports = @ana.services.create!(name: "Nutrição desportiva", price_cents: 5000, duration_minutes: 60, city: @faro)
    @ana_general = @ana.services.create!(name: "Consulta geral", price_cents: 3000, duration_minutes: 30, city: @faro)
  end

  test "orders by distance to the chosen location, nearest first" do
    result = search(location: "Braga")

    assert_equal [ "Rita Silva", "João Costa", "Ana Água" ], result.nutritionists.map(&:name)
    assert_equal result.nutritionists.map(&:distance_km).sort, result.nutritionists.map(&:distance_km)
  end

  test "changing the location changes the order" do
    assert_equal "Ana Água", search(location: "Faro").nutritionists.first.name
  end

  test "computes the distance in kilometres" do
    porto = search(location: "Braga").nutritionists.find { |n| n.name == "João Costa" }

    assert_in_delta 47, porto.distance_km, 3 # Braga - Porto is about 47 km in a straight line
  end

  test "uses Braga when the location is blank" do
    result = search(location: "")

    assert_equal "Braga", result.location.city.name
    assert_not result.location.fallback
  end

  test "uses Braga and flags the fallback when the location is unknown" do
    result = search(location: "Xpto")

    assert_equal "Braga", result.location.city.name
    assert_equal "Xpto", result.location.requested
    assert result.location.fallback
  end

  test "location ignores case and accents" do
    City.create!(name: "Covilhã", latitude: 40.28, longitude: -7.5)

    assert_equal "Covilhã", search(location: " covilha ").location.city.name
    assert_equal "Covilhã", search(location: "COVILHÃ").location.city.name
  end

  test "q matches the nutritionist name without accents or case" do
    assert_equal [ "Ana Água" ], search(q: "agua").nutritionists.map(&:name)
  end

  test "q matching the nutritionist name lists all her services" do
    result = search(q: "ana")

    assert_equal [ @ana_general.id, @ana_sports.id ].sort, services_of(result, @ana).sort
  end

  test "q matching only a service lists just the services that match" do
    result = search(q: "desportiva")

    assert_equal [ @ana.id ], result.nutritionists.map(&:id)
    assert_equal [ @ana_sports.id ], services_of(result, @ana)
  end

  test "q with SQL wildcards is treated as plain text" do
    assert_empty search(q: "%").nutritionists
    assert_equal 0, search(q: "_").total_count
  end

  test "paginates in the database and reports the totals" do
    first = search(per_page: 2, page: 1)
    second = search(per_page: 2, page: 2)

    assert_equal 3, first.total_count
    assert_equal 2, first.total_pages
    assert_equal 2, first.nutritionists.size
    assert_equal 1, second.nutritionists.size
    assert_empty first.nutritionists.map(&:id) & second.nutritionists.map(&:id)
  end

  test "page and per_page are kept within sane limits" do
    result = search(page: -3, per_page: 1000)

    assert_equal 1, result.page
    assert_equal NutritionistSearch::MAX_PER_PAGE, result.per_page
    assert_equal NutritionistSearch::DEFAULT_PER_PAGE, search.per_page
  end

  test "the nutritionist distance is her nearest service" do
    far = City.create!(name: "Lisboa", latitude: 38.72, longitude: -9.14)
    rita = nutritionists(:rita)
    rita.services.create!(name: "Online", price_cents: 1000, duration_minutes: 30, city: far)

    result = search(location: "Braga")
    rita_result = result.nutritionists.find { |n| n.id == rita.id }

    assert_in_delta 0, rita_result.distance_km, 1
    assert_equal rita_result.distance_km.round, result.services_by_nutritionist[rita.id].first.distance_km.round
    assert_operator result.services_by_nutritionist[rita.id].last.distance_km, :>, 300
  end

  test "a nutritionist without services is not listed" do
    Nutritionist.create!(name: "Sem Serviços", license_number: "9002N")

    assert_equal 3, search.total_count
  end

  private

  def search(**params)
    NutritionistSearch.new(**params).call
  end

  def services_of(result, nutritionist)
    result.services_by_nutritionist[nutritionist.id].map(&:id)
  end
end
