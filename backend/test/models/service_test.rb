require "test_helper"

class ServiceTest < ActiveSupport::TestCase
  setup do
    @attrs = {
      name: "Consulta", price_cents: 3000, duration_minutes: 45,
      city: cities(:braga), nutritionist: nutritionists(:rita)
    }
  end

  test "is valid with all fields" do
    assert Service.new(@attrs).valid?
  end

  test "requires a name" do
    assert_not Service.new(@attrs.merge(name: "")).valid?
  end

  test "price can be zero but not negative" do
    assert Service.new(@attrs.merge(price_cents: 0)).valid?
    assert_not Service.new(@attrs.merge(price_cents: -1)).valid?
  end

  test "price must be an integer" do
    assert_not Service.new(@attrs.merge(price_cents: 10.5)).valid?
  end

  test "duration must be greater than zero" do
    assert_not Service.new(@attrs.merge(duration_minutes: 0)).valid?
    assert_not Service.new(@attrs.merge(duration_minutes: -30)).valid?
  end

  test "requires a city and a nutritionist" do
    assert_not Service.new(@attrs.merge(city: nil)).valid?
    assert_not Service.new(@attrs.merge(nutritionist: nil)).valid?
  end
end
