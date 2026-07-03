"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ElectionStatusBadge,
  electionStatusLabel,
} from "@tora-chain/ui-components";
import { useAudit } from "@/app/lib/audit-context";
import {
  getElection,
  getElectionResults,
  getBlockchainData,
  type AuditElection,
  type ElectionResults,
  type BlockEntry,
} from "@/app/api/elections";
import { ApiError } from "@/app/api/errors";

type Tab = "overview" | "results" | "blockchain";

function DownloadButton({
  label,
  data,
  filename,
}: {
  label: string;
  data: unknown;
  filename: string;
}) {
  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleDownload}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-base-300 text-sm text-base-content/80 hover:bg-base-200 transition"
    >
      ↓ {label}
    </button>
  );
}

function ResultsTab({
  electionId,
  token,
}: {
  electionId: string;
  token: string;
}) {
  const [results, setResults] = useState<ElectionResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getElectionResults(token, electionId)
      .then(setResults)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Failed to load results."),
      )
      .finally(() => setLoading(false));
  }, [electionId, token]);

  if (loading)
    return (
      <div className="text-base-content/40 py-8 text-center">
        Loading results…
      </div>
    );
  if (error) return <div className="text-error text-sm">{error}</div>;
  if (!results) return null;

  const maxVotes = Math.max(...results.candidates.map((c) => c.voteCount), 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-base-content/60">
          {results.totalVotes.toLocaleString()} total votes
        </p>
        <DownloadButton
          label="Download results (JSON)"
          data={results}
          filename={`election-${electionId}-results.json`}
        />
      </div>
      <div className="space-y-3">
        {results.candidates
          .sort((a, b) => b.voteCount - a.voteCount)
          .map((c) => (
            <div key={c.candidateId}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-base-content">
                  {c.fullName}
                </span>
                <span className="text-base-content/60">
                  {c.voteCount.toLocaleString()} votes (
                  {results.totalVotes > 0
                    ? Math.round((c.voteCount / results.totalVotes) * 100)
                    : 0}
                  %)
                </span>
              </div>
              <div className="h-2 bg-base-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(c.voteCount / maxVotes) * 100}%` }}
                />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function BlockchainTab({
  electionId,
  token,
}: {
  electionId: string;
  token: string;
}) {
  const [blocks, setBlocks] = useState<BlockEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBlockchainData(token, electionId)
      .then(setBlocks)
      .catch((e) =>
        setError(
          e instanceof ApiError ? e.message : "Failed to load blockchain data.",
        ),
      )
      .finally(() => setLoading(false));
  }, [electionId, token]);

  if (loading)
    return (
      <div className="text-base-content/40 py-8 text-center">
        Loading blockchain…
      </div>
    );
  if (error) return <div className="text-error text-sm">{error}</div>;
  if (!blocks) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-base-content/60">
          {blocks.length.toLocaleString()} block{blocks.length !== 1 ? "s" : ""}
        </p>
        <DownloadButton
          label="Download chain (JSON)"
          data={blocks}
          filename={`election-${electionId}-blockchain.json`}
        />
      </div>
      {blocks.length === 0 ? (
        <p className="text-base-content/40 text-sm">
          No blocks found for this election on the chain-node.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-base-300">
          <table className="min-w-full divide-y divide-base-300 text-sm">
            <thead className="bg-base-200">
              <tr>
                {["#", "Timestamp", "Commitment", "Hash", "Prev Hash"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-2 text-left text-xs font-medium text-base-content/60 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-base-200 bg-base-100">
              {blocks.map((b) => (
                <tr key={b.index} className="hover:bg-base-200">
                  <td className="px-4 py-2 font-mono text-base-content/70">
                    {b.index}
                  </td>
                  <td className="px-4 py-2 text-base-content/70 whitespace-nowrap">
                    {new Date(b.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 font-mono text-base-content/70 truncate max-w-[120px]">
                    {b.data.commitment.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-2 font-mono text-base-content/70 truncate max-w-[120px]">
                    {b.hash.slice(0, 12)}…
                  </td>
                  <td className="px-4 py-2 font-mono text-base-content/70 truncate max-w-[120px]">
                    {b.prevHash.slice(0, 12)}…
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ElectionDetailPage() {
  const params = useParams<{ id: string }>();
  const electionId = params.id;
  const { token } = useAudit();

  const [election, setElection] = useState<AuditElection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    if (!token) return;
    getElection(token, electionId)
      .then((e) => {
        setElection(e);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError ? err.message : "Failed to load election.",
        );
      })
      .finally(() => setLoading(false));
  }, [token, electionId]);

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "results", label: "Results" },
    { key: "blockchain", label: "Blockchain" },
  ];

  return (
    <div className="min-h-screen bg-base-200">
      <main className="container mx-auto px-6 py-8">
        <Link
          href="/dashboard"
          className="mb-6 inline-block text-sm text-primary hover:underline"
        >
          ← Back to elections
        </Link>

        {loading && (
          <div className="text-center py-16 text-base-content/40">Loading…</div>
        )}
        {error && (
          <div className="rounded-md bg-error/10 border border-error/20 p-4 text-sm text-error">
            {error}
          </div>
        )}

        {!loading && !error && election && (
          <>
            <div className="mb-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-base-content">
                    {election.title}
                  </h1>
                  {election.description && (
                    <p className="mt-1 text-base-content/60">
                      {election.description}
                    </p>
                  )}
                </div>
                <ElectionStatusBadge status={election.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-base-content/60">
                <span>{election.totalVotes.toLocaleString()} total votes</span>
                {election.startTime && (
                  <span>
                    Started {new Date(election.startTime).toLocaleDateString()}
                  </span>
                )}
                {election.endTime && (
                  <span>
                    Ended {new Date(election.endTime).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-base-300 mb-6">
              <nav className="flex gap-6">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`pb-3 text-sm font-medium border-b-2 transition ${
                      tab === t.key
                        ? "border-primary text-primary"
                        : "border-transparent text-base-content/60 hover:text-base-content/80"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>
            </div>

            {tab === "overview" && (
              <div className="bg-base-100 rounded-lg border border-base-300 p-6">
                <dl className="grid grid-cols-2 gap-6 sm:grid-cols-3">
                  {[
                    { label: "Election ID", value: election.electionId },
                    {
                      label: "Status",
                      value: electionStatusLabel(election.status),
                    },
                    {
                      label: "Total Votes",
                      value: election.totalVotes.toLocaleString(),
                    },
                    {
                      label: "Start Time",
                      value: election.startTime
                        ? new Date(election.startTime).toLocaleString()
                        : "—",
                    },
                    {
                      label: "End Time",
                      value: election.endTime
                        ? new Date(election.endTime).toLocaleString()
                        : "—",
                    },
                  ].map((item) => (
                    <div key={item.label}>
                      <dt className="text-xs font-medium text-base-content/60 uppercase tracking-wide">
                        {item.label}
                      </dt>
                      <dd className="mt-1 text-sm text-base-content break-all">
                        {item.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {tab === "results" && token && (
              <ResultsTab electionId={electionId} token={token} />
            )}

            {tab === "blockchain" && token && (
              <BlockchainTab electionId={electionId} token={token} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
