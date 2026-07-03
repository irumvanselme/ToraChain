import { ElectionStatusBadge } from "@tora-chain/ui-components";
import type { ElectionStatus } from "api/elections";

export function StatusBadge({ status }: { status: ElectionStatus }) {
  return <ElectionStatusBadge status={status} />;
}
