import type { TempReading } from "../types.js";
import { getJson } from "./http.js";

/**
 * Met Office Weather DataHub — Site Specific hourly forecast.
 * Adjust BASE_URL here if your subscription uses a different path.
 */
const BASE_URL = "https://data.hub.api.metoffice.gov.uk/sitespecific/v0/point/hourly";
const HOUR_MS = 3_600_000;

interface HourPoint {
  time: string;
  screenTemperature?: number;
  minScreenAirTemp?: number;
  maxScreenAirTemp?: number;
}

interface DataHubResponse {
  features?: Array<{ properties?: { timeSeries?: HourPoint[] } }>;
}

/**
 * Estimate the current outdoor temperature from the single hourly slot that contains `now`.
 *
 * Each forecast entry's min/max cover the hour *ending* at its timestamp (in the sample,
 * the 10:00 entry's min equals the 09:00 reading). We find that slot, then place the
 * current temperature between its min and max by the fraction through the hour (FITA).
 *
 * min/max don't encode direction, so we orient using the same slot's `screenTemperature`
 * (the value at the end of the hour): if it's in the upper half of the band the hour is
 * warming (min → max), otherwise it's cooling (max → min). At the end of the hour the
 * estimate therefore lands back on `screenTemperature`.
 */
export function estimateFromHourSlot(
  series: HourPoint[],
  nowMs: number,
): { tempC: number; at: string } | null {
  const points = series
    .map((p) => ({ ...p, ms: Date.parse(p.time) }))
    .filter((p) => Number.isFinite(p.ms))
    .sort((a, b) => a.ms - b.ms);
  if (points.length === 0) return null;

  // The slot containing `now` is the first entry whose timestamp is after `now`
  // (its band covers the hour ending at that timestamp). Clamp past the last entry.
  let i = points.findIndex((p) => p.ms > nowMs);
  if (i === -1) i = points.length - 1;
  const slot = points[i]!;

  const min = slot.minScreenAirTemp;
  const max = slot.maxScreenAirTemp;
  if (typeof min !== "number" || typeof max !== "number") return null;

  const slotStart = i > 0 ? points[i - 1]!.ms : slot.ms - HOUR_MS;
  const span = slot.ms - slotStart || HOUR_MS;
  const frac = Math.min(1, Math.max(0, (nowMs - slotStart) / span));

  // Orient min/max with the end-of-hour value; default to warming if it's missing.
  const end = slot.screenTemperature;
  const warming = typeof end !== "number" ? true : end >= (min + max) / 2;
  const tempC = warming ? min + frac * (max - min) : max - frac * (max - min);

  return { tempC, at: new Date(nowMs).toISOString() };
}

/** Current outdoor temperature estimated from the Met Office hourly forecast. */
export async function fetchMetOffice(
  lat: number,
  lon: number,
  apiKey: string,
  nowMs: number = Date.now(),
): Promise<TempReading> {
  const url = `${BASE_URL}?dataSource=BD1&latitude=${lat}&longitude=${lon}`;
  try {
    const body = await getJson<DataHubResponse>(url, { headers: { apikey: apiKey } });
    const series = body.features?.[0]?.properties?.timeSeries;
    if (!series || series.length === 0) throw new Error("no timeSeries in response");

    const estimate = estimateFromHourSlot(series, nowMs);
    if (!estimate) throw new Error("no usable min/max screen air temperature");
    return { source: "Met Office", tempC: estimate.tempC, at: estimate.at, ok: true };
  } catch (err) {
    return { source: "Met Office", tempC: null, at: null, ok: false, error: (err as Error).message };
  }
}
