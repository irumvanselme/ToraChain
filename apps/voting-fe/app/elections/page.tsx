"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Alert,
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Spinner,
  Button,
  Pagination,
} from "@tora-chain/ui-components";
import { CalendarArrowDown, CalendarArrowUp, CheckIcon } from "lucide-react";
import {
  listElections,
  type Election,
  type ElectionStatus,
} from "../lib/elections";
import { formatDateTime, statusLabel, STATUS_TONE } from "../lib/format";

type VoterStatus = Extract<ElectionStatus, "active" | "scheduled">;

const FILTER_OPTIONS = [
  { value: "active" as const, label: "Active" },
  { value: "scheduled" as const, label: "Upcoming" },
] satisfies Array<{ value: VoterStatus; label: string }>;

const TONE_MAP: Record<VoterStatus | "", "primary" | "success" | "info"> = {
  "": "primary",
  active: "success",
  scheduled: "info",
};

function StatusBadge({ status }: { status: ElectionStatus }) {
  return (
    <Badge tone={STATUS_TONE[status]} outline>
      {statusLabel(status)}
    </Badge>
  );
}

export default function ElectionsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const status = (searchParams.get("status") ?? "active") as VoterStatus | "";

  const [rows, setRows] = useState<Election[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    totalPages: number;
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const patchParams = (next: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`?${params.toString()}`);
  };

  const load = useCallback(
    (signal?: AbortSignal) => {
      Promise.resolve()
        .then(() => {
          setLoading(true);
          setError(null);
          return listElections(
            {
              page,
              limit: 12,
              status: (status as ElectionStatus) || undefined,
            },
            signal,
          );
        })
        .then((res) => {
          setRows(res.data);
          setPagination(res.pagination);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(
            err instanceof Error ? err.message : "Failed to load elections.",
          );
          setLoading(false);
        });
    },
    [page, status],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return (
    <div className="flex flex-col gap-6 py-6 px-4 max-w-6xl mx-auto w-full">
      <PageHeader
        title="Elections"
        description="Elections you are eligible to participate in."
      />

      <div className="flex flex-row flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={status === ""}
          onClick={() => patchParams({ status: "", page: "" })}
          className={`btn btn-primary btn-sm gap-1 rounded-none cursor-pointer${status === "" ? "" : " btn-outline"}`}
        >
          {status === "" && <CheckIcon className="size-4" />}
          All
        </button>
        {FILTER_OPTIONS.map((opt) => {
          const selected = status === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={selected}
              onClick={() =>
                patchParams({
                  status: selected ? "" : opt.value,
                  page: "",
                })
              }
              className={`btn btn-${TONE_MAP[opt.value]} btn-sm gap-1 rounded-none cursor-pointer${selected ? "" : " btn-outline"}`}
            >
              {selected && <CheckIcon className="size-4" />}
              {opt.label}
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
          title="No elections found"
          description={
            status === "active"
              ? "There are no active elections at the moment. Check back later or browse upcoming elections."
              : status === "scheduled"
                ? "No upcoming elections are scheduled yet."
                : "No elections are available right now."
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((election) => (
              <Card
                key={election.electionId}
                className="cursor-pointer transition-shadow hover:shadow-md"
                bodyClassName="gap-3"
                onClick={() => router.push(`/elections/${election.electionId}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-snug">
                    {election.title}
                  </h3>
                  <StatusBadge status={election.status} />
                </div>

                {election.description && (
                  <p className="text-sm text-base-content/70 line-clamp-2">
                    {election.description}
                  </p>
                )}

                <dl className="flex flex-col gap-1.5 text-sm text-base-content/60 mt-auto">
                  {election.startTime ? (
                    <div className="flex items-center gap-2" title="Starts">
                      <dt>
                        <CalendarArrowUp className="size-4 shrink-0 text-success" />
                        <span className="sr-only">Starts</span>
                      </dt>
                      <dd>{formatDateTime(election.startTime)}</dd>
                    </div>
                  ) : (
                    <div className="italic">Start time not set</div>
                  )}
                  {election.endTime ? (
                    <div className="flex items-center gap-2" title="Ends">
                      <dt>
                        <CalendarArrowDown className="size-4 shrink-0 text-error" />
                        <span className="sr-only">Ends</span>
                      </dt>
                      <dd>{formatDateTime(election.endTime)}</dd>
                    </div>
                  ) : (
                    <div className="italic">End time not set</div>
                  )}
                </dl>

                {election.status === "active" && (
                  <div className="pt-1">
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/elections/${election.electionId}`);
                      }}
                    >
                      Vote now
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(p) => patchParams({ page: String(p) })}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
