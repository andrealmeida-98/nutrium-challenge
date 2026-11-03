require "test_helper"

class CitiesControllerTest < ActionDispatch::IntegrationTest
  setup do
    # The fixtures already have Braga and Porto.
    [ "Portalegre", "Portimão", "Vila do Porto", "Lisboa", "Covilhã" ].each_with_index do |name, i|
      City.create!(name: name, latitude: 38 + i * 0.1, longitude: -8)
    end
  end

  test "suggests the cities that contain the text, the ones that start with it first" do
    get cities_url, params: { q: "porto" }

    assert_response :success
    assert_equal [ "Porto", "Vila do Porto" ], names
  end

  test "ignores case and accents" do
    get cities_url, params: { q: "covilha" }
    assert_equal [ "Covilhã" ], names

    get cities_url, params: { q: "PORTIMAO" }
    assert_equal [ "Portimão" ], names
  end

  test "puts the exact match before the cities that only start with the text" do
    get cities_url, params: { q: "porto" }

    assert_equal "Porto", names.first # "Portalegre" and "Portimão" do not match, but "Vila do Porto" does
    City.create!(name: "Portobello", latitude: 40, longitude: -8)

    get cities_url, params: { q: "porto" }
    assert_equal [ "Porto", "Portobello", "Vila do Porto" ], names
  end

  test "orders the cities that start with the text alphabetically" do
    get cities_url, params: { q: "port" }

    assert_equal [ "Portalegre", "Portimão", "Porto", "Vila do Porto" ], names
  end

  test "returns the id and the name" do
    get cities_url, params: { q: "lisboa" }

    city = response.parsed_body["cities"].first
    assert_equal %w[id name], city.keys.sort
    assert_equal City.find_by!(name: "Lisboa").id, city["id"]
  end

  test "returns nothing for a blank or missing text" do
    get cities_url
    assert_equal [], names

    get cities_url, params: { q: "   " }
    assert_equal [], names
  end

  test "returns nothing when no city matches" do
    get cities_url, params: { q: "xpto" }

    assert_response :success
    assert_equal [], names
  end

  test "treats % and _ as plain text" do
    get cities_url, params: { q: "%" }
    assert_equal [], names

    get cities_url, params: { q: "Port_" }
    assert_equal [], names
  end

  test "limits the number of suggestions" do
    get cities_url, params: { q: "o", limit: 2 }
    assert_equal 2, names.size

    get cities_url, params: { q: "o", limit: 1000 }
    assert_operator names.size, :<=, CitiesController::MAX_LIMIT
  end

  private

  def names
    response.parsed_body["cities"].map { |c| c["name"] }
  end
end
