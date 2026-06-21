# Window Manager 🪟

A small Node/TypeScript app that tells you when to **open or close your windows** based
on indoor vs. outdoor temperature. The rule is the counterintuitive one for hot weather:
when it's hotter outside than in, keep windows **closed** to keep the heat out; open them
once it's cooler outside.

Every 5 minutes it polls:

- **Indoor:** your Kaiterra sensors (room temperature, `rtemp`)
- **Outdoor:** [Open-Meteo](https://open-meteo.com) (keyless) and, optionally, the
  [Met Office Weather DataHub](https://datahub.metoffice.gov.uk) Site Specific forecast

…then averages each side, decides open/closed with a hysteresis deadband (so it doesn't
flap), and — when the recommendation **changes** — logs it and rings the terminal bell a
few times. A small dashboard is served on your LAN.

## Setup

```bash
npm install
cp .env.example .env            # add KAITERRA_API_KEY (and METOFFICE_API_KEY if you have it)
cp config.example.json config.json   # add your device IDs and lat/long
npm start
```

Then open the dashboard URL printed on startup (e.g. `http://192.168.x.x:3000/`).

Both `.env` and `config.json` are gitignored.

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

The **Met Office** value is interpolated between the two hourly `screenTemperature`
forecast points bracketing "now", giving a current-temperature estimate that tracks the
fraction through the hour.

## Adding a notifier

Notifications are pluggable. Implement the `Notifier` interface (`src/notify/index.ts`)
and add your instance to the list in `src/index.ts`. A desktop banner, ntfy.sh push, or
Discord/Slack webhook are all a few lines each.

## Run

- `npm start` — run with `tsx` (no build step)
- `npm run typecheck` — type-check only
- `npm run dev` — restart on file changes
