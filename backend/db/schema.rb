# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_11_03_100000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "appointment_requests", force: :cascade do |t|
    t.string "guest_name", null: false
    t.string "guest_email", null: false
    t.datetime "starts_at", null: false
    t.datetime "ends_at", null: false
    t.string "status", default: "pending", null: false
    t.bigint "service_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["guest_email"], name: "index_appointment_requests_on_guest_email", unique: true, where: "((status)::text = 'pending'::text)"
    t.index ["service_id"], name: "index_appointment_requests_on_service_id"
    t.check_constraint "ends_at > starts_at", name: "appointment_starts_at_must_sooner_than_ends_at"
    t.check_constraint "status::text = ANY (ARRAY['pending'::character varying, 'accepted'::character varying, 'rejected'::character varying, 'cancelled'::character varying]::text[])", name: "appointment_requests_status_valid"
  end

  create_table "cities", force: :cascade do |t|
    t.string "name", null: false
    t.decimal "latitude", precision: 9, scale: 6, null: false
    t.decimal "longitude", precision: 9, scale: 6, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_cities_on_name", unique: true
  end

  create_table "nutritionists", force: :cascade do |t|
    t.string "name", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "license_number", null: false
    t.index ["license_number"], name: "index_nutritionists_on_license_number", unique: true
  end

  create_table "services", force: :cascade do |t|
    t.string "name", null: false
    t.integer "price_cents", null: false
    t.integer "duration_minutes", null: false
    t.bigint "city_id", null: false
    t.bigint "nutritionist_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["city_id"], name: "index_services_on_city_id"
    t.index ["nutritionist_id"], name: "index_services_on_nutritionist_id"
    t.check_constraint "duration_minutes > 0", name: "services_duration_minutes_bigger_than_zero"
    t.check_constraint "price_cents >= 0", name: "services_price_cents_non_negative"
  end

  add_foreign_key "appointment_requests", "services"
  add_foreign_key "services", "cities"
  add_foreign_key "services", "nutritionists"
end
