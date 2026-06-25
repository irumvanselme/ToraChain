import { NextResponse } from "next/server";
import { getNodes, upsertNode } from "@/lib/node-registry";

interface MasterPeer {
  nodeId: string;
  port: number;
  connectedAt: number;
}

interface MasterPeersResponse {
  peers: MasterPeer[];
  masterNodeId: string;
  masterPort: number;
}

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  // Opportunistically pull current topology from the master node.
  // If master is unavailable we fall back to the in-memory registry.
  const masterUrl = process.env["MASTER_NODE_URL"];
  if (masterUrl) {
    try {
      const res = await fetch(`${masterUrl}/api/peers`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (res.ok) {
        const data = (await res.json()) as MasterPeersResponse;
        // Also register master itself so it shows on the graph
        upsertNode(data.masterNodeId, data.masterPort, Date.now());
        for (const peer of data.peers) {
          upsertNode(peer.nodeId, peer.port, peer.connectedAt);
        }
      }
    } catch {
      // Master unreachable — serve stale registry
    }
  }

  return NextResponse.json({ nodes: getNodes() });
}
