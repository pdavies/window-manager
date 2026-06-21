# Window Manager 🪟

A small Node/TypeScript app that tells me when to close my windows in a heatwave to keep the hot air out, based on indoor vs. outdoor temperature. Not all of us have air con, you know.

Every 5 minutes it polls:

- **Indoor:** Kaiterra sensors
- **Outdoor:** [Open-Meteo](https://open-meteo.com) (keyless) and, optionally, the
  [Met Office Weather DataHub](https://datahub.metoffice.gov.uk) Site Specific forecast

…then averages each side, decides open/closed with a hysteresis deadband (so it doesn't
flap), and — when the recommendation **changes** — logs it and rings the terminal bell a
few times. A small dashboard is served via HTTP too.

## Setup

```bash
npm install
cp .env.example .env            # add KAITERRA_API_KEY (and METOFFICE_API_KEY if you have it)
cp config.example.json config.json   # add your device IDs and lat/long
npm start
```

## Configuration

`config.json`:

| Field | Meaning |
| --- | --- |
| `indoorSensors` | `[{ name, deviceId }]` — one entry per Kaiterra device |
| `location` | `{ latitude, longitude }` for the weather APIs |
| `hysteresisC` | Deadband in °C around indoor avg before the recommendation flips (default `0.5`) |
| `pollIntervalMinutes` | How often to poll (default `5`; keeps Met Office under its 360/day free cap) |
| `httpPort` | Dashboard port (default `3000`) |

Secrets live in `.env`: `KAITERRA_API_KEY` (required) and `METOFFICE_API_KEY` (optional —
the app runs on Open-Meteo alone without it).

## How the decision works

- `outdoor − indoor ≥ hysteresis` → **closed** (warmer outside; keep heat out)
- `outdoor − indoor ≤ −hysteresis` → **open** (cooler outside; let cool air in)
- otherwise → hold the current recommendation

The **Met Office** value is interpolated between min and max temps for the relevant 1h band, based on the current time and whether temps are going up or down.

## Adding a notifier

Notifications are pluggable. Implement the `Notifier` interface (`src/notify/index.ts`)
and add your instance to the list in `src/index.ts`.

## Run

- `npm start` — run with `tsx` (no build step)
- `npm run typecheck` — type-check only
- `npm run dev` — restart on file changes
