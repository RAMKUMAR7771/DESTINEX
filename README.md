# DESTINEX

**Plan smart. Travel trusted. Support local.**

DESTINEX is a local-first MVP for the travel platform described in the solution deck. It runs on Python's standard library and SQLite, so there is no package install, cloud account, or API key needed to start the demo.

## Start it on Windows

1. Extract the project folder somewhere you can write to.
2. Double-click `LAUNCH.bat`.
3. DESTINEX opens in your browser at [http://127.0.0.1:8000](http://127.0.0.1:8000). Keep the black server window open while using it.

Python 3.10 or newer must be installed. To start it from a terminal, open this folder and run `py -3 app.py`, then visit `http://127.0.0.1:8000`.

The app creates `data/destinex.sqlite3` on first launch. It holds profiles, saved itineraries, expenses, bookings, guide decisions, reviews, and sign-in sessions locally. Keep a backup of that file if you want to preserve demo activity.

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Traveller | `traveler@destinex.demo` | `travel123!` |
| Local guide | `guide@destinex.demo` | `guide123!` |
| Guide with a pending profile | `sravani.guide@destinex.demo` | `guide123!` |
| Admin | `admin@destinex.demo` | `admin123!` |

The sign-in window also has one-click demo account buttons for the traveller, Ravi and admin. For the pending guide, type the email and password in the sign-in form. To walk through a booking: sign in as the traveller and request Ravi; use the account menu to switch to the guide and confirm the request; switch back to the traveller and record the demo payment; then switch to the guide to mark the trip complete. The traveller can then leave a verified-trip review. Admin can approve Sravani's profile; she can then receive bookings. No payment details are requested and no money moves.

## What works in this MVP

- Create traveller or local-guide accounts, sign in and sign out.
- Build a day-by-day itinerary for Visakhapatnam and Araku, Tirupati, Jaipur, Kochi, or Hampi using trip length, interests and budget.
- Save trip drafts and an expense ledger in SQLite; see the estimated categories, real expenses, and remaining budget.
- Discover verified guide profiles by destination and language; send and manage booking requests.
- Exercise the booking lifecycle: request, confirm, demo payment, complete, verified-trip review, decline, and cancellation.
- Submit a guide profile for admin review; approve or decline pending profiles.
- Use the built-in English, Telugu and Hindi phrasebook.
- Use the app on desktop and mobile-sized screens without remote images or third-party JavaScript.

## Scope and live-service connections

This is a complete runnable **MVP/demo**, not a production marketplace. Some parts of the deck depend on external services and legal or operational checks that cannot be honestly switched on without credentials and real integrations:

- **Itinerary engine:** currently uses curated destination data and a deterministic local planner. Connect an LLM and reviewed destination knowledge base for generative planning.
- **Payments:** the checkout records a clearly labelled demo payment in the local database. Connect a payment provider in sandbox first; handle webhooks, refunds, reconciliation, tax and PCI responsibilities before accepting money.
- **Guide verification:** admin approval reviews submitted profile details only. No identity, address, licence, police or background check is performed.
- **Maps and live prices:** destination activities and prices are planning examples, not live provider quotes. Connect a mapping/places provider and refresh local data before using for actual travel.
- **Translation:** the phrasebook is static sample language help. Connect a translation/speech provider for live text or voice translation.
- **Hosting and security:** this launcher binds to `127.0.0.1` for a single-computer demo. Before public deployment, add HTTPS, secure production secrets and cookies, rate limiting, CSRF protection, account recovery, monitoring, backups, access review and privacy/legal workflows.

Guide names, star ratings, review counts, and the pending Sravani profile are demo fixtures, not real people or verified providers. The displayed 15% marketplace commission is an example based on the deck's proposed unit economics.

## Configuration

Optional environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DESTINEX_HOST` | `127.0.0.1` | Bind address. Keep loopback for local use. |
| `DESTINEX_PORT` | `8000` | Web server port. |
| `DESTINEX_DB` | `data/destinex.sqlite3` | SQLite database file path. |
| `DESTINEX_OPEN_BROWSER` | `1` | Set to `0` to skip opening a browser at startup. |

## Project files

- `app.py` — web server, API, SQLite schema, seed data, local itinerary planner, sessions, and marketplace workflows.
- `web/index.html` — accessible page structure and user flows.
- `web/styles.css` — responsive styling and original CSS illustrations.
- `web/app.js` — browser interactions and API client.
- `LAUNCH.bat` — Windows double-click launcher.

The JSON API is served from the same origin under `/api/`; `GET /api/health` reports whether the local server is running.
