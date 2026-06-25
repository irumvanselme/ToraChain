import { NextRequest, NextResponse } from "next/server";
import type { TracabilityEvent } from "@tora-chain/specs";
import { TRACABILITY_EVENTS } from "@tora-chain/specs";
import { appendEvent, getEvents } from "@/lib/event-store";
import {
  upsertNode,
  removeNode,
  setNodeStatus,
  incrementBlockCount,
} from "@/lib/node-registry";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: TracabilityEvent;
  try {
    body = (await req.json()) as TracabilityEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Update node registry based on event type
  switch (body.type) {
    case TRACABILITY_EVENTS.NODE_CONNECTED:
      upsertNode(body.nodeId, body.port, body.connectedAt);
      break;
    case TRACABILITY_EVENTS.NODE_DISCONNECTED:
      removeNode(body.nodeId);
      break;
    case TRACABILITY_EVENTS.VALIDATE_BLOCK_SENT:
      for (const nodeId of body.targetNodeIds) {
        setNodeStatus(nodeId, "validating");
      }
      break;
    case TRACABILITY_EVENTS.CONSENSUS_REACHED:
      for (const nodeId of body.agreeingNodeIds) {
        setNodeStatus(nodeId, "consensus_ok");
      }
      break;
    case TRACABILITY_EVENTS.CONSENSUS_FAILED:
      for (const r of body.responses) {
        setNodeStatus(r.nodeId, "consensus_fail");
      }
      break;
    case TRACABILITY_EVENTS.BLOCK_WRITTEN:
      setNodeStatus(body.nodeId, "writing");
      incrementBlockCount(body.nodeId);
      break;
    default:
      break;
  }

  appendEvent(body);

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ events: getEvents() });
}
