class CreateCities < ActiveRecord::Migration[8.1]
  def change
    create_table :cities do |t|
      t.string :name, null: false
      t.decimal :latitude, precision: 9, scale: 6, null: false
      t.decimal :longitude, precision: 9, scale: 6, null: false

      t.timestamps
    end
    add_index :cities, :name, unique: true
  end
end
