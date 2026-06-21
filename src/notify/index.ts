import type { Recommendation, Snapshot } from "../types.js";

export interface FlipEvent {
  from: Recommendation | null;
  to: Recommendation;
  snapshot: Snapshot;
}

/** A notifier reacts when the recommendation flips. Add new channels by implementing this. */
export interface Notifier {
  notify(event: FlipEvent): Promise<void> | void;
}

/** Fan a flip event out to every configured notifier; one failing never blocks the others. */
export async function dispatch(notifiers: Notifier[], event: FlipEvent): Promise<void> {
  await Promise.allSettled(notifiers.map((n) => Promise.resolve(n.notify(event))));
}

/**
 * Logs the flip and rings the terminal bell a few times
 */
export class LogNotifier implements Notifier {
  constructor(private readonly rings: number = 6, private readonly gapMs: number = 500) {}

  async notify(event: FlipEvent): Promise<void> {
    console.log(`\n[${new Date().toISOString()}] 🔔 WINDOWS ${event.to.toUpperCase()}`);

    for (let i = 0; i < this.rings; i++) {
      process.stdout.write("\x07"); // bell
      if (i < this.rings - 1) await new Promise<void>((r) => setTimeout(r, this.gapMs));
    }
  }
}
