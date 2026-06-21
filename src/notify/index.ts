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
 * Logs the flip and rings the terminal bell a few times — audible across the room even
 * when the screen isn't visible. The bell is the ASCII BEL char (\x07) written to stdout.
 */
export class LogNotifier implements Notifier {
  constructor(private readonly rings: number = 4, private readonly gapMs: number = 250) {}

  async notify(event: FlipEvent): Promise<void> {
    const arrow = event.from ? `${event.from} → ${event.to}` : `→ ${event.to}`;
    console.log(`\n${new Date().toISOString()} 🔔 WINDOWS: ${event.to.toUpperCase()}  (${arrow})`);
    console.log(`   ${event.snapshot.reason}`);

    for (let i = 0; i < this.rings; i++) {
      process.stdout.write("\x07");
      if (i < this.rings - 1) await new Promise<void>((r) => setTimeout(r, this.gapMs));
    }
  }
}
