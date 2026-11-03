# Appointment requests

Guests (identified by email) request appointments with nutritionists, and nutritionists accept or reject them.

**Status:** the backend is done and tested. The React frontend (`frontend/`) is still to come.

**Stack:** Rails 8.1 (API only) · PostgreSQL 16 · Ruby 3.3 · React + Vite + TypeScript

## Setup and run

Requires Ruby 3.3.13 and a running local PostgreSQL.

```sh
cd backend
bundle install
bin/rails db:create db:migrate db:seed   # db:seed can be repeated, it does not duplicate
bin/rails server                         # API on http://localhost:3000
bin/rails test
```

- **CORS:** the API only accepts the frontend origin `http://localhost:5173`. To allow another one, set `CORS_ORIGINS` (comma-separated).
- **Emails:** in development they are not sent. They are saved as files in `backend/tmp/mails/`.

## API

Responses are JSON. Errors look like `{ "error": "..." }`, and validation errors (422) add `"details"` per field.

| Endpoint | What it does |
|---|---|
| `GET /nutritionists?q=&location=&page=&per_page=` | Search by nutritionist or service name and city, ordered by distance. |
| `POST /appointment_requests` | A guest asks for an appointment: `service_id`, `guest_name`, `guest_email`, `starts_at`. |
| `GET /nutritionists/:id/appointment_requests` | Pending requests of a nutritionist, soonest first. |
| `PATCH /appointment_requests/:id/accept` | Accepts it and rejects the overlapping pending requests of that nutritionist. |
| `PATCH /appointment_requests/:id/reject` | Rejects it. |

A request that was already answered returns `409`. A time that overlaps an accepted request returns `422`.

**Search:** `q` ignores case and accents. `location` must be a city in the `cities` table, otherwise Braga is used (`location.fallback` is `true` when a typed city was not found). Distance is in a straight line, calculated in SQL.

## Seed data

7 nutritionists and 12 services in Braga, Guimarães, Barcelos, Porto, Coimbra, Lisboa and Faro. Try searching for `desportiva`, `Diogo`, or the locations `Porto`, `Lisboa` or `covilha`. Any of the 188 cities in `backend/db/seeds/cities.csv` works as a location.

City coordinates come from [GeoNames](https://www.geonames.org/) (CC BY 4.0), except Seixal, Valença, Vizela, Lousada, Vila Verde, Amares, Pinhel and Trancoso, from [OpenStreetMap](https://www.openstreetmap.org/copyright) (© OpenStreetMap contributors, ODbL).

## Known limitations

- **No `expired` status.** A pending request whose time has passed stays `pending`. Expiring it needs a scheduled (cron) job, which this project does not have.
- Email jobs run in memory and are lost if the server restarts. A real deployment would use a persistent queue.
- Times are in UTC. There is no nutritionist availability and no authentication, as the challenge assumes: anyone who knows a nutritionist's id can see and answer her requests.

## Mockup elements that are not functional

- **"Follow-up" tag** on the result card: the challenge text does not describe it, and following a nutritionist would need user accounts, which are not required. It is only a visual element.
- **"Website" button** (called "Personal Page" in the challenge text): a non-functional placeholder, as the challenge allows.
