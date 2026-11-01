class CreateServices < ActiveRecord::Migration[8.1]
  def change
    create_table :services do |t|
      t.string :name, null: false
      t.integer :price_cents, null: false
      t.integer :duration_minutes, null: false
      t.references :city, null: false, foreign_key: true
      t.references :nutritionist, null: false, foreign_key: true

      t.check_constraint "price_cents >= 0", name: "services_price_cents_non_negative"
      t.check_constraint "duration_minutes > 0", name: "services_duration_minutes_bigger_than_zero"

      t.timestamps
    end
  end
end
