"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ElectionStatusBadge, Input } from "@tora-chain/ui-components";
import { useAudit } from "../lib/audit-context";
import {
  listElections,
  type AuditElection,
  type ElectionListEnvelope,
} from "../api/elections.ts";
import { ApiError } from "@/app/api/errors";

function ElectionCard({ election }: { election: AuditElection }) {
  return (
    <Link
      href={`/elections/${election.electionId}`}
      className="block bg-base-100 rounded-lg border border-base-300 p-5 hover:border-primary hover:shadow-sm transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-base-content truncate">
            {election.title}
          </h2>
          {election.description && (
            <p className="mt-1 text-sm text-base-content/60 line-clamp-2">
              {election.description}
            </p>
          )}
        </div>
        <ElectionStatusBadge status={election.status} />
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-base-content/60">
        <span>{election.totalVotes.toLocaleString()} votes</span>
        {election.startTime && (
          <span>
            Started {new Date(election.startTime).toLocaleDateString()}
          </span>
        )}
        {election.endTime && (
          <span>Ended {new Date(election.endTime).toLocaleDateString()}</span>
        )}
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { token } = useAudit();
  const [envelope, setEnvelope] = useState<ElectionListEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!token) return;
    listElections(token, { page, limit: 12, q: q || undefined })
      .then((result) => {
        setEnvelope(result);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError ? err.message : "Failed to load elections.",
        );
      })
      .finally(() => setLoading(false));
  }, [token, q, page]);

  const totalPages = envelope?.pagination.totalPages ?? 1;

  return (
    <div className="min-h-screen bg-base-200">
      <main className="container mx-auto px-1 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-base-content">Elections</h2>
          <div className="w-56">
            <Input
              type="search"
              placeholder="Search elections…"
              aria-label="Search elections"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
                setLoading(true);
                setError(null);
              }}
            />
          </div>
        </div>

        {loading && (
          <div className="text-center py-16 text-base-content/40">
            Loading elections…
          </div>
        )}

        {error && (
          <div className="rounded-md bg-error/10 border border-error/20 p-4 text-sm text-error">
            {error}
          </div>
        )}

        {!loading && !error && envelope && (
          <>
            {envelope.data.length === 0 ? (
              <div className="text-center py-16 text-base-content/40">
                No elections found.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {envelope.data.map((e) => (
                  <ElectionCard key={e.electionId} election={e} />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <button
                  disabled={page <= 1}
                  onClick={() => {
                    setPage((p) => p - 1);
                    setLoading(true);
                  }}
                  className="px-3 py-1.5 rounded border border-base-300 text-sm disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-sm text-base-content/60">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => {
                    setPage((p) => p + 1);
                    setLoading(true);
                  }}
                  className="px-3 py-1.5 rounded border border-base-300 text-sm disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
