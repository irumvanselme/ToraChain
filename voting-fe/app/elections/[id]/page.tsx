"use client";

import { use, useCallback, useEffect, useState } from "react";
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
  CheckCircle2,
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
} from "../../lib/elections";
import { ApiError } from "../../lib/api";
import { formatDateTime, statusLabel, STATUS_TONE } from "../../lib/format";

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

  const [loadingMain, setLoadingMain] = useState(true);
  const [loadingBallot, setLoadingBallot] = useState(false);
  const [electionError, setElectionError] = useState<string | null>(null);
  const [ballotError, setBallotError] = useState<string | null>(null);
  const [notEligible, setNotEligible] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [voting, setVoting] = useState(false);
  const [voteResult, setVoteResult] = useState<CastResult | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);

  const loadMain = useCallback(
    (signal?: AbortSignal) => {
      Promise.resolve()
        .then(() => {
          setLoadingMain(true);
          setElectionError(null);
          return Promise.all([
            getElection(id, signal),
            listCandidates(id, { limit: 100 }, signal),
          ]);
        })
        .then(([el, cands]) => {
          setElection(el);
          setCandidates(cands.data);
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

  useEffect(() => {
    if (!election || !user || election.status === "draft") return;

    const controller = new AbortController();

    Promise.resolve()
      .then(() => {
        setLoadingBallot(true);
        setBallotError(null);
        setNotEligible(false);
        return getVotersByEmail(id, user.email, controller.signal);
      })
      .then((envelope) => {
        const match = envelope.data.find((v) => v.accountId === user.id);
        if (!match) {
          setNotEligible(true);
          setLoadingBallot(false);
          return null;
        }
        setVoterId(match.voterId);
        return getBallot(id, match.voterId, controller.signal);
      })
      .then((b) => {
        if (b) setBallot(b);
        setLoadingBallot(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (err instanceof ApiError && err.status === 403) {
          setNotEligible(true);
        } else {
          setBallotError(
            err instanceof Error ? err.message : "Failed to load ballot.",
          );
        }
        setLoadingBallot(false);
      });

    return () => controller.abort();
  }, [election, user, id]);

  const handleCastVote = useCallback(async () => {
    if (!voterId || !selectedId) return;
    setVoting(true);
    setVoteError(null);
    try {
      const result = await castVote(id, voterId, selectedId);
      setVoteResult(result);
      setConfirmOpen(false);
      const updated = await getBallot(id, voterId);
      setBallot(updated);
    } catch (err: unknown) {
      setVoteError(err instanceof Error ? err.message : "Failed to cast vote.");
    } finally {
      setVoting(false);
    }
  }, [id, voterId, selectedId]);

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
    election.status === "closed" || election.status === "archived";
  const hasVoted = ballot?.voter.hasVoted ?? false;
  const canVote =
    isActive && !hasVoted && !notEligible && !voteResult && ballot !== null;

  // Prefer ballot's candidate list (has vote tallies when closed).
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
          <Badge tone={STATUS_TONE[election.status]} outline>
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

      {/* Candidates */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Candidates</h2>

        {loadingBallot ? (
          <div className="flex justify-center py-10">
            <Spinner size="md" />
          </div>
        ) : (
          <>
            {/* Eligibility / vote status banners */}
            {ballotError && <Alert tone="error">{ballotError}</Alert>}
            {notEligible && (
              <Alert tone="warning">
                You are not eligible to vote in this election.
              </Alert>
            )}
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
