class Nutritionist < ApplicationRecord
  has_many :services
  has_many :appointment_requests, through: :services

  normalizes :name, with: ->(name) { name.strip }

  validates :name, presence: true
end
