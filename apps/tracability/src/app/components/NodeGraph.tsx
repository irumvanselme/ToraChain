"use client";

import {
  ReactFlow,
  Background,
  BackgroundVariant,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { NodeRecord } from "@/lib/node-registry";

const STATUS_COLORS: Record<NodeRecord["status"], string> = {
  idle: "#2a3344",
  validating: "#1a3a5c",
  writing: "#1a4a2a",
  consensus_ok: "#1a4a2a",
  consensus_fail: "#4a1a1a",
};

const STATUS_BORDER: Record<NodeRecord["status"], string> = {
  idle: "#4a5568",
  validating: "#4fc3f7",
  writing: "#56d364",
  consensus_ok: "#56d364",
  consensus_fail: "#f85149",
};

const STATUS_PULSE: Record<NodeRecord["status"], string | undefined> = {
  idle: undefined,
  validating: "pulse-blue 1s ease-in-out infinite",
  writing: "pulse-green 0.8s ease-in-out 3",
  consensus_ok: "pulse-green 0.6s ease-in-out 3",
  consensus_fail: "pulse-red 0.6s ease-in-out 3",
};

const STATUS_LABEL: Record<NodeRecord["status"], string> = {
  idle: "idle",
  validating: "validating…",
  writing: "writing",
  consensus_ok: "✓ agreed",
  consensus_fail: "✗ failed",
};

interface Props {
  nodes: NodeRecord[];
  activeEdges: string[]; // nodeId pairs "a→b" currently animated
}

function buildGraph(
  nodes: NodeRecord[],
  activeEdges: string[],
): { rfNodes: Node[]; rfEdges: Edge[] } {
  if (nodes.length === 0) return { rfNodes: [], rfEdges: [] };

  const master = nodes.find((n) => n.nodeId.startsWith("master"));
  const workers = nodes.filter((n) => !n.nodeId.startsWith("master"));

  const rfNodes: Node[] = [];
  const rfEdges: Edge[] = [];

  // Master at center top
  if (master) {
    rfNodes.push({
      id: master.nodeId,
      position: { x: 300, y: 40 },
      data: {
        label: (
          <div
            style={{
              background: STATUS_COLORS[master.status],
              border: `2px solid ${STATUS_BORDER[master.status]}`,
              borderRadius: 10,
              padding: "10px 16px",
              minWidth: 140,
              animation: STATUS_PULSE[master.status],
            }}
          >
            <div style={{ fontSize: 10, color: "#6a7d8e", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              MASTER
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#cdd9e5", marginTop: 2 }}>
              {master.nodeId}
            </div>
            <div style={{ fontSize: 11, color: "#4fc3f7", marginTop: 4 }}>
              {master.blockCount} blocks
            </div>
            <div
              style={{
                fontSize: 10,
                marginTop: 4,
                color: STATUS_BORDER[master.status],
              }}
            >
              {STATUS_LABEL[master.status]}
            </div>
          </div>
        ),
      },
      style: { background: "transparent", border: "none", padding: 0 },
      type: "default",
    });
  }

  // Workers in a row below
  workers.forEach((worker, i) => {
    const x = 60 + i * 220;
    const y = 220;

    rfNodes.push({
      id: worker.nodeId,
      position: { x, y },
      data: {
        label: (
          <div
            style={{
              background: STATUS_COLORS[worker.status],
              border: `2px solid ${STATUS_BORDER[worker.status]}`,
              borderRadius: 10,
              padding: "10px 14px",
              minWidth: 130,
              animation: STATUS_PULSE[worker.status],
            }}
          >
            <div style={{ fontSize: 10, color: "#6a7d8e", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              WORKER
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#cdd9e5", marginTop: 2 }}>
              {worker.nodeId}
            </div>
            <div style={{ fontSize: 11, color: "#56d364", marginTop: 4 }}>
              :{worker.port} · {worker.blockCount} blocks
            </div>
            <div
              style={{
                fontSize: 10,
                marginTop: 4,
                color: STATUS_BORDER[worker.status],
              }}
            >
              {STATUS_LABEL[worker.status]}
            </div>
          </div>
        ),
      },
      style: { background: "transparent", border: "none", padding: 0 },
      type: "default",
    });

    // Edge master ↔ worker
    if (master) {
      const edgeKey = `${master.nodeId}→${worker.nodeId}`;
      const animated = activeEdges.includes(edgeKey) || activeEdges.includes(`${worker.nodeId}→${master.nodeId}`);
      rfEdges.push({
        id: `e-${master.nodeId}-${worker.nodeId}`,
        source: master.nodeId,
        target: worker.nodeId,
        animated,
        style: {
          stroke: animated ? "#4fc3f7" : "#2a3344",
          strokeWidth: animated ? 2.5 : 1.5,
        },
      });
    }
  });

  return { rfNodes, rfEdges };
}

export function NodeGraph({ nodes, activeEdges }: Props) {
  const { rfNodes, rfEdges } = buildGraph(nodes, activeEdges);

  if (rfNodes.length === 0) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6a7d8e",
          fontSize: 14,
        }}
      >
        Waiting for nodes to connect…
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      nodesDraggable={false}
      nodesConnectable={false}
      panOnDrag={false}
      zoomOnScroll={false}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} color="#1c2330" gap={24} size={1} />
    </ReactFlow>
  );
}
