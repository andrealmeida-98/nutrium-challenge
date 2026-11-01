class CreateAppointmentRequests < ActiveRecord::Migration[8.1]
  def change
    create_table :appointment_requests do |t|
      t.string :guest_name, null: false
      t.string :guest_email, null: false
      t.datetime :starts_at, null: false
      t.datetime :ends_at, null: false
      t.string :status, null: false, default: 'pending'
      t.references :service, null: false, foreign_key: true

      t.check_constraint "ends_at > starts_at", name:"appointment_starts_at_must_sooner_than_ends_at"
      t.check_constraint "status IN ('pending','accepted','rejected','cancelled')", name:"appointment_requests_status_valid"
      t.timestamps
    end
    add_index :appointment_requests, :guest_email, unique: true, where: "status = 'pending'"
  end
end
