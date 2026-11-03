# Appointment requests

Guests (identified by email) request appointments with nutritionists, and nutritionists accept or reject them.

**Status:** backend and frontend are done and tested.

**Stack:** Rails 8.1 (API only) · PostgreSQL 16 · Ruby 3.3 · React 19 + Vite + TypeScript + Tailwind CSS

## Setup and run

Requires Ruby 3.3.13, a running local PostgreSQL and Node 20+.

```sh
# Terminal 1: API on http://localhost:3000
cd backend
bundle install
bin/rails db:create db:migrate db:seed   # db:seed can be repeated, it does not duplicate
bin/rails server

# Terminal 2: app on http://localhost:5173
cd frontend
npm install
npm run dev
```

Tests: `bin/rails test` in `backend/` and `npm test` in `frontend/`.

- **CORS:** the API only accepts the frontend origin `http://localhost:5173`. To allow another one, set `CORS_ORIGINS` (comma-separated).
- **API address:** the frontend calls `http://localhost:3000`. To change it, set `VITE_API_URL` (see `frontend/.env.example`).
- **Emails:** in development they are not sent. They are saved as files in `backend/tmp/mails/`.

## Pages

| Page | What it is |
|---|---|
| `/` | Search nutritionists by name or service and location. "Schedule appointment" opens a form with a calendar: days and times already accepted for that nutritionist are crossed out. |
| `/nutritionists/:id/pending-requests` | The nutritionist's pending requests, with Accept and Reject. |
| `/professionals` | Lists the nutritionists, to open their pending requests (there is no login). Linked from "Are you a nutrition professional?" in the header. |

## API

Responses are JSON. Errors look like `{ "error": "..." }`, and validation errors (422) add `"details"` per field.

| Endpoint | What it does |
|---|---|
| `GET /nutritionists?q=&location=&page=&per_page=` | Search by nutritionist or service name and city, ordered by distance. |
| `POST /appointment_requests` | A guest asks for an appointment: `service_id`, `guest_name`, `guest_email`, `starts_at`. |
| `GET /nutritionists/:id/appointment_requests` | Pending requests of a nutritionist, soonest first. |
| `GET /nutritionists/:id/busy_slots?from=&to=` | Times already taken by accepted requests (start and end only, at most 62 days), used by the calendar. |
| `PATCH /appointment_requests/:id/accept` | Accepts it and rejects the overlapping pending requests of that nutritionist. |
| `PATCH /appointment_requests/:id/reject` | Rejects it. |

A request that was already answered returns `409`. A time that overlaps an accepted request returns `422`. Only accepted requests block a time: pending ones do not, because several guests can ask for the same time and the nutritionist chooses.

**Search:** `q` ignores case and accents. `location` must be a city in the `cities` table, otherwise Braga is used (`location.fallback` is `true` when a typed city was not found). Distance is in a straight line, calculated in SQL.

## Seed data

7 nutritionists and 12 services in Braga, Guimarães, Barcelos, Porto, Coimbra, Lisboa and Faro. Try searching for `desportiva`, `Diogo`, or the locations `Porto`, `Lisboa` or `covilha`. Any of the 188 cities in `backend/db/seeds/cities.csv` works as a location.

City coordinates come from [GeoNames](https://www.geonames.org/) (CC BY 4.0), except Seixal, Valença, Vizela, Lousada, Vila Verde, Amares, Pinhel and Trancoso, from [OpenStreetMap](https://www.openstreetmap.org/copyright) (© OpenStreetMap contributors, ODbL).

## Known limitations

- **No `expired` status.** A pending request whose time has passed stays `pending`. Expiring it needs a scheduled (cron) job, which this project does not have.
- Email jobs run in memory and are lost if the server restarts. A real deployment would use a persistent queue.
- **Working hours are the same for everyone:** 09:00 to 18:00 in 30 minute steps, a constant in `frontend/src/lib/availability.ts` and not data per nutritionist. Only the calendar uses them, the API accepts any time that is not taken.
- The pages show times in the browser's time zone, and emails show UTC. There is no availability per nutritionist and no authentication, as the challenge assumes: anyone who knows a nutritionist's id can see and answer her requests.

## Mockup elements that are not functional

- **"Follow-up" tag** on the result card: the challenge text does not describe it, and following a nutritionist would need user accounts, which are not required. It is only a visual element.
- **"Website" button** (called "Personal Page" in the challenge text): a non-functional placeholder, as the challenge allows.
- **Share and history buttons** on the pending requests panel: drawn as in the mockup, they do nothing.
- Nutritionists and guests have no photo, so the avatar is a coloured circle with their initials. The mockup shows a street address, which the data model does not have, so the card shows the city and the distance instead.
