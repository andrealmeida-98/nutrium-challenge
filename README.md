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

## Business rules

All the logic lives in `backend/app/models/appointment_request.rb`.

| Rule | Where |
|---|---|
| 1. A guest has one pending request: a new one cancels the previous | `AppointmentRequest.submit!` |
| 2. Requests stay `pending` until answered | `status` enum |
| 3. Accepting rejects every overlapping pending request of the same nutritionist | `accept!` |
| 4. The guest gets an email when the request is accepted or rejected | `accept!` / `reject!` + `AppointmentRequestMailer` |

Also: a request cannot be in the past, and cannot overlap an already accepted one.

## Decisions

- **Data model:** `cities`, `nutritionists`, `services`, `appointment_requests`. There is no `guests` table, since a guest is only an email. `ends_at` is stored (`starts_at` + service duration) so overlap is a simple indexed range check and does not change if the service duration changes later. Prices are stored as integer cents.
- **Rule 1 is enforced twice:** in code, and by a partial unique index (`guest_email` where `status = 'pending'`).
- **Concurrency:** `submit!` takes a Postgres advisory lock on the email and then a row lock on the nutritionist, always in that order. `accept!` locks the overlapping rows with `FOR UPDATE`. Each of these races has a test.
- **Emails are sent after the commit.** They use `deliver_later` inside the transaction, and `config/initializers/mailers.rb` makes the job wait for the commit, so a rolled-back accept never sends an email. A test covers this.
- **No SMTP service.** Emails are checked in tests and are not delivered to a real inbox. Production would configure SMTP through environment variables.

## Known limitations

- **No `expired` status.** A pending request whose time has passed stays `pending`. Expiring it needs a scheduled (cron) job, which this project does not have.
- Email jobs run in memory (`AsyncAdapter`) and are lost if the server restarts. A real deployment would use a persistent queue.
- Times are in UTC. There is no nutritionist availability and no authentication, as the challenge assumes.
