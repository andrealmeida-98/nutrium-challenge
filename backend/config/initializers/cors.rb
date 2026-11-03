# The React app (Vite) runs on another port, so the browser only lets it call this
# API if the API says so with CORS headers.
#
# Allowed origins: the Vite dev server by default. In another environment, set
# CORS_ORIGINS to a comma-separated list, e.g. "https://app.example.com".
#
# Read more: https://github.com/cyu/rack-cors
allowed_origins = ENV.fetch("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",").map(&:strip)

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(*allowed_origins)

    resource "*",
      headers: :any,
      methods: [ :get, :post, :patch, :options, :head ]
  end
end
