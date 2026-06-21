import type { TempReading, Recommendation } from "./types.js";

export interface Decision {
  recommendation: Recommendation | null;
  reason: string;
}

const fmt = (n: number | null) => n ? `${n.toFixed(1)}°C` : "missing";

/** Mean of the successful readings, or null if none succeeded. */
function average(readings: TempReading[]): number | null {
  const values = readings.filter((r) => r.ok && r.tempC !== null).map((r) => r.tempC as number);
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Decide whether windows should be open or closed.
 *
 * The counterintuitive rule: when it's hotter outside than inside, keep the windows
 * CLOSED to keep hot air out. Open them once it's cooler outside than inside.
 *
 * `hysteresisC` is a deadband around the indoor temperature: the recommendation only
 * flips once outdoor is at least that far past indoor, so it doesn't chatter when the
 * two temperatures sit right next to each other.
 */
export function decide(
  indoor: TempReading[],
  outdoor: TempReading[],
  hysteresisC: number,
  previous: Recommendation | null,
): Decision {
  const indoorAvgC = average(indoor);
  const outdoorAvgC = average(outdoor);

  if (indoorAvgC === null || outdoorAvgC === null) {
    return {
      recommendation: previous,
      reason: "Not enough sensor data this cycle — holding the previous recommendation.",
    };
  }

  const diff = outdoorAvgC - indoorAvgC;
  const where = `outdoor ${outdoor.map((t) => fmt(t.tempC)).join(", ")} vs indoor ${indoor.map((t) => fmt(t.tempC)).join(", ")}`;

  if (diff >= hysteresisC) {
    return {
      recommendation: "closed",
      reason: `It's ${fmt(diff)} warmer outside than in (${where}) — close to keep the heat out.`,
    };
  }
  if (diff <= -hysteresisC) {
    return {
      recommendation: "open",
      reason: `It's ${fmt(-diff)} cooler outside than in (${where}) — open to let cool air in.`,
    };
  }

  // Inside the deadband: hold steady. Default to "open" before any prior decision.
  const held: Recommendation = previous ?? "open";
  return {
    recommendation: held,
    reason: `Within ${fmt(hysteresisC)} of indoor (${where}) — holding ${held}.`,
  };
}
