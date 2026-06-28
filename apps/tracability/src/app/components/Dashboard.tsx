"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { TracabilityEvent } from "@tora-chain/specs";
import { TRACABILITY_EVENTS } from "@tora-chain/specs";
import type { NodeRecord } from "@/lib/node-registry";
import { EventLog } from "./EventLog";

const NodeGraph = dynamic(
  () => import("./NodeGraph").then((m) => m.NodeGraph),
  { ssr: false },
);

interface NetworkStatus {
  nodeCount: number;
  blockCount: number;
  ready: boolean;
}

export function Dashboard() {
  const [events, setEvents] = useState<TracabilityEvent[]>([]);
  const [nodes, setNodes] = useState<NodeRecord[]>([]);
  const [activeEdges, setActiveEdges] = useState<string[]>([]);
  const [status, setStatus] = useState<NetworkStatus>({
    nodeCount: 0,
    blockCount: 0,
    ready: false,
  });
  const eventsRef = useRef<TracabilityEvent[]>([]);

  // Poll nodes list every 3 s
  useEffect(() => {
    const fetchNodes = async () => {
      try {
        const res = await fetch("/api/nodes");
        const data = (await res.json()) as { nodes: NodeRecord[] };
        setNodes(data.nodes);
        const totalBlocks = data.nodes.reduce(
          (s, n) => Math.max(s, n.blockCount),
          0,
        );
        setStatus({
          nodeCount: data.nodes.length,
          blockCount: totalBlocks,
          ready: data.nodes.length >= 3,
        });
      } catch {
        // network blip — ignore
      }
    };

    fetchNodes();
    const interval = setInterval(fetchNodes, 3_000);
    return () => clearInterval(interval);
  }, []);

  // SSE subscription
  useEffect(() => {
    const source = new EventSource("/api/stream");

    source.onmessage = (e) => {
      const event = JSON.parse(e.data as string) as TracabilityEvent;
      eventsRef.current = [event, ...eventsRef.current].slice(0, 500);
      setEvents([...eventsRef.current]);
      handleAnimations(event);
    };

    source.onerror = () => {
      // SSE will auto-reconnect
    };

    return () => source.close();
  }, []);

  function handleAnimations(event: TracabilityEvent) {
    switch (event.type) {
      case TRACABILITY_EVENTS.VALIDATE_BLOCK_SENT: {
        // Animate edges from master outward to each worker
        const masterNode = nodes.find((n) => n.nodeId.startsWith("master"));
        if (!masterNode) break;
        const edges = event.targetNodeIds.map(
          (wId) => `${masterNode.nodeId}→${wId}`,
        );
        setActiveEdges(edges);
        setTimeout(() => setActiveEdges([]), 5_000);
        break;
      }
      case TRACABILITY_EVENTS.BLOCK_VALIDATED: {
        // Animate edge back from worker to master
        const masterNode = nodes.find((n) => n.nodeId.startsWith("master"));
        if (!masterNode) break;
        setActiveEdges((prev) => [
          ...prev,
          `${event.nodeId}→${masterNode.nodeId}`,
        ]);
        break;
      }
      case TRACABILITY_EVENTS.CONSENSUS_REACHED:
      case TRACABILITY_EVENTS.CONSENSUS_FAILED:
      case TRACABILITY_EVENTS.NEW_BLOCK_BROADCAST:
        setTimeout(() => setActiveEdges([]), 2_000);
        break;
      default:
        break;
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr",
        minHeight: "100vh",
        background: "var(--bg)",
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18, color: "var(--accent)" }}>⛓</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: "#e2ecf5" }}>
              ToraChain Tracability
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--muted)",
                fontFamily: "monospace",
              }}
            >
              live blockchain node monitor
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <Stat label="Nodes" value={status.nodeCount} />
          <Stat label="Blocks" value={status.blockCount} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontFamily: "monospace",
              color: status.ready ? "var(--green)" : "var(--amber)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: status.ready ? "var(--green)" : "var(--amber)",
                display: "inline-block",
                animation: "pulse-green 2s ease-in-out infinite",
              }}
            />
            {status.ready
              ? "Quorum met"
              : "Waiting for quorum (need 3 workers)"}
          </div>
        </div>
      </header>

      {/* Main split: graph left, event log right */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          height: "calc(100vh - 57px)",
          overflow: "hidden",
        }}
      >
        {/* Graph */}
        <div
          style={{
            borderRight: "1px solid var(--border)",
            position: "relative",
          }}
        >
          <NodeGraph nodes={nodes} activeEdges={activeEdges} />
        </div>

        {/* Event log */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px 8px",
              borderBottom: "1px solid var(--border)",
              fontSize: 11,
              fontFamily: "monospace",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--muted)",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Event Log</span>
            <span>{events.length} events</span>
          </div>
          <div style={{ flex: 1, overflow: "hidden", padding: "8px 12px" }}>
            <EventLog events={events} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "#e2ecf5",
          fontVariantNumeric: "tabular-nums",
          fontFamily: "monospace",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          color: "var(--muted)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
    </div>
  );
}
