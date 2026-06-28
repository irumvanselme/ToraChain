export interface NodeRecord {
  nodeId: string;
  port: number;
  connectedAt: number;
  blockCount: number;
  status: "idle" | "validating" | "writing" | "consensus_ok" | "consensus_fail";
  lastSeen: number;
}

const nodes = new Map<string, NodeRecord>();

export function upsertNode(
  nodeId: string,
  port: number,
  connectedAt: number,
): void {
  nodes.set(nodeId, {
    nodeId,
    port,
    connectedAt,
    blockCount: 0,
    status: "idle",
    lastSeen: Date.now(),
  });
}

export function removeNode(nodeId: string): void {
  nodes.delete(nodeId);
}

export function setNodeStatus(
  nodeId: string,
  status: NodeRecord["status"],
): void {
  const node = nodes.get(nodeId);
  if (node) {
    node.status = status;
    node.lastSeen = Date.now();
  }
}

export function incrementBlockCount(nodeId: string): void {
  const node = nodes.get(nodeId);
  if (node) node.blockCount += 1;
}

export function getNodes(): NodeRecord[] {
  return Array.from(nodes.values());
}
