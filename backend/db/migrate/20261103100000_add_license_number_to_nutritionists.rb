class AddLicenseNumberToNutritionists < ActiveRecord::Migration[8.1]
  def change
    add_column :nutritionists, :license_number, :string

    # Rows that already exist get a placeholder, so the NOT NULL below does not fail.
    # The seeds replace it with the real value.
    reversible do |dir|
      dir.up { execute "UPDATE nutritionists SET license_number = 'TMP' || id WHERE license_number IS NULL" }
    end

    change_column_null :nutritionists, :license_number, false
    add_index :nutritionists, :license_number, unique: true
  end
end
