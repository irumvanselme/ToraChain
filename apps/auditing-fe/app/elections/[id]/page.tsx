"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAudit } from "../../lib/audit-context";
import {
  getElection,
  getElectionResults,
  getBlockchainData,
  type AuditElection,
  type ElectionResults,
  type BlockEntry,
} from "../../lib/elections";
import { ApiError } from "../../lib/api";

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
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition"
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

  if (loading) return <div className="text-gray-400 py-8 text-center">Loading results…</div>;
  if (error) return <div className="text-red-600 text-sm">{error}</div>;
  if (!results) return null;

  const maxVotes = Math.max(...results.candidates.map((c) => c.voteCount), 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
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
                <span className="font-medium text-gray-900">{c.fullName}</span>
                <span className="text-gray-500">
                  {c.voteCount.toLocaleString()} votes (
                  {results.totalVotes > 0
                    ? Math.round((c.voteCount / results.totalVotes) * 100)
                    : 0}
                  %)
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all"
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

  if (loading) return <div className="text-gray-400 py-8 text-center">Loading blockchain…</div>;
  if (error) return <div className="text-red-600 text-sm">{error}</div>;
  if (!blocks) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {blocks.length.toLocaleString()} block{blocks.length !== 1 ? "s" : ""}
        </p>
        <DownloadButton
          label="Download chain (JSON)"
          data={blocks}
          filename={`election-${electionId}-blockchain.json`}
        />
      </div>
      {blocks.length === 0 ? (
        <p className="text-gray-400 text-sm">
          No blocks found for this election on the chain-node.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["#", "Timestamp", "Candidate ID", "Hash", "Prev Hash"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {blocks.map((b) => (
                <tr key={b.blockIndex} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-gray-600">
                    {b.blockIndex}
                  </td>
                  <td className="px-4 py-2 text-gray-600 whitespace-nowrap">
                    {new Date(b.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 font-mono text-gray-600 truncate max-w-[120px]">
                    {b.candidateId.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-2 font-mono text-gray-600 truncate max-w-[120px]">
                    {b.hash.slice(0, 12)}…
                  </td>
                  <td className="px-4 py-2 font-mono text-gray-600 truncate max-w-[120px]">
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

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const e = await getElection(token, electionId);
      setElection(e);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load election.",
      );
    } finally {
      setLoading(false);
    }
  }, [token, electionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "results", label: "Results" },
    { key: "blockchain", label: "Blockchain" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/dashboard"
            className="text-sm text-indigo-600 hover:underline"
          >
            ← Back to elections
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {loading && (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        )}
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && election && (
          <>
            <div className="mb-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {election.title}
                  </h1>
                  {election.description && (
                    <p className="mt-1 text-gray-500">{election.description}</p>
                  )}
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-sm font-medium bg-gray-100 text-gray-700 capitalize whitespace-nowrap">
                  {election.status}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
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
            <div className="border-b border-gray-200 mb-6">
              <nav className="flex gap-6">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`pb-3 text-sm font-medium border-b-2 transition ${
                      tab === t.key
                        ? "border-indigo-600 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>
            </div>

            {tab === "overview" && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <dl className="grid grid-cols-2 gap-6 sm:grid-cols-3">
                  {[
                    { label: "Election ID", value: election.electionId },
                    { label: "Status", value: election.status },
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
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {item.label}
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 break-all">
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
