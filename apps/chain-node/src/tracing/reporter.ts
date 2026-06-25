import type { TracabilityEvent } from "@tora-chain/specs";

export class TracabilityReporter {
  private readonly url: string | null;

  constructor() {
    this.url = process.env["TRACABILITY_URL"] ?? null;
  }

  emit(event: TracabilityEvent): void {
    if (!this.url) return;
    const target = `${this.url}/api/events`;
    fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    }).catch(() => {
      // Fire-and-forget — tracability being down must never affect consensus
    });
  }
}
