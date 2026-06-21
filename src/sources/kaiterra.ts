import type { IndoorSensorConfig } from "../config.js";
import type { TempReading } from "../types.js";
import { getJson } from "./http.js";

/**
 * Kaiterra "latest reading" response shape (the bits we use).
 * https://dev.kaiterra.com/#header-sensor-reading-data-format
 */
interface KaiterraTopResponse {
  data?: Array<{
    param: string; // e.g. "rtemp" for room temperature
    units?: string;
    points?: Array<{ ts: string; value: number }>;
  }>;
}

/** Read the latest room temperature (`rtemp`, in °C) from one Kaiterra device. */
export async function fetchIndoor(
  sensor: IndoorSensorConfig,
  apiKey: string,
): Promise<TempReading> {
  const url = `https://api.kaiterra.com/v1/devices/${encodeURIComponent(sensor.deviceId)}/top?key=${encodeURIComponent(apiKey)}`;
  try {
    const body = await getJson<KaiterraTopResponse>(url);
    const temp = body.data?.find((d) => d.param === "rtemp");
    const latest = temp?.points?.at(-1);
    if (!temp || !latest || typeof latest.value !== "number") {
      throw new Error("no `rtemp` reading in response");
    }
    return { source: sensor.name, tempC: latest.value, at: latest.ts ?? null, ok: true };
  } catch (err) {
    return {
      source: sensor.name,
      tempC: null,
      at: null,
      ok: false,
      error: (err as Error).message,
    };
  }
}
