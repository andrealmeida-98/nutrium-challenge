class City < ApplicationRecord
  DEFAULT_NAME = "Braga".freeze

  normalizes :name, with: ->(name) { name.strip }

  validates :name, presence: true, uniqueness: { case_sensitive: false }
  validates :latitude, numericality: { greater_than_or_equal_to: -90, less_than_or_equal_to: 90 }
  validates :longitude, numericality: { greater_than_or_equal_to: -180, less_than_or_equal_to: 180 }

  # Finds a city from free text, ignoring case and accents ("covilha" -> Covilhã).
  # Returns nil when the text is blank or no city matches.
  def self.resolve(text)
    return nil if text.blank?

    where("unaccent(name) ILIKE unaccent(?)", sanitize_sql_like(text.strip)).first
  end

  def self.default
    find_by!(name: DEFAULT_NAME)
  end
end
