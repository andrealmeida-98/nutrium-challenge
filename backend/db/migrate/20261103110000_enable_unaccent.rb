class EnableUnaccent < ActiveRecord::Migration[8.1]
  # Lets the search ignore accents: "covilha" finds "Covilhã".
  def change
    enable_extension "unaccent"
  end
end
