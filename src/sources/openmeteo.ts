import type { TempReading } from "../types.js";
import { getJson } from "./http.js";

interface OpenMeteoResponse {
  // With timeformat=unixtime, `time` is epoch seconds (UTC). The default string form
  // omits the zone designator and denotes GMT — a parse-as-local trap we avoid here.
  current?: { time?: number; temperature_2m?: number };
}

/** Current outdoor temperature from Open-Meteo (free, no API key). */
export async function fetchOpenMeteo(lat: number, lon: number): Promise<TempReading> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m&timeformat=unixtime`;
  try {
    const body = await getJson<OpenMeteoResponse>(url);
    const tempC = body.current?.temperature_2m;
    if (typeof tempC !== "number") {
      throw new Error("no current.temperature_2m in response");
    }
    const ts = body.current?.time;
    const at = typeof ts === "number" ? new Date(ts * 1000).toISOString() : null;
    return { source: "Open-Meteo", tempC, at, ok: true };
  } catch (err) {
    return { source: "Open-Meteo", tempC: null, at: null, ok: false, error: (err as Error).message };
  }
}
