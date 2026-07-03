import { createHash } from "node:crypto";

import { AppError } from "../common/errors.ts";
import type { CandidatesRepository } from "../candidates/repository.ts";
import type { ElectionStatus } from "../elections/model.ts";
import type { ElectionsService } from "../elections/service.ts";
import { isWithinVotingWindow } from "../elections/utils.ts";
import type { VotersRepository } from "../voters/repository.ts";
import { buildBallotCandidates, type BallotCandidate } from "./utils.ts";
import type { VotesRepository } from "./repository.ts";
import {
  NullChainNodeClient,
  type ChainNodeClient,
} from "../chain-node/client.ts";

export interface BallotState {
  electionId: string;
  status: ElectionStatus;
  voter: { voterId: string; votingNumber: string; hasVoted: boolean };
  candidates: BallotCandidate[];
}

export interface CastBallotInput {
  candidateId: string;
  // Vote-verification receipt data, produced client-side. Optional so legacy /
  // non-encrypting clients keep working. When present they are stored and the
  // commitment (not the candidate) is anchored on-chain.
  ciphertext?: string;
  commitment?: string;
}

export interface CastBallotResult {
  accepted: true;
  votingNumber: string;
  castAt: string;
}

export interface VerifyResult {
  votingNumber: string;
  /** The candidate that was actually recorded/counted (plaintext). */
  countedCandidateId: string;
  /** The voter's encrypted ballot record; null for pre-verification votes. */
  ciphertext: string | null;
  commitment: string | null;
  castAt: string;
}

/** SHA-256 hex of a string, matching the client's commitment computation. */
function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export class VotesService {
  constructor(
    private readonly elections: ElectionsService,
    private readonly voters: VotersRepository,
    private readonly candidates: CandidatesRepository,
    private readonly votes: VotesRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly chainNode: ChainNodeClient = new NullChainNodeClient(),
  ) {}

  /**
   * Resolve the voter's active eligibility, distinguishing a missing voter
   * (404) from a known voter who is simply not eligible (403).
   */
  private async requireEligibility(electionId: string, voterId: string) {
    const eligibility = await this.voters.findEligibility(electionId, voterId);
    if (eligibility) return eligibility;

    const voter = await this.voters.findVoterById(voterId);
    if (!voter) {
      throw AppError.notFound(`Voter ${voterId} was not found.`, { voterId });
    }
    throw AppError.notEligible(
      `Voter ${voterId} is not eligible for election ${electionId}.`,
      { electionId, voterId },
    );
  }

  async getBallot(electionId: string, voterId: string): Promise<BallotState> {
    const election = await this.elections.getRow(electionId);
    const eligibility = await this.requireEligibility(electionId, voterId);

    const candidateRows = await this.candidates.listAllActive(electionId);
    const tallies =
      election.status === "ended" || election.status === "archived"
        ? await this.votes.tallies(electionId)
        : null;

    return {
      electionId,
      status: election.status,
      voter: {
        voterId,
        votingNumber: eligibility.votingNumber,
        hasVoted: eligibility.hasVoted,
      },
      candidates: buildBallotCandidates(candidateRows, tallies),
    };
  }

  async cast(
    electionId: string,
    voterId: string,
    input: CastBallotInput,
  ): Promise<CastBallotResult> {
    const election = await this.elections.getRow(electionId);
    const eligibility = await this.requireEligibility(electionId, voterId);

    // Resolve the candidate: 404 if it doesn't exist at all, 422 if it exists
    // but belongs to a different election.
    const candidate = await this.candidates.findById(
      electionId,
      input.candidateId,
    );
    if (!candidate) {
      const anywhere = await this.candidates.findAnyById(input.candidateId);
      if (!anywhere) {
        throw AppError.notFound(
          `Candidate ${input.candidateId} was not found.`,
          { candidateId: input.candidateId },
        );
      }
      throw AppError.candidateNotInElection(
        `Candidate ${input.candidateId} does not belong to election ${electionId}.`,
        { electionId, candidateId: input.candidateId },
      );
    }

    if (!isWithinVotingWindow(election, this.now())) {
      throw AppError.electionNotOpen(
        `Election ${electionId} is not open for voting.`,
        { electionId, status: election.status },
      );
    }

    if (eligibility.hasVoted) {
      throw AppError.alreadyVoted(
        `Voter ${voterId} has already cast a ballot.`,
        409,
        { electionId, voterId },
      );
    }

    const recorded = await this.votes.recordVote({
      electionId,
      candidateId: input.candidateId,
      eligibilityId: eligibility.eligibilityId,
      votingNumber: eligibility.votingNumber,
    });

    // A null result means a concurrent ballot won the race.
    if (!recorded) {
      throw AppError.alreadyVoted(
        `Voter ${voterId} has already cast a ballot.`,
        409,
        { electionId, voterId },
      );
    }

    // Submit to the blockchain network (fire-and-forget audit trail)
    this.chainNode.submitVote({
      electionId,
      votingNumber: eligibility.votingNumber,
      candidateId: input.candidateId,
    });

    return {
      accepted: true,
      votingNumber: eligibility.votingNumber,
      castAt: recorded.castAt.toISOString(),
    };
  }
}
