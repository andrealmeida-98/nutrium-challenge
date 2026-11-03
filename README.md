# Appointment requests

Guests (identified by email) request appointments with nutritionists, and nutritionists accept or reject them.

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

- **CORS:** the API only accepts the frontend origin `http://localhost:5173`.
- **API address:** the frontend calls `http://localhost:3000`.
- **Emails:** in development they are not sent. They are saved as files in `backend/tmp/mails/`.

## Known limitations

- **No** `expired` **status.** A pending request whose time has passed stays `pending`. Expiring it needs a scheduled (cron) job, which this project does not have.
- **Working hours are the same for everyone:** 09:00 to 18:00 in 30 minute steps, a constant in `frontend/src/lib/availability.ts` and not data per nutritionist. Only the calendar uses them, the API accepts any time that is not taken.

## Pages

| Page                                  | What it is                                                                                                                                                                        |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                   | Search nutritionists by name or service and location. "Schedule appointment" opens a form with a calendar: days and times already accepted for that nutritionist are crossed out. |
| `/professionals`                      | Lists the nutritionists, to open their pending requests (there is no login). Linked from "Are you a nutrition professional?" in the header.                                       |
| `/professionals/:id/pending-requests` | The nutritionist's pending requests, with Accept and Reject.                                                                                                                      |

## API

Responses are JSON. Errors look like `{ "error": "..." }`, and validation errors (422) add `"details"` per field.

| Endpoint | What it does |
|---|---|
| `GET /cities?q=` | Suggestions for the location field: cities that contain the text, ignoring accents. |
| `GET /nutritionists?q=&location=&page=&per_page=` | Search by nutritionist or service name and city, ordered by distance. |
| `POST /appointment_requests` | A guest asks for an appointment: `service_id`, `guest_name`, `guest_email`, `starts_at`. |
| `GET /nutritionists/:id/appointment_requests` | Pending requests of a nutritionist, soonest first. |
| `GET /nutritionists/:id/busy_slots?from=&to=` | Times already taken by accepted requests (start and end only, at most 62 days), used by the calendar. |
| `PATCH /appointment_requests/:id/accept` | Accepts it and rejects the overlapping pending requests of that nutritionist. |
| `PATCH /appointment_requests/:id/reject` | Rejects it. |

**Search:** `q` ignores case and accents. `location` must be a city in the `cities` table, otherwise Braga is used (`location.fallback` is `true` when a typed city was not found). The page only sends cities picked from the autocomplete, so that fallback is for addresses typed by hand. Distance is in a straight line, calculated in SQL.

## Languages

English and Portuguese, with a switch in the header. The first language is the browser's, and the choice is remembered. Texts are in `frontend/src/i18n/` (`en.ts` is the base, and `pt.ts` must have the same keys: TypeScript and a test check it). Dates, times, prices and distances follow the language too.

## Seed data

7 nutritionists and 12 services in Braga, Guimarães, Barcelos, Porto, Coimbra, Lisboa and Faro. Try searching for `desportiva`, `Diogo`, or the locations `Porto`, `Lisboa` or `covilha`. Any of the 188 cities in `backend/db/seeds/cities.csv` works as a location.

City coordinates come from [GeoNames](https://www.geonames.org/) (CC BY 4.0), except Seixal, Valença, Vizela, Lousada, Vila Verde, Amares, Pinhel and Trancoso, from [OpenStreetMap](https://www.openstreetmap.org/copyright) (© OpenStreetMap contributors, ODbL).

## Mockup elements that are not functional

- **"Follow-up" tag** on the result card: the challenge text does not describe it, and following a nutritionist would need user accounts, which are not required. It is only a visual element.
- **"Website" button** (called "Personal Page" in the challenge text): a non-functional placeholder, as the challenge allows.
- **Share and history buttons** on the pending requests panel: drawn as in the mockup, they do nothing.
- Nutritionists and guests have no photo, so the avatar is a coloured circle with their initials.
