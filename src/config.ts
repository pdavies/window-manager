import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "..");

export interface IndoorSensorConfig {
  name: string;
  deviceId: string;
}

export interface AppConfig {
  indoorSensors: IndoorSensorConfig[];
  location: { latitude: number; longitude: number };
  /** Deadband in °C around the indoor average; stops the recommendation flapping. */
  hysteresisC: number;
  pollIntervalMinutes: number;
  httpPort: number;
  kaiterraApiKey: string;
  /** null when the Met Office key isn't set — that source is then skipped. */
  metOfficeApiKey: string | null;
}

function fail(message: string): never {
  throw new Error(message);
}

export function loadConfig(): AppConfig {
  const configPath = process.env.CONFIG_PATH ?? resolve(projectRoot, "config.json");

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(configPath, "utf8"));
  } catch (err) {
    fail(
      `Could not read config at ${configPath}. ` +
        `Copy config.example.json to config.json and fill it in.\n  (${(err as Error).message})`,
    );
  }

  const c = raw as Record<string, unknown>;

  const indoorSensors = c.indoorSensors;
  if (!Array.isArray(indoorSensors) || indoorSensors.length === 0) {
    fail("config.json: `indoorSensors` must be a non-empty array of { name, deviceId }.");
  }
  for (const s of indoorSensors) {
    if (typeof s?.name !== "string" || typeof s?.deviceId !== "string") {
      fail("config.json: every indoor sensor needs a string `name` and `deviceId`.");
    }
  }

  const location = c.location as { latitude?: unknown; longitude?: unknown } | undefined;
  if (typeof location?.latitude !== "number" || typeof location?.longitude !== "number") {
    fail("config.json: `location` must be { latitude: number, longitude: number }.");
  }

  const kaiterraApiKey = process.env.KAITERRA_API_KEY?.trim();
  if (!kaiterraApiKey) {
    fail("KAITERRA_API_KEY is not set. Copy .env.example to .env and add your key.");
  }

  const metOfficeApiKey = process.env.METOFFICE_API_KEY?.trim() || null;

  return {
    indoorSensors: indoorSensors as IndoorSensorConfig[],
    location: { latitude: location.latitude, longitude: location.longitude },
    hysteresisC: typeof c.hysteresisC === "number" ? c.hysteresisC : 0.5,
    pollIntervalMinutes: typeof c.pollIntervalMinutes === "number" ? c.pollIntervalMinutes : 5,
    httpPort: typeof c.httpPort === "number" ? c.httpPort : 3000,
    kaiterraApiKey,
    metOfficeApiKey,
  };
}
