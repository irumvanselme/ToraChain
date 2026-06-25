"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAudit } from "../lib/audit-context";
import {
  listElections,
  type AuditElection,
  type ElectionListEnvelope,
} from "../lib/elections";
import { ApiError } from "../lib/api";

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  ended: "bg-gray-100 text-gray-700",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BADGE[status] ?? "bg-yellow-100 text-yellow-800";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}
    >
      {status}
    </span>
  );
}

function ElectionCard({ election }: { election: AuditElection }) {
  return (
    <Link
      href={`/elections/${election.electionId}`}
      className="block bg-white rounded-lg border border-gray-200 p-5 hover:border-indigo-400 hover:shadow-sm transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-gray-900 truncate">
            {election.title}
          </h2>
          {election.description && (
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">
              {election.description}
            </p>
          )}
        </div>
        <StatusBadge status={election.status} />
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span>{election.totalVotes.toLocaleString()} votes</span>
        {election.startTime && (
          <span>Started {new Date(election.startTime).toLocaleDateString()}</span>
        )}
        {election.endTime && (
          <span>Ended {new Date(election.endTime).toLocaleDateString()}</span>
        )}
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { token, auditStatus } = useAudit();
  const [envelope, setEnvelope] = useState<ElectionListEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(
    async (search: string, p: number) => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const result = await listElections(token, {
          page: p,
          limit: 12,
          q: search || undefined,
        });
        setEnvelope(result);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Failed to load elections.",
        );
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    void load(q, page);
  }, [load, q, page]);

  const totalPages = envelope?.pagination.totalPages ?? 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              ToraChain Auditing
            </h1>
            <p className="text-sm text-gray-500">
              {auditStatus?.org?.name ?? "Auditing Portal"}
            </p>
          </div>
          <a
            href={`${process.env.NEXT_PUBLIC_AUTH_BASE}/profile`}
            className="text-sm text-indigo-600 hover:underline"
          >
            {auditStatus?.name ?? "Profile"}
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Elections</h2>
          <input
            type="search"
            placeholder="Search elections…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {loading && (
          <div className="text-center py-16 text-gray-400">
            Loading elections…
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && envelope && (
          <>
            {envelope.data.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
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
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 rounded border border-gray-300 text-sm disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded border border-gray-300 text-sm disabled:opacity-40"
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
