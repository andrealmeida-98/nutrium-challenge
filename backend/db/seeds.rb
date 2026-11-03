# Seeds are idempotent: running `bin/rails db:seed` more than once does not create duplicates.

require "csv"

# Cities: name + coordinates. Source and licences are in the README.
CSV.foreach(Rails.root.join("db/seeds/cities.csv"), headers: true) do |row|
  city = City.find_or_initialize_by(name: row["name"])
  city.update!(latitude: row["latitude"], longitude: row["longitude"])
end

# Nutritionists and their services. Prices are in cents.
# Cities are spread out from Braga (the default search location) so that
# ordering by distance is visible: Braga 0 km, Guimarães/Barcelos ~20 km,
# Porto ~50 km, Coimbra ~180 km, Lisboa ~300 km, Faro ~480 km.
NUTRITIONISTS = [
  { name: "Ana Ribeiro", services: [
    { name: "Consulta de nutrição geral", price_cents: 4000, duration_minutes: 45, city: "Braga" },
    { name: "Plano alimentar personalizado", price_cents: 6000, duration_minutes: 60, city: "Braga" }
  ] },
  { name: "Bruno Carvalho", services: [
    { name: "Nutrição desportiva", price_cents: 5500, duration_minutes: 60, city: "Guimarães" },
    { name: "Consulta de seguimento", price_cents: 3000, duration_minutes: 30, city: "Guimarães" }
  ] },
  { name: "Carla Mendes", services: [
    { name: "Nutrição pediátrica", price_cents: 5000, duration_minutes: 45, city: "Barcelos" }
  ] },
  { name: "Diogo Fernandes", services: [
    { name: "Consulta de nutrição geral", price_cents: 4500, duration_minutes: 45, city: "Porto" },
    { name: "Nutrição clínica e obesidade", price_cents: 7000, duration_minutes: 60, city: "Porto" },
    { name: "Consulta de seguimento", price_cents: 3500, duration_minutes: 30, city: "Porto" }
  ] },
  { name: "Eva Lopes", services: [
    { name: "Nutrição vegetariana e vegan", price_cents: 5000, duration_minutes: 60, city: "Coimbra" }
  ] },
  { name: "Filipe Santos", services: [
    { name: "Nutrição desportiva", price_cents: 6500, duration_minutes: 60, city: "Lisboa" },
    { name: "Consulta de nutrição geral", price_cents: 5500, duration_minutes: 45, city: "Lisboa" }
  ] },
  { name: "Inês Pereira", services: [
    { name: "Consulta de nutrição geral", price_cents: 3800, duration_minutes: 45, city: "Faro" }
  ] }
].freeze

NUTRITIONISTS.each do |data|
  nutritionist = Nutritionist.find_or_create_by!(name: data[:name])

  data[:services].each do |service|
    # City.find_by! raises if the name has a typo, instead of silently skipping.
    city = City.find_by!(name: service[:city])
    record = nutritionist.services.find_or_initialize_by(name: service[:name], city: city)
    record.update!(price_cents: service[:price_cents], duration_minutes: service[:duration_minutes])
  end
end
