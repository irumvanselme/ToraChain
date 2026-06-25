import type { TracabilityEvent } from "@tora-chain/specs";

// In-memory ring buffer — last MAX_EVENTS events survive a server restart is not
// a requirement for this demo, so no SQLite persistence here.
const MAX_EVENTS = 500;

const events: TracabilityEvent[] = [];

// SSE subscriber callbacks
const subscribers = new Set<(event: TracabilityEvent) => void>();

export function appendEvent(event: TracabilityEvent): void {
  events.push(event);
  if (events.length > MAX_EVENTS) events.shift();
  for (const cb of subscribers) {
    cb(event);
  }
}

export function getEvents(): ReadonlyArray<TracabilityEvent> {
  return events;
}

export function subscribe(cb: (event: TracabilityEvent) => void): () => void {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}
