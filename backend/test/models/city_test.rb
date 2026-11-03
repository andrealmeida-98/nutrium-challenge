require "test_helper"

class CityTest < ActiveSupport::TestCase
  test "is valid with name and coordinates" do
    assert City.new(name: "Lisboa", latitude: 38.72, longitude: -9.14).valid?
  end

  test "requires a name" do
    city = City.new(name: "", latitude: 1, longitude: 1)

    assert_not city.valid?
    assert city.errors[:name].any?
  end

  test "name is unique ignoring case" do
    city = City.new(name: "braga", latitude: 1, longitude: 1)

    assert_not city.valid?
    assert city.errors[:name].any?
  end

  test "strips spaces around the name" do
    assert_equal "Lisboa", City.new(name: "  Lisboa ").name
  end

  test "latitude must be between -90 and 90" do
    assert_not City.new(name: "X", latitude: 91, longitude: 0).valid?
    assert_not City.new(name: "X", latitude: -91, longitude: 0).valid?
  end

  test "longitude must be between -180 and 180" do
    assert_not City.new(name: "X", latitude: 0, longitude: 181).valid?
    assert_not City.new(name: "X", latitude: 0, longitude: -181).valid?
  end

  test "requires coordinates" do
    assert_not City.new(name: "X", latitude: nil, longitude: nil).valid?
  end

  test "resolve finds a city ignoring case, accents and surrounding spaces" do
    covilha = City.create!(name: "Covilhã", latitude: 40.28, longitude: -7.5)

    assert_equal covilha, City.resolve("covilha")
    assert_equal covilha, City.resolve("  COVILHÃ ")
  end

  test "resolve returns nil for blank or unknown text" do
    assert_nil City.resolve(nil)
    assert_nil City.resolve("  ")
    assert_nil City.resolve("Xpto")
  end

  test "resolve does not treat % or _ as wildcards" do
    assert_nil City.resolve("Br%")
    assert_nil City.resolve("Bra_a")
  end

  test "default is Braga" do
    assert_equal cities(:braga), City.default
  end

  test "suggest returns cities containing the text, starting-with first, ignoring accents" do
    City.create!(name: "Covilhã", latitude: 40.28, longitude: -7.5)
    City.create!(name: "Vila Covilha Nova", latitude: 40.0, longitude: -7.0)

    assert_equal [ "Covilhã", "Vila Covilha Nova" ], City.suggest("covilha").map(&:name)
  end

  test "suggest is empty for blank text" do
    assert_empty City.suggest(nil)
    assert_empty City.suggest("  ")
  end

  test "suggest respects the limit" do
    assert_equal 1, City.suggest("o", limit: 1).size
  end
end
