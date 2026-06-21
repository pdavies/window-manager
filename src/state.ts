import type { Snapshot } from "./types.js";

/** In-memory current snapshot plus a ring buffer of recent history (lost on restart). */
export class Store {
  private current: Snapshot | null = null;
  private readonly history: Snapshot[] = [];

  constructor(private readonly maxHistory: number = 288 /* ~24h at 5-min cadence */) {}

  record(snapshot: Snapshot): void {
    this.current = snapshot;
    this.history.push(snapshot);
    if (this.history.length > this.maxHistory) {
      this.history.splice(0, this.history.length - this.maxHistory);
    }
  }

  getCurrent(): Snapshot | null {
    return this.current;
  }

  getHistory(): readonly Snapshot[] {
    return this.history;
  }
}
