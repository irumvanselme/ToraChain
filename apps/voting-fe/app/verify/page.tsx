"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Spinner } from "@tora-chain/ui-components";
import { ArrowLeft, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";

import { verifyVote } from "@/app/api/elections";
import { checkOnChain } from "@/app/api/chain";
import { ApiError } from "@/app/api/errors";
import {
  openBallot,
  parseReceipt,
  sha256Hex,
  type BallotRecord,
} from "@/app/lib/receipt";

type CheckStatus = "pass" | "fail" | "warn";

interface CheckLine {
  status: CheckStatus;
  label: string;
  detail?: string;
}

interface VerifyReport {
  candidateName: string;
  votingNumber: string;
  castAt: string;
  checks: CheckLine[];
  overall: CheckStatus;
}

export default function VerifyPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<VerifyReport | null>(null);

  const handleVerify = useCallback(async () => {
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      const receipt = parseReceipt(input);

      // 1. Ask the backend for the stored side of this exact ballot. The vote
      //    id in the receipt is the only handle that reaches it — the backend
      //    stores no link from a voter to their vote, by design.
      const stored = await verifyVote(receipt.voteId);

      if (!stored.ciphertext || !stored.commitment) {
        setError(
          "This vote was recorded without an encrypted receipt, so it cannot be cryptographically verified.",
        );
        return;
      }

      const checks: CheckLine[] = [];

      // 2. The stored commitment must be an honest SHA-256 of the stored
      //    ciphertext — that is the value anchored on-chain in step 4.
      const recomputed = await sha256Hex(stored.ciphertext);
      const commitmentConsistent = recomputed === stored.commitment;
      checks.push({
        status: commitmentConsistent ? "pass" : "fail",
        label: "Commitment matches the stored encrypted ballot",
        detail: commitmentConsistent
          ? undefined
          : "The server's stored commitment is not a hash of the ciphertext it returned.",
      });

      // 3. Decrypt the stored ciphertext with the receipt key and confirm the
      //    candidate it names is exactly the one the backend counted. AES-GCM
      //    is authenticated, so a successful decrypt also proves this is the
      //    very ciphertext this browser sealed — nothing was swapped.
      let record: BallotRecord | null = null;
      try {
        record = await openBallot(stored.ciphertext, receipt.key);
      } catch (err) {
        checks.push({
          status: "fail",
          label: "Encrypted ballot could not be opened with your receipt",
          detail: err instanceof Error ? err.message : undefined,
        });
      }

      let candidateName = "Unknown";
      if (record) {
        candidateName = record.candidateName || record.candidateId;
        const candidateMatch = record.candidateId === stored.countedCandidateId;
        checks.push({
          status: candidateMatch ? "pass" : "fail",
          label: "Counted candidate matches your encrypted choice",
          detail: candidateMatch
            ? `Your ballot and the tally both record: ${candidateName}`
            : "The candidate the backend counted differs from the one inside your encrypted ballot.",
        });

        // The ballot must be the one recorded against the election the server
        // filed it under.
        const electionMatch = record.electionId === stored.electionId;
        checks.push({
          status: electionMatch ? "pass" : "fail",
          label: "Ballot belongs to the election it was recorded under",
          detail: electionMatch
            ? undefined
            : "The election inside your encrypted ballot differs from the one holding this vote.",
        });
      }

      // 4. Independently cross-check the commitment on the blockchain node.
      //    The voting number comes out of the decrypted ballot: only the
      //    receipt holder can produce it, and the server no longer stores it
      //    next to the vote.
      const onChain = record
        ? await checkOnChain(
            record.electionId,
            record.votingNumber,
            stored.commitment,
          )
        : ({
            status: "unreachable",
            error: "Ballot could not be opened.",
          } as const);
      if (onChain.status === "match") {
        checks.push({
          status: "pass",
          label: "Commitment is anchored on the blockchain",
        });
      } else if (onChain.status === "mismatch") {
        checks.push({
          status: "fail",
          label: "Blockchain anchors a different commitment",
          detail:
            "The commitment on the blockchain does not match your receipt.",
        });
      } else if (onChain.status === "absent") {
        checks.push({
          status: "warn",
          label: "No matching block found on the blockchain yet",
          detail:
            "The vote may still be propagating to the chain, or the node has not synced.",
        });
      } else {
        checks.push({
          status: "warn",
          label: "Blockchain node could not be reached",
          detail: onChain.error,
        });
      }

      const overall: CheckStatus = checks.some((c) => c.status === "fail")
        ? "fail"
        : checks.some((c) => c.status === "warn")
          ? "warn"
          : "pass";

      setReport({
        candidateName,
        // Recovered from the ballot the receipt just decrypted.
        votingNumber: record?.votingNumber ?? "—",
        castAt: stored.castAt,
        checks,
        overall,
      });
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Sign in as a voter to verify a receipt.");
      } else if (err instanceof ApiError && err.status === 404) {
        setError("No vote was found for this receipt.");
      } else {
        setError(err instanceof Error ? err.message : "Verification failed.");
      }
    } finally {
      setBusy(false);
    }
  }, [input]);

  return (
    <div className="flex flex-col gap-6 py-6 px-4 max-w-3xl mx-auto w-full">
      <button
        type="button"
        className="flex items-center gap-1 text-sm text-base-content/60 hover:text-base-content transition-colors self-start cursor-pointer"
        onClick={() => router.push("/elections")}
      >
        <ArrowLeft className="size-4" />
        All elections
      </button>

      <div className="flex items-center gap-2">
        <ShieldCheck className="size-6 text-primary shrink-0" />
        <h1 className="text-2xl font-bold">Verify your vote</h1>
      </div>

      <p className="text-base-content/70">
        Paste the receipt you saved when you voted. Verification happens in your
        browser: your receipt key decrypts the stored ballot, and the result is
        cross-checked against both the backend tally and the blockchain — nobody
        else can do this on your behalf.
      </p>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="receipt">
          Vote receipt
        </label>
        <textarea
          id="receipt"
          className="textarea textarea-bordered w-full font-mono text-xs h-32"
          placeholder="Paste your saved receipt string here…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="flex justify-end">
          <Button
            onClick={handleVerify}
            loading={busy}
            disabled={!input.trim()}
            className="gap-1"
          >
            <ShieldCheck className="size-4" />
            Verify vote
          </Button>
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {busy && !report && (
        <div className="flex justify-center py-6">
          <Spinner size="md" />
        </div>
      )}

      {report && <VerificationReport report={report} />}
    </div>
  );
}

function VerificationReport({ report }: { report: VerifyReport }) {
  const tone =
    report.overall === "pass"
      ? "success"
      : report.overall === "warn"
        ? "warning"
        : "error";
  const heading =
    report.overall === "pass"
      ? "Your vote is verified"
      : report.overall === "warn"
        ? "Your vote is verified, with warnings"
        : "Verification failed";

  return (
    <div className="flex flex-col gap-4">
      <Alert tone={tone} className="flex items-center gap-2">
        {report.overall === "fail" ? (
          <XCircle className="size-5 shrink-0" />
        ) : (
          <CheckCircle2 className="size-5 shrink-0" />
        )}
        <span className="font-semibold">{heading}</span>
      </Alert>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-base-content/60">Candidate</dt>
        <dd className="font-medium">{report.candidateName}</dd>
        <dt className="text-base-content/60">Voting number</dt>
        <dd className="font-mono">{report.votingNumber}</dd>
        <dt className="text-base-content/60">Recorded at</dt>
        <dd>{new Date(report.castAt).toLocaleString()}</dd>
      </dl>

      <ul className="flex flex-col gap-2">
        {report.checks.map((c, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            {c.status === "pass" ? (
              <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />
            ) : c.status === "warn" ? (
              <ShieldCheck className="size-4 text-warning shrink-0 mt-0.5" />
            ) : (
              <XCircle className="size-4 text-error shrink-0 mt-0.5" />
            )}
            <div>
              <span>{c.label}</span>
              {c.detail && (
                <span className="block text-xs text-base-content/60">
                  {c.detail}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
