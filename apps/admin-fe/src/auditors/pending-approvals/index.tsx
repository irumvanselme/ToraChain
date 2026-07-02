import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Modal,
  PageHeader,
  Spinner,
  Table,
  Textarea,
  type Column,
} from "@tora-chain/ui-components";
import { CheckIcon, X } from "lucide-react";
import {
  APPROVAL_STATUSES,
  type ApprovalStatus,
  type AuditOrgListItem,
} from "api/audit-orgs.ts";
import { formatDateTime } from "lib/format.ts";
import {
  usePendingApprovals,
  type ApprovalFilter,
} from "./use-pending-approvals.ts";

type FilterTone = "primary" | "warning" | "success" | "error";

/** A distinct badge color per filter chip (incl. the "All" reset). */
const FILTER_TONE: Record<ApprovalFilter, FilterTone> = {
  all: "primary",
  pending: "warning",
  approved: "success",
  rejected: "error",
};

const STATUS_LABEL: Record<ApprovalStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

const STATUS_BADGE_TONE: Record<
  ApprovalStatus,
  "warning" | "success" | "error"
> = {
  pending: "warning",
  approved: "success",
  rejected: "error",
};

const FILTER_OPTIONS: { value: ApprovalFilter; label: string }[] = [
  ...APPROVAL_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] })),
  { value: "all", label: "All" },
];

const EMPTY_COPY: Record<
  ApprovalFilter,
  { title: string; description: string }
> = {
  pending: {
    title: "No pending applications",
    description:
      "When auditor organizations apply for access, they will show up here for review.",
  },
  approved: {
    title: "No approved organizations",
    description: "Organizations you approve will show up here.",
  },
  rejected: {
    title: "No rejected organizations",
    description: "Organizations you reject will show up here.",
  },
  all: {
    title: "No auditor organizations yet",
    description:
      "When auditor organizations apply for access, they will show up here.",
  },
};

export function PendingApprovalsPage() {
  const {
    filter,
    setFilter,
    rows,
    loading,
    load,
    error,
    toApprove,
    setToApprove,
    approving,
    approveError,
    setApproveError,
    confirmApprove,
    toReject,
    setToReject,
    rejecting,
    rejectError,
    setRejectError,
    confirmReject,
  } = usePendingApprovals();

  const [rejectReason, setRejectReason] = useState("");
  const reasonMissing = rejectReason.trim().length === 0;

  const columns: Column<AuditOrgListItem>[] = [
    {
      key: "organization",
      header: "Organization",
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.name}</span>
          <span className="text-xs text-base-content/60">{row.slug}</span>
        </div>
      ),
    },
    {
      key: "applied",
      header: "Applied",
      cell: (row) => formatDateTime(row.createdAt),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <div className="flex flex-col gap-1">
          <Badge tone={STATUS_BADGE_TONE[row.approvalStatus]}>
            {STATUS_LABEL[row.approvalStatus]}
          </Badge>
          {row.approvalStatus === "approved" && row.approvedAt && (
            <span className="text-xs text-base-content/60">
              on {formatDateTime(row.approvedAt)}
            </span>
          )}
          {row.approvalStatus === "rejected" && row.rejectionReason && (
            <span
              className="max-w-xs truncate text-xs text-base-content/60"
              title={row.rejectionReason}
            >
              {row.rejectionReason}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      cell: (row) =>
        row.approvalStatus === "pending" ? (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="success"
              onClick={() => {
                setApproveError(null);
                setToApprove(row);
              }}
            >
              <CheckIcon className="size-4" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="error"
              outline
              onClick={() => {
                setRejectError(null);
                setRejectReason("");
                setToReject(row);
              }}
            >
              <X className="size-4" />
              Reject
            </Button>
          </div>
        ) : (
          <span className="text-base-content/40">—</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 py-6">
      <PageHeader
        title="Auditor approvals"
        description="Review auditor organizations that applied to audit elections, and approve or reject them."
      />
      <div className="flex flex-row flex-wrap gap-3">
        {FILTER_OPTIONS.map((option) => {
          const selected = filter === option.value;
          return (
            <button
              key={option.value}
              id={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => setFilter(option.value)}
              className={`btn btn-${FILTER_TONE[option.value]} btn-sm gap-1 rounded-none cursor-pointer${
                selected ? "" : " btn-outline"
              }`}
            >
              {selected && <CheckIcon className="size-4" />}
              {option.label}
            </button>
          );
        })}
      </div>
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <Alert tone="error">
          <span>{error}</span>
          <Button size="sm" variant="ghost" onClick={() => load()}>
            Retry
          </Button>
        </Alert>
      ) : rows.length === 0 ? (
        <EmptyState
          title={EMPTY_COPY[filter].title}
          description={EMPTY_COPY[filter].description}
        />
      ) : (
        <div className="rounded-box border border-base-300 bg-base-100">
          <Table columns={columns} rows={rows} rowKey={(row) => row.orgId} />
        </div>
      )}

      <Modal
        open={toApprove !== null}
        onClose={() => !approving && setToApprove(null)}
        title="Approve organization"
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => setToApprove(null)}
              disabled={approving}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              loading={approving}
              onClick={() => void confirmApprove()}
            >
              Approve
            </Button>
          </>
        }
      >
        {approveError && (
          <Alert tone="error" className="mb-3">
            {approveError}
          </Alert>
        )}
        <p>
          Approve <span className="font-semibold">{toApprove?.name}</span>?
          Their auditors will gain access to election results and blockchain
          data.
        </p>
      </Modal>

      <Modal
        open={toReject !== null}
        onClose={() => !rejecting && setToReject(null)}
        title="Reject organization"
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => setToReject(null)}
              disabled={rejecting}
            >
              Cancel
            </Button>
            <Button
              variant="error"
              loading={rejecting}
              disabled={reasonMissing}
              onClick={() => void confirmReject(rejectReason.trim())}
            >
              Reject
            </Button>
          </>
        }
      >
        {rejectError && (
          <Alert tone="error" className="mb-3">
            {rejectError}
          </Alert>
        )}
        <div className="flex flex-col gap-3">
          <p>
            Reject <span className="font-semibold">{toReject?.name}</span>? The
            organization will see the reason you provide below.
          </p>
          <Textarea
            label="Reason"
            required
            rows={3}
            placeholder="Explain why this application is being rejected"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            disabled={rejecting}
          />
        </div>
      </Modal>
    </div>
  );
}
