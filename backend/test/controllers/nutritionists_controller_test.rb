require "test_helper"

class NutritionistsControllerTest < ActionDispatch::IntegrationTest
  test "index returns the nutritionists with services, distance and paging info" do
    get nutritionists_url, params: { location: "Braga" }

    assert_response :success
    body = response.parsed_body

    assert_equal({ "requested" => "Braga", "resolved" => "Braga", "fallback" => false }, body["location"])
    assert_equal({ "page" => 1, "per_page" => 10, "total_count" => 2, "total_pages" => 1 }, body["meta"])

    rita = body["nutritionists"].first
    assert_equal "Rita Silva", rita["name"]
    assert_equal "1001N", rita["license_number"]
    assert_equal 0.0, rita["distance_km"]
    assert_equal 2, rita["services"].size
    assert_equal %w[id name price_cents duration_minutes city distance_km], rita["services"].first.keys
  end

  test "index orders by distance and the order follows the location" do
    get nutritionists_url, params: { location: "Porto" }

    assert_equal [ "João Costa", "Rita Silva" ], response.parsed_body["nutritionists"].map { |n| n["name"] }
  end

  test "index flags the fallback when the location is unknown" do
    get nutritionists_url, params: { location: "Xpto" }

    assert_response :success
    assert_equal({ "requested" => "Xpto", "resolved" => "Braga", "fallback" => true }, response.parsed_body["location"])
  end

  test "index works with no params at all" do
    get nutritionists_url

    assert_response :success
    assert_equal "Braga", response.parsed_body.dig("location", "resolved")
    assert_equal false, response.parsed_body.dig("location", "fallback")
  end

  test "index filters by q and only lists the matching services" do
    get nutritionists_url, params: { q: "acompanhamento" }

    nutritionists = response.parsed_body["nutritionists"]
    assert_equal [ "Rita Silva" ], nutritionists.map { |n| n["name"] }
    assert_equal [ "Consulta de acompanhamento" ], nutritionists.first["services"].map { |s| s["name"] }
  end

  test "index returns an empty list when nothing matches" do
    get nutritionists_url, params: { q: "zzz" }

    assert_response :success
    assert_equal [], response.parsed_body["nutritionists"]
    assert_equal 0, response.parsed_body.dig("meta", "total_count")
  end

  test "index paginates" do
    get nutritionists_url, params: { per_page: 1, page: 2 }

    body = response.parsed_body
    assert_equal [ "João Costa" ], body["nutritionists"].map { |n| n["name"] }
    assert_equal({ "page" => 2, "per_page" => 1, "total_count" => 2, "total_pages" => 2 }, body["meta"])
  end
end
