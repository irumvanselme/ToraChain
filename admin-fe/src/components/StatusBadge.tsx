import { Badge } from "@tora-chain/ui-components";
import type { ElectionStatus } from "../lib/elections.ts";
import { STATUS_TONE, statusLabel } from "../lib/format.ts";

export function StatusBadge({ status }: { status: ElectionStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{statusLabel(status)}</Badge>;
}
