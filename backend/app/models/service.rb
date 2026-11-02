class Service < ApplicationRecord
  belongs_to :city
  belongs_to :nutritionist
  has_many :appointment_requests
  validates :name, presence:true
  validates :price_cents, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :duration_minutes, numericality: { only_integer: true, greater_than: 0 }
end
