"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@tora-chain/fe-common";
import {
  Alert,
  Badge,
  Button,
  Modal,
  Spinner,
} from "@tora-chain/ui-components";
import {
  ArrowLeft,
  CalendarArrowDown,
  CalendarArrowUp,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Fingerprint,
  ScanEye,
  ShieldCheck,
  Vote,
} from "lucide-react";
import {
  getElection,
  listCandidates,
  getVotersByEmail,
  getBallot,
  castVote,
  type Election,
  type Candidate,
  type Ballot,
  type CastResult,
  type BallotCandidate,
} from "@/app/api/elections";
import {
  getIntegration,
  checkEligibility,
  enrollVoter,
  type Integration,
  type FormField,
} from "@/app/api/integrations";
import { ApiError } from "@/app/api/errors";
import { sealBallot } from "@/app/lib/receipt";
import { VoteReceipt } from "@/app/components/vote-receipt";
import { formatDateTime, statusLabel, STATUS_TONE } from "../../lib/format";

// ---- Eligibility state machine ------------------------------------------

type EligibilityPhase =
  | "loading" // fetching voter status from backend
  | "admin_granted" // voter is already enrolled (admin-granted or prior self-enroll)
  | "not_eligible" // failed integration check or no eligibility
  | "no_integration" // no integration configured — admin-only enrollment
  | "idle" // integration loaded, voter hasn't checked yet
  | "checking" // calling /eligibility-check
  | "eligible" // check passed, awaiting enroll click
  | "enrolling" // calling /enroll
  | "enrolled"; // self-enrolled, can now vote

// ---- Page component -----------------------------------------------------

export default function ElectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [election, setElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [ballot, setBallot] = useState<Ballot | null>(null);
  const [voterId, setVoterId] = useState<string | null>(null);
  const [integration, setIntegration] = useState<Integration | null>(null);

  const [loadingMain, setLoadingMain] = useState(true);
  const [electionError, setElectionError] = useState<string | null>(null);

  const [eligibilityPhase, setEligibilityPhase] =
    useState<EligibilityPhase>("loading");
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const [notEligibleReason, setNotEligibleReason] = useState<string | null>(
    null,
  );

  // Form field values keyed by field id.
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [voting, setVoting] = useState(false);
  const [voteResult, setVoteResult] = useState<CastResult | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [receiptString, setReceiptString] = useState<string | null>(null);

  // Track whether we've already kicked off the ballot/eligibility lookup so
  // the effect that depends on `election` + `user` doesn't re-run on every render.
  const lookupStarted = useRef(false);

  const loadMain = useCallback(
    (signal?: AbortSignal) => {
      lookupStarted.current = false;
      Promise.resolve()
        .then(() => {
          setLoadingMain(true);
          setElectionError(null);
          return Promise.all([
            getElection(id, signal),
            listCandidates(id, { limit: 100 }, signal),
            getIntegration(id, signal),
          ]);
        })
        .then(([el, cands, intg]) => {
          setElection(el);
          setCandidates(cands.data);
          setIntegration(intg);
          setLoadingMain(false);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setElectionError(
            err instanceof Error ? err.message : "Failed to load election.",
          );
          setLoadingMain(false);
        });
    },
    [id],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadMain(controller.signal);
    return () => controller.abort();
  }, [loadMain]);

  // After election + user are known, determine the voter's current eligibility state.
  useEffect(() => {
    if (!election || !user || election.status === "draft") return;
    if (lookupStarted.current) return;
    lookupStarted.current = true;

    const controller = new AbortController();

    setEligibilityPhase("loading");
    setEligibilityError(null);

    getVotersByEmail(id, user.email, controller.signal)
      .then((envelope) => {
        const match = envelope.data.find((v) => v.accountId === user.id);
        if (!match) {
          // Voter is not yet enrolled. Choose phase based on integration presence.
          setEligibilityPhase(integration ? "idle" : "no_integration");
          return null;
        }
        // Already enrolled — fetch the ballot.
        setVoterId(match.voterId);
        setEligibilityPhase("admin_granted");
        return getBallot(id, match.voterId, controller.signal);
      })
      .then((b) => {
        if (b) setBallot(b);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (err instanceof ApiError && err.status === 403) {
          setEligibilityPhase(integration ? "idle" : "no_integration");
        } else {
          setEligibilityError(
            err instanceof Error ? err.message : "Failed to load voter status.",
          );
          setEligibilityPhase("idle");
        }
      });

    return () => controller.abort();
  }, [election, user, id, integration]);

  const handleCheck = useCallback(async () => {
    if (!user || !integration) return;
    setEligibilityPhase("checking");
    setEligibilityError(null);
    try {
      const result = await checkEligibility(id, user.id, fieldValues);
      setNotEligibleReason(result.eligible ? null : (result.reason ?? null));
      setEligibilityPhase(result.eligible ? "eligible" : "not_eligible");
    } catch (err: unknown) {
      setEligibilityError(
        err instanceof ApiError
          ? err.message
          : "Eligibility check failed. Please try again.",
      );
      setEligibilityPhase("idle");
    }
  }, [id, user, integration, fieldValues]);

  const handleEnroll = useCallback(async () => {
    if (!user || !integration) return;
    setEligibilityPhase("enrolling");
    setEligibilityError(null);
    try {
      const eligibility = await enrollVoter(
        id,
        user.id,
        user.email,
        fieldValues,
      );
      setVoterId(eligibility.voterId);
      setEligibilityPhase("enrolled");
      // Fetch the ballot now that the voter is enrolled.
      const b = await getBallot(id, eligibility.voterId);
      setBallot(b);
    } catch (err: unknown) {
      setEligibilityError(
        err instanceof ApiError
          ? err.message
          : "Enrollment failed. Please try again.",
      );
      setEligibilityPhase("eligible");
    }
  }, [id, user, integration, fieldValues]);

  const handleCastVote = useCallback(async () => {
    if (!voterId || !selectedId || !ballot) return;
    setVoting(true);
    setVoteError(null);
    try {
      const candidateName =
        ballot.candidates.find((c) => c.candidateId === selectedId)?.fullName ??
        "";

      // Seal the ballot client-side: a fresh AES key encrypts the vote record;
      // only its SHA-256 commitment leaves for the chain, and the key rides in
      // the receipt the voter keeps — making them the sole later verifier.
      const sealed = await sealBallot({
        electionId: id,
        voterId,
        votingNumber: ballot.voter.votingNumber,
        candidateId: selectedId,
        candidateName,
        castTime: new Date().toISOString(),
      });

      const result = await castVote(id, voterId, {
        candidateId: selectedId,
        ciphertext: sealed.ciphertext,
        commitment: sealed.commitment,
      });
      setVoteResult(result);
      setReceiptString(sealed.receiptString);
      setConfirmOpen(false);
      const updated = await getBallot(id, voterId);
      setBallot(updated);
    } catch (err: unknown) {
      setVoteError(err instanceof Error ? err.message : "Failed to cast vote.");
    } finally {
      setVoting(false);
    }
  }, [id, voterId, selectedId, ballot]);

  if (loadingMain) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (electionError || !election) {
    return (
      <div className="flex flex-col gap-4 py-6 px-4 max-w-3xl mx-auto w-full">
        <BackButton onClick={() => router.push("/elections")} />
        <Alert tone="error">
          <span>{electionError ?? "Election not found."}</span>
          <Button size="sm" variant="ghost" onClick={() => loadMain()}>
            Retry
          </Button>
        </Alert>
      </div>
    );
  }

  const isActive = election.status === "active";
  const isClosed =
    election.status === "ended" || election.status === "archived";
  const isEnrolled =
    eligibilityPhase === "admin_granted" || eligibilityPhase === "enrolled";
  const hasVoted = ballot?.voter.hasVoted ?? false;
  const canVote =
    isActive && !hasVoted && isEnrolled && !voteResult && ballot !== null;

  const displayCandidates: BallotCandidate[] =
    ballot?.candidates ??
    candidates.map((c) => ({
      candidateId: c.candidateId,
      candidateNumber: "",
      fullName: c.fullName,
    }));

  const showTallies =
    isClosed && ballot?.candidates.some((c) => c.votes !== undefined);

  const selectedName = displayCandidates.find(
    (c) => c.candidateId === selectedId,
  )?.fullName;

  return (
    <div className="flex flex-col gap-6 py-6 px-4 max-w-3xl mx-auto w-full">
      <BackButton onClick={() => router.push("/elections")} />

      {/* Election header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="text-2xl font-bold leading-snug">{election.title}</h1>
          <Badge
            tone={STATUS_TONE[election.status]}
            outline
            className="shrink-0 whitespace-nowrap"
          >
            {statusLabel(election.status)}
          </Badge>
        </div>
        {election.description && (
          <p className="text-base-content/70">{election.description}</p>
        )}
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-base-content/60">
          <div className="flex items-center gap-1.5">
            <CalendarArrowUp className="size-4 text-success shrink-0" />
            <dt className="sr-only">Starts</dt>
            <dd>
              {election.startTime
                ? formatDateTime(election.startTime)
                : "Start time not set"}
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarArrowDown className="size-4 text-error shrink-0" />
            <dt className="sr-only">Ends</dt>
            <dd>
              {election.endTime
                ? formatDateTime(election.endTime)
                : "End time not set"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="divider my-0" />

      {/* Eligibility section (only shown when election is not draft) */}
      {election.status !== "draft" && user && (
        <EligibilitySection
          phase={eligibilityPhase}
          error={eligibilityError}
          notEligibleReason={notEligibleReason}
          integration={integration}
          fieldValues={fieldValues}
          onFieldChange={(id, value) =>
            setFieldValues((prev) => ({ ...prev, [id]: value }))
          }
          onCheck={handleCheck}
          onEnroll={handleEnroll}
        />
      )}

      <div className="divider my-0" />

      {/* Candidates */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Candidates</h2>

        {eligibilityPhase === "loading" ? (
          <div className="flex justify-center py-10">
            <Spinner size="md" />
          </div>
        ) : (
          <>
            {(voteResult || hasVoted) && (
              <Alert tone="success" className="flex items-center gap-2">
                <CheckCircle2 className="size-5 shrink-0" />
                <span>
                  Your vote has been cast. Voting number:{" "}
                  <strong>
                    {voteResult?.votingNumber ?? ballot?.voter.votingNumber}
                  </strong>
                </span>
              </Alert>
            )}

            {receiptString && voteResult && (
              <VoteReceipt
                receiptString={receiptString}
                votingNumber={voteResult.votingNumber}
              />
            )}

            {(voteResult || hasVoted) && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => router.push("/verify")}
                  className="gap-1"
                >
                  <ShieldCheck className="size-4" />
                  Verify a vote
                </Button>
              </div>
            )}

            {displayCandidates.length === 0 ? (
              <p className="text-sm italic text-base-content/50">
                No candidates have been added to this election yet.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {displayCandidates.map((c) => {
                  const isSelected = selectedId === c.candidateId;
                  const fullInfo = candidates.find(
                    (fc) => fc.candidateId === c.candidateId,
                  );
                  return (
                    <CandidateCard
                      key={c.candidateId}
                      candidate={c}
                      manifesto={fullInfo?.manifesto ?? null}
                      selectable={canVote}
                      selected={isSelected}
                      votes={showTallies ? c.votes : undefined}
                      onSelect={() => canVote && setSelectedId(c.candidateId)}
                    />
                  );
                })}
              </div>
            )}

            {canVote && (
              <div className="flex justify-end pt-2">
                <Button
                  disabled={!selectedId}
                  onClick={() => setConfirmOpen(true)}
                  className="gap-1"
                >
                  <Vote className="size-4" />
                  Cast vote
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Confirmation modal */}
      <Modal
        open={confirmOpen}
        onClose={() => !voting && setConfirmOpen(false)}
        title="Confirm your vote"
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={voting}
            >
              Cancel
            </Button>
            <Button onClick={handleCastVote} loading={voting}>
              Confirm
            </Button>
          </>
        }
      >
        {voteError && (
          <Alert tone="error" className="mb-4">
            {voteError}
          </Alert>
        )}
        <p>
          You are about to vote for{" "}
          <strong>{selectedName ?? "this candidate"}</strong>. This action
          cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

// ---- Eligibility section -------------------------------------------------

interface EligibilitySectionProps {
  phase: EligibilityPhase;
  error: string | null;
  notEligibleReason: string | null;
  integration: Integration | null;
  fieldValues: Record<string, string>;
  onFieldChange: (fieldId: string, value: string) => void;
  onCheck: () => void;
  onEnroll: () => void;
}

function EligibilitySection({
  phase,
  error,
  notEligibleReason,
  integration,
  fieldValues,
  onFieldChange,
  onCheck,
  onEnroll,
}: EligibilitySectionProps) {
  if (phase === "loading") return null;

  // Voter is already enrolled — show a subtle confirmation, not a big form.
  if (phase === "admin_granted" || phase === "enrolled") {
    return (
      <div className="flex items-center gap-2 text-sm text-success">
        <CheckCircle2 className="size-4 shrink-0" />
        <span>You are enrolled in this election.</span>
      </div>
    );
  }

  if (phase === "no_integration") {
    return (
      <Alert tone="warning">
        Eligibility for this election is managed by an administrator. Contact
        the election organiser if you believe you should be eligible.
      </Alert>
    );
  }

  if (!integration) return null;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="size-5 text-primary shrink-0" />
        <h2 className="text-lg font-semibold">Eligibility Check</h2>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {phase === "not_eligible" && (
        <Alert tone="error">
          <span>
            You are not eligible to vote in this election based on the
            information provided.
            {notEligibleReason && (
              <span className="block text-sm mt-1 opacity-80">
                Reason: {notEligibleReason}
              </span>
            )}
          </span>
        </Alert>
      )}

      {phase === "eligible" && (
        <Alert tone="success">
          You are eligible for this election! Click <strong>Enroll</strong> to
          register your participation.
        </Alert>
      )}

      {(phase === "idle" ||
        phase === "not_eligible" ||
        phase === "checking") && (
        <EligibilityForm
          fields={integration.formFields}
          values={fieldValues}
          onChange={onFieldChange}
          onSubmit={onCheck}
          loading={phase === "checking"}
        />
      )}

      {phase === "eligible" && (
        <div className="flex justify-end">
          <Button onClick={onEnroll} className="gap-1">
            <CheckCircle2 className="size-4" />
            Enroll in election
          </Button>
        </div>
      )}

      {phase === "enrolling" && (
        <div className="flex items-center gap-2 text-sm text-base-content/60">
          <Spinner size="sm" />
          Enrolling…
        </div>
      )}
    </section>
  );
}

// ---- Eligibility form ---------------------------------------------------

interface EligibilityFormProps {
  fields: FormField[];
  values: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

function EligibilityForm({
  fields,
  values,
  onChange,
  onSubmit,
  loading,
}: EligibilityFormProps) {
  if (fields.length === 0) {
    return (
      <div className="flex justify-end">
        <Button onClick={onSubmit} loading={loading} className="gap-1">
          <ClipboardCheck className="size-4" />
          Check eligibility
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-base-content/60">
        Fill in the fields below to verify your eligibility.
      </p>
      <p className="text-sm text-base-content/60 italic">
        These information are not saved by Tora-Chain, they are only used for
        validation.
      </p>
      {fields.map((field) =>
        field.type === "fingerprint" || field.type === "eyes" ? (
          <BiometricField
            key={field.id}
            field={field}
            kind={field.type}
            value={values[field.id] ?? ""}
            onChange={onChange}
            disabled={loading}
          />
        ) : (
          <div key={field.id} className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              {field.label}
              {field.description && (
                <span className="text-xs text-base-content/50 ml-1.5 font-normal">
                  — {field.description}
                </span>
              )}
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder={field.label}
              value={values[field.id] ?? ""}
              onChange={(e) => onChange(field.id, e.target.value)}
              disabled={loading}
            />
          </div>
        ),
      )}
      <div className="flex justify-end">
        <Button onClick={onSubmit} loading={loading} className="gap-1">
          <ClipboardCheck className="size-4" />
          Check eligibility
        </Button>
      </div>
    </div>
  );
}

// ---- Biometric capture (demo) ---------------------------------------------
//
// Demo-only widget for "fingerprint" / "eyes" form fields. The camera preview
// is fake and captures nothing; "scanning" simply fills the field with a
// hardcoded demo value that the example voters database recognises
// (see examples/simple-voters-database).

const DEMO_SCAN_VALUES: Record<"fingerprint" | "eyes", string> = {
  fingerprint: "demo-fingerprint-scan-001",
  eyes: "demo-eyes-scan-001",
};

interface BiometricFieldProps {
  field: FormField;
  kind: "fingerprint" | "eyes";
  value: string;
  onChange: (fieldId: string, value: string) => void;
  disabled: boolean;
}

function BiometricField({
  field,
  kind,
  value,
  onChange,
  disabled,
}: BiometricFieldProps) {
  const [scanning, setScanning] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const captured = value !== "";
  const Icon = kind === "fingerprint" ? Fingerprint : ScanEye;

  const handleScan = () => {
    setScanning(true);
    timer.current = setTimeout(() => {
      onChange(field.id, DEMO_SCAN_VALUES[kind]);
      setScanning(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium">
        {field.label}
        {field.description && (
          <span className="text-xs text-base-content/50 ml-1.5 font-normal">
            — {field.description}
          </span>
        )}
      </label>
      <div className="border border-base-300 p-4 flex flex-col sm:flex-row gap-4">
        {/* Illustration */}
        <div className="flex items-center justify-center size-24 shrink-0 bg-base-200 self-center sm:self-auto">
          <Icon
            className={[
              "size-12",
              captured ? "text-success" : "text-base-content/40",
            ].join(" ")}
          />
        </div>

        {/* Fake camera preview — intentionally does nothing */}
        <div className="relative flex-1 min-h-28 bg-neutral flex flex-col items-center justify-center gap-1 overflow-hidden">
          <Camera className="size-6 text-neutral-content/50" />
          <span className="text-xs text-neutral-content/50">
            {scanning
              ? kind === "fingerprint"
                ? "Scanning fingerprint…"
                : "Scanning eyes…"
              : "Camera preview (demo)"}
          </span>
          {scanning && (
            <div className="absolute inset-x-0 top-1/2 h-0.5 bg-primary animate-pulse" />
          )}
        </div>

        {/* Action / status */}
        <div className="flex flex-col items-stretch justify-center gap-2 sm:w-44">
          {captured && (
            <span className="flex items-center gap-1.5 text-sm text-success">
              <CheckCircle2 className="size-4 shrink-0" />
              {kind === "fingerprint"
                ? "Fingerprint captured"
                : "Eye scan captured"}
            </span>
          )}
          <Button
            size="sm"
            variant={captured ? "ghost" : undefined}
            onClick={handleScan}
            loading={scanning}
            disabled={disabled}
          >
            {captured
              ? "Rescan"
              : kind === "fingerprint"
                ? "Scan fingerprint"
                : "Scan eyes"}
          </Button>
          <p className="text-xs text-base-content/40">
            Demo only — nothing is really captured.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---- Sub-components ------------------------------------------------------

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="flex items-center gap-1 text-sm text-base-content/60 hover:text-base-content transition-colors self-start cursor-pointer"
      onClick={onClick}
    >
      <ArrowLeft className="size-4" />
      All elections
    </button>
  );
}

interface CandidateCardProps {
  candidate: BallotCandidate;
  manifesto: string | null;
  selectable: boolean;
  selected: boolean;
  votes?: number;
  onSelect: () => void;
}

function CandidateCard({
  candidate,
  manifesto,
  selectable,
  selected,
  votes,
  onSelect,
}: CandidateCardProps) {
  return (
    <div
      role={selectable ? "button" : undefined}
      tabIndex={selectable ? 0 : undefined}
      aria-pressed={selectable ? selected : undefined}
      className={[
        "border p-4 flex items-start gap-3 transition-colors",
        selectable
          ? selected
            ? "border-primary bg-primary/5 cursor-pointer"
            : "border-base-300 cursor-pointer hover:border-primary/40"
          : "border-base-200",
      ].join(" ")}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect()}
    >
      {selectable && (
        <input
          type="radio"
          className="radio radio-primary mt-0.5 shrink-0"
          checked={selected}
          onChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold">{candidate.fullName}</span>
          {votes !== undefined && (
            <span className="badge badge-neutral badge-sm shrink-0">
              {votes} {votes === 1 ? "vote" : "votes"}
            </span>
          )}
        </div>
        {manifesto && (
          <p className="text-sm text-base-content/60 mt-1">{manifesto}</p>
        )}
      </div>
    </div>
  );
}
