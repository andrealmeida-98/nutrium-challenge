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

  # Suggestions for an autocomplete: cities that contain the text (ignoring case and
  # accents). The exact match comes first, then the ones that start with it. Nothing for blank text.
  def self.suggest(text, limit: 8)
    return none if text.blank?

    like = sanitize_sql_like(text.strip)
    relevance = sanitize_sql_array([
      "CASE WHEN unaccent(name) ILIKE unaccent(?) THEN 0 WHEN unaccent(name) ILIKE unaccent(?) THEN 1 ELSE 2 END",
      like, "#{like}%"
    ])

    where("unaccent(name) ILIKE unaccent(?)", "%#{like}%").order(Arel.sql(relevance), :name).limit(limit)
  end

  def self.default
    find_by!(name: DEFAULT_NAME)
  end
end
