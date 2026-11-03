# Appointment requests

Guests (identified by email) request appointments with nutritionists, and nutritionists accept or reject them.

**Status:** backend domain, business rules and emails are done and tested. API endpoints, seeds and the React frontend are still in progress.

## Stack

Rails 8.1 (API only) · PostgreSQL 16 · Ruby 3.3 · React + Vite + TypeScript (`frontend/`, to come)

## Setup

Requires Ruby 3.3.13 and a running local PostgreSQL.

```sh
cd backend
bundle install
bin/rails db:create db:migrate
```

## Tests

```sh
cd backend
bin/rails test
```

Covers the models and business rules, the mailers, and race conditions (threads against the real database in `appointment_request_concurrency_test.rb`).

## Known limitations

- **No `expired` status.** A pending request whose time has passed stays `pending`. Expiring it needs a scheduled (cron) job, which this project does not have.
- Email jobs run in memory (`AsyncAdapter`) and are lost if the server restarts. A real deployment would use a persistent queue.
- Times are in UTC. There is no nutritionist availability and no authentication, as the challenge assumes.

## Mockup elements that are not functional

- **"Follow-up" tag** on the search result card. The challenge text does not describe it, and following a nutritionist would need user accounts, which the challenge says are not required. It is drawn as a visual element only. There is no follow list.
- **"Website" button** (called "Personal Page" in the challenge text). The challenge allows it to be a non-functional placeholder, so it is drawn but does nothing.
