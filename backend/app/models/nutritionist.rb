class Nutritionist < ApplicationRecord
  has_many :services
  has_many :appointment_requests, through: :services

  normalizes :name, with: ->(name) { name.strip }
  # Professional licence number (cédula), e.g. "2963N". A string because it can contain letters.
  normalizes :license_number, with: ->(number) { number.strip.upcase }

  validates :name, presence: true
  validates :license_number, presence: true, uniqueness: true
end
