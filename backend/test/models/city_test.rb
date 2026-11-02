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
end
