import { CheckCircle2, Database, KeyRound, XCircle, Zap } from "lucide-react";
import { getAllCheckLog, getAllVoters } from "../db";
import type { CheckLogEntry, Voter } from "../db";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const voters = getAllVoters();
  const log = getAllCheckLog();
  const apiKey = process.env.ELIGIBILITY_API_KEY ?? "test-api-key-dev-only";

  const eligibleCount = log.filter((e) => e.eligible).length;
  const notEligibleCount = log.filter((e) => !e.eligible).length;

  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Simple Voters Database</h1>
        <p className="text-base-content/60 text-sm">
          Development reference implementation of the ToraChain eligibility API.
        </p>
      </div>

      {/* Dev warning */}
      <div role="alert" className="alert alert-warning">
        <span>
          <strong>Development use only.</strong> This app stores synthetic test
          data and exposes an eligibility API for local integration testing.
          Never connect it to a production election or use real voter data.
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={<Database className="size-5 text-primary" />}
          label="Registered voters"
          value={voters.length}
        />
        <StatCard
          icon={<Zap className="size-5 text-info" />}
          label="Total checks"
          value={log.length}
        />
        <StatCard
          icon={<CheckCircle2 className="size-5 text-success" />}
          label="Eligible"
          value={eligibleCount}
        />
        <StatCard
          icon={<XCircle className="size-5 text-error" />}
          label="Not eligible"
          value={notEligibleCount}
        />
      </div>

      {/* API reference */}
      <div className="bg-base-100 border border-base-300 p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <KeyRound className="size-5 text-primary shrink-0" />
          <h2 className="text-base font-semibold">API Reference</h2>
        </div>

        <table className="table table-sm">
          <tbody>
            <ApiRow
              label="Endpoint"
              value={
                <code className="font-mono text-sm">POST /api/verify</code>
              }
            />
            <ApiRow
              label="API key header"
              value={<code className="font-mono text-sm">x-api-key</code>}
            />
            <ApiRow
              label="API key value"
              value={
                <code className="font-mono text-sm bg-base-200 px-2 py-0.5 rounded">
                  {apiKey}
                </code>
              }
            />
            <ApiRow
              label="On success"
              value={
                <code className="font-mono text-sm text-success">
                  {'200 { "id": "<voter-uuid>" }'}
                </code>
              }
            />
            <ApiRow
              label="On failure"
              value={
                <code className="font-mono text-sm text-error">
                  {'400 { "message": "..." }'}
                </code>
              }
            />
          </tbody>
        </table>

        <div className="border-t border-base-200 pt-4 flex flex-col gap-2">
          <p className="text-sm text-base-content/60 font-medium">
            Form fields to configure in the admin integration:
          </p>
          <div className="flex flex-wrap gap-2">
            <FieldBadge id="email" label="Email Address" />
            <FieldBadge id="national-id" label="National ID" />
          </div>
        </div>
      </div>

      {/* Voters table */}
      <VotersCard voters={voters} />

      {/* Check log */}
      <CheckLogCard log={log} />
    </div>
  );
}

// ---- Section: Voters -----------------------------------------------------

function VotersCard({ voters }: { voters: Voter[] }) {
  return (
    <div className="bg-base-100 border border-base-300 p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="size-5 text-primary shrink-0" />
          <h2 className="text-base font-semibold">Registered Voters</h2>
        </div>
        <span className="badge badge-neutral">{voters.length} total</span>
      </div>

      {voters.length === 0 ? (
        <div className="py-10 text-center text-sm text-base-content/40 italic">
          No voters yet. Run{" "}
          <code className="font-mono bg-base-200 px-1 rounded">
            bun run seed
          </code>{" "}
          to populate example data.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Email</th>
                <th>National ID</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {voters.map((v) => (
                <tr key={v.id} className="hover">
                  <td>
                    <code className="font-mono text-xs text-base-content/50">
                      {v.id}
                    </code>
                  </td>
                  <td>{v.email}</td>
                  <td>
                    <code className="font-mono text-sm">{v.national_id}</code>
                  </td>
                  <td className="text-base-content/50 text-xs">
                    {formatDate(v.created_at)}
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

// ---- Section: Check log --------------------------------------------------

function CheckLogCard({ log }: { log: CheckLogEntry[] }) {
  return (
    <div className="bg-base-100 border border-base-300 p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="size-5 text-primary shrink-0" />
          <h2 className="text-base font-semibold">Recent Eligibility Checks</h2>
        </div>
        <span className="badge badge-neutral">last 200</span>
      </div>

      {log.length === 0 ? (
        <div className="py-10 text-center text-sm text-base-content/40 italic">
          No checks recorded yet. Configure this app as an integration in the
          admin frontend and trigger a check from the voting frontend.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Result</th>
                <th>Reason</th>
                <th>Email</th>
                <th>National ID</th>
                <th>Election ID</th>
                <th>Checked</th>
              </tr>
            </thead>
            <tbody>
              {log.map((entry) => (
                <tr key={entry.id} className="hover">
                  <td>
                    {entry.eligible ? (
                      <span className="flex items-center gap-1.5 text-success font-semibold text-sm">
                        <CheckCircle2 className="size-4 shrink-0" />
                        Eligible
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-error font-semibold text-sm">
                        <XCircle className="size-4 shrink-0" />
                        Not eligible
                      </span>
                    )}
                  </td>
                  <td className="text-sm text-base-content/70">
                    {entry.reason || "—"}
                  </td>
                  <td>{entry.email}</td>
                  <td>
                    <code className="font-mono text-sm">
                      {entry.national_id}
                    </code>
                  </td>
                  <td>
                    <code className="font-mono text-xs text-base-content/40">
                      {entry.election_id || "—"}
                    </code>
                  </td>
                  <td className="text-base-content/50 text-xs">
                    {formatDate(entry.checked_at)}
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

// ---- Shared sub-components -----------------------------------------------

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-base-100 border border-base-300 p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-base-content/60 text-xs font-semibold uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <span className="text-3xl font-bold">{value}</span>
    </div>
  );
}

function ApiRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr>
      <td className="text-base-content/50 font-medium w-36">{label}</td>
      <td>{value}</td>
    </tr>
  );
}

function FieldBadge({ id, label }: { id: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-base-200 px-3 py-1.5 rounded text-sm">
      <code className="font-mono text-primary text-xs">{id}</code>
      <span className="text-base-content/50">—</span>
      <span>{label}</span>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
