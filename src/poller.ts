import type { AppConfig } from "./config.js";
import { decide } from "./decision.js";
import { dispatch, type Notifier } from "./notify/index.js";
import { fetchIndoor } from "./sources/kaiterra.js";
import { fetchMetOffice } from "./sources/metoffice.js";
import { fetchOpenMeteo } from "./sources/openmeteo.js";
import type { Store } from "./state.js";
import type { Recommendation, Snapshot, TempReading } from "./types.js";

export class Poller {
  private lastRecommendation: Recommendation | null = null;

  constructor(
    private readonly config: AppConfig,
    private readonly store: Store,
    private readonly notifiers: Notifier[],
  ) {}

  /** Run one full cycle. Never throws — failures degrade to null readings. */
  async runOnce(): Promise<Snapshot> {
    const now = new Date();

    const outdoorTasks: Array<Promise<TempReading>> = [
      fetchOpenMeteo(this.config.location.latitude, this.config.location.longitude),
    ];
    if (this.config.metOfficeApiKey) {
      outdoorTasks.push(
        fetchMetOffice(
          this.config.location.latitude,
          this.config.location.longitude,
          this.config.metOfficeApiKey,
          now.getTime(),
        ),
      );
    }

    const [indoor, outdoor] = await Promise.all([
      Promise.all(this.config.indoorSensors.map((s) => fetchIndoor(s, this.config.kaiterraApiKey))),
      Promise.all(outdoorTasks),
    ]);

    const { recommendation, reason } = decide(
      indoor,
      outdoor,
      this.config.hysteresisC,
      this.lastRecommendation,
    );

    const snapshot: Snapshot = {
      time: now.toISOString(),
      indoor,
      outdoor,
      recommendation,
      reason,
    };
    this.store.record(snapshot);

    for (const r of [...indoor, ...outdoor].filter((x) => !x.ok)) {
      console.warn(`[poll] ${r.source} failed: ${r.error}`);
    }

    // Heartbeat: one line every cycle so a healthy "nothing changed" is visible and
    // distinguishable from a stuck loop. The bell/notifier still fires only on a flip.
    const changed = recommendation !== this.lastRecommendation;
    console.log(
      `[${snapshot.time}] windows ${recommendation ?? "undecided"}` +
        `${changed ? " (changed)" : " (unchanged)"} — ${reason}`,
    );

    if (recommendation && recommendation !== this.lastRecommendation) {
      await dispatch(this.notifiers, {
        from: this.lastRecommendation,
        to: recommendation,
        snapshot,
      });
      this.lastRecommendation = recommendation;
    }

    return snapshot;
  }

  /** Run immediately, then every `pollIntervalMinutes`. Returns a stop function. */
  start(): () => void {
    const tick = () => {
      this.runOnce().catch((err) => console.error("[poll] unexpected error:", err));
    };
    tick();
    const handle = setInterval(tick, this.config.pollIntervalMinutes * 60_000);
    return () => clearInterval(handle);
  }
}
