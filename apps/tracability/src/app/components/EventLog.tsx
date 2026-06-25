"use client";

import type { TracabilityEvent } from "@tora-chain/specs";
import { TRACABILITY_EVENTS } from "@tora-chain/specs";

const EVENT_STYLE: Record<
  string,
  { color: string; bg: string; icon: string }
> = {
  [TRACABILITY_EVENTS.NODE_CONNECTED]:      { color: "#56d364", bg: "#0f2a18", icon: "◉" },
  [TRACABILITY_EVENTS.NODE_DISCONNECTED]:   { color: "#f85149", bg: "#2a0f0f", icon: "○" },
  [TRACABILITY_EVENTS.VOTE_RECEIVED]:       { color: "#4fc3f7", bg: "#0f1f2a", icon: "◈" },
  [TRACABILITY_EVENTS.VALIDATE_BLOCK_SENT]: { color: "#d4a640", bg: "#2a1f0f", icon: "→" },
  [TRACABILITY_EVENTS.BLOCK_VALIDATED]:     { color: "#bc8cff", bg: "#1a0f2a", icon: "✓" },
  [TRACABILITY_EVENTS.CONSENSUS_REACHED]:   { color: "#56d364", bg: "#0f2a18", icon: "⬡" },
  [TRACABILITY_EVENTS.CONSENSUS_FAILED]:    { color: "#f85149", bg: "#2a0f0f", icon: "⚠" },
  [TRACABILITY_EVENTS.NEW_BLOCK_BROADCAST]: { color: "#4fc3f7", bg: "#0f1f2a", icon: "◆" },
  [TRACABILITY_EVENTS.BLOCK_WRITTEN]:       { color: "#56d364", bg: "#0f2a18", icon: "▪" },
};

function summarize(event: TracabilityEvent): string {
  switch (event.type) {
    case TRACABILITY_EVENTS.NODE_CONNECTED:
      return `${event.nodeId} connected (port :${event.port})`;
    case TRACABILITY_EVENTS.NODE_DISCONNECTED:
      return `${event.nodeId} disconnected`;
    case TRACABILITY_EVENTS.VOTE_RECEIVED:
      return `Vote received — election ${event.electionId.slice(0, 8)}…`;
    case TRACABILITY_EVENTS.VALIDATE_BLOCK_SENT:
      return `Block #${event.blockIndex} sent to ${event.targetNodeIds.length} nodes for validation`;
    case TRACABILITY_EVENTS.BLOCK_VALIDATED:
      return `${event.nodeId} validated block #${event.blockIndex} (${event.hash.slice(0, 10)}…)`;
    case TRACABILITY_EVENTS.CONSENSUS_REACHED:
      return `Consensus on block #${event.blockIndex} — ${event.agreeingNodeIds.length} nodes agreed`;
    case TRACABILITY_EVENTS.CONSENSUS_FAILED:
      return `Consensus FAILED for block #${event.blockIndex}: ${event.reason}`;
    case TRACABILITY_EVENTS.NEW_BLOCK_BROADCAST:
      return `Block #${event.blockIndex} broadcast (hash ${event.hash.slice(0, 10)}…)`;
    case TRACABILITY_EVENTS.BLOCK_WRITTEN:
      return `${event.nodeId} wrote block #${event.blockIndex}`;
    default:
      return JSON.stringify(event);
  }
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", { hour12: false });
}

function getTimestamp(event: TracabilityEvent): number {
  if ("connectedAt" in event) return event.connectedAt;
  if ("disconnectedAt" in event) return event.disconnectedAt;
  if ("receivedAt" in event) return event.receivedAt;
  if ("sentAt" in event) return event.sentAt;
  if ("validatedAt" in event) return event.validatedAt;
  if ("reachedAt" in event) return event.reachedAt;
  if ("failedAt" in event) return event.failedAt;
  if ("broadcastAt" in event) return event.broadcastAt;
  if ("writtenAt" in event) return event.writtenAt;
  return Date.now();
}

interface Props {
  events: TracabilityEvent[];
}

export function EventLog({ events }: Props) {
  const reversed = [...events].reverse().slice(0, 80);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        overflowY: "auto",
        height: "100%",
        padding: "0 2px",
      }}
    >
      {reversed.length === 0 && (
        <div style={{ color: "#6a7d8e", fontSize: 13, padding: "20px 0" }}>
          No events yet. Start the chain network and cast a vote.
        </div>
      )}
      {reversed.map((event, i) => {
        const style = EVENT_STYLE[event.type] ?? {
          color: "#cdd9e5",
          bg: "#1c2330",
          icon: "·",
        };
        const ts = getTimestamp(event);
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              background: style.bg,
              border: `1px solid ${style.color}22`,
              borderRadius: 6,
              padding: "7px 10px",
              animation: i === 0 ? "slide-in 0.2s ease-out" : undefined,
            }}
          >
            <span style={{ color: style.color, fontSize: 13, flexShrink: 0, marginTop: 1 }}>
              {style.icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: "#cdd9e5", lineHeight: 1.4 }}>
                {summarize(event)}
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 10,
                  color: "#6a7d8e",
                  marginTop: 2,
                }}
              >
                {event.type} · {formatTime(ts)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
