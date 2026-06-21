export type Recommendation = "open" | "closed";

/** A single temperature reading from one source (a sensor or a weather API). */
export interface TempReading {
  /** Human label, e.g. "Living room" or "Open-Meteo". */
  source: string;
  /** Temperature in °C, or null if this source could not be read this cycle. */
  tempC: number | null;
  /** ISO timestamp the reading refers to, if the source provides one. */
  at: string | null;
  /** Whether the fetch succeeded. */
  ok: boolean;
  /** Populated when ok === false. */
  error?: string;
}

/** Everything computed in one polling cycle. */
export interface Snapshot {
  /** ISO time this snapshot was taken. */
  time: string;
  indoor: TempReading[];
  outdoor: TempReading[];
  /** null only before the first successful decision. */
  recommendation: Recommendation | null;
  /** Human-readable explanation of the recommendation. */
  reason: string;
}
