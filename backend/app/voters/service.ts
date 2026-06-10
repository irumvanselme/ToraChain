import { AppError } from "../common/errors.ts";
import { generateBigNumber } from "../common/numbers.ts";
import {
  cursorEnvelope,
  decodeCursor,
  normalizeCursorLimit,
  type CursorEnvelope,
} from "../common/pagination.ts";
import type { ElectionsService } from "../elections/service.ts";
import type { AuthDirectory } from "./auth-directory.ts";
import {
  serializeEligibility,
  type EligibilityDTO,
  type EligibilityWithVoter,
} from "./model.ts";
import type { EligibilityListFilter, VotersRepository } from "./repository.ts";
import { normalizeEmail, paginateRows } from "./utils.ts";

export interface ListVotersQuery extends EligibilityListFilter {
  cursor?: string;
  limit?: number;
}

export interface GrantEligibilityInput {
  email: string;
}

export interface PatchVoterInput {
  email?: string;
}

export class VotersService {
  constructor(
    private readonly repo: VotersRepository,
    private readonly elections: ElectionsService,
    private readonly directory: AuthDirectory,
  ) {}

  /** Load an eligibility row joined with its voter, or throw 404. */
  async getEligibilityRow(
    electionId: string,
    voterId: string,
    includeDeleted = false,
  ): Promise<EligibilityWithVoter> {
    const row = await this.repo.findEligibility(
      electionId,
      voterId,
      includeDeleted,
    );
    if (!row) {
      throw AppError.notFound(
        `Voter ${voterId} is not eligible for election ${electionId}.`,
        { electionId, voterId },
      );
    }
    return row;
  }

  async list(
    electionId: string,
    query: ListVotersQuery,
  ): Promise<CursorEnvelope<EligibilityDTO>> {
    await this.elections.getRow(electionId);
    const limit = normalizeCursorLimit(query.limit);
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;

    const rows = await this.repo.listEligibilities(
      electionId,
      {
        hasVoted: query.hasVoted,
        q: query.q ? normalizeEmail(query.q) : undefined,
        includeDeleted: query.includeDeleted,
        trash: query.trash,
      },
      limit + 1,
      cursor,
    );

    const { page, nextCursor } = paginateRows(rows, limit);
    return cursorEnvelope(page.map(serializeEligibility), limit, nextCursor);
  }

  async get(
    electionId: string,
    voterId: string,
    includeDeleted = false,
  ): Promise<EligibilityDTO> {
    await this.elections.getRow(electionId);
    return serializeEligibility(
      await this.getEligibilityRow(electionId, voterId, includeDeleted),
    );
  }

  async grant(
    electionId: string,
    input: GrantEligibilityInput,
  ): Promise<EligibilityDTO> {
    await this.elections.getRow(electionId);
    const email = normalizeEmail(input.email);

    // Verify the voter has an account in the auth backend (when enforced).
    const account = await this.directory.findAccountByEmail(email);
    if (this.directory.enforced && !account) {
      throw AppError.notFound(`No voter account was found for ${email}.`, {
        email,
      });
    }
    const accountId = account?.accountId ?? null;

    // Find or create the underlying voter.
    let voter = await this.repo.findVoterByEmail(email);
    if (!voter) {
      voter = await this.repo.createVoter({ email, accountId });
    } else if (accountId && voter.accountId !== accountId) {
      voter =
        (await this.repo.updateVoter(voter.voterId, { accountId })) ?? voter;
    }

    // Re-grant a previously revoked eligibility, or reject an active one.
    const existing = await this.repo.findEligibility(
      electionId,
      voter.voterId,
      true,
    );
    if (existing && !existing.deleted) {
      throw AppError.alreadyEligible(
        `Voter ${voter.voterId} is already eligible for election ${electionId}.`,
        { electionId, voterId: voter.voterId },
      );
    }
    if (existing && existing.deleted) {
      await this.repo.updateEligibility(existing.eligibilityId, {
        deleted: false,
      });
    } else {
      await this.repo.createEligibility({
        voterId: voter.voterId,
        electionId,
        votingNumber: generateBigNumber(),
      });
    }

    return serializeEligibility(
      await this.getEligibilityRow(electionId, voter.voterId),
    );
  }

  async patch(
    electionId: string,
    voterId: string,
    input: PatchVoterInput,
  ): Promise<EligibilityDTO> {
    await this.elections.getRow(electionId);
    const eligibility = await this.getEligibilityRow(electionId, voterId);

    if (eligibility.hasVoted) {
      throw AppError.alreadyVoted(
        `Voter ${voterId} has already voted; their details cannot be changed.`,
        422,
        { electionId, voterId },
      );
    }

    if (input.email !== undefined) {
      const email = normalizeEmail(input.email);
      const clash = await this.repo.findVoterByEmail(email);
      if (clash && clash.voterId !== voterId) {
        throw AppError.validation(
          `Email ${email} is already in use by another voter.`,
          { email },
        );
      }
      // Re-verify the account for the new email when enforced.
      const account = await this.directory.findAccountByEmail(email);
      if (this.directory.enforced && !account) {
        throw AppError.notFound(`No voter account was found for ${email}.`, {
          email,
        });
      }
      await this.repo.updateVoter(voterId, {
        email,
        accountId: account?.accountId ?? null,
      });
    }

    return serializeEligibility(
      await this.getEligibilityRow(electionId, voterId),
    );
  }

  async remove(
    electionId: string,
    voterId: string,
  ): Promise<{ eligibilityId: string; deleted: true }> {
    await this.elections.getRow(electionId);
    const eligibility = await this.getEligibilityRow(electionId, voterId);

    if (eligibility.hasVoted) {
      throw AppError.alreadyVoted(
        `Voter ${voterId} has already cast a ballot; eligibility cannot be revoked.`,
        409,
        { electionId, voterId },
      );
    }

    await this.repo.updateEligibility(eligibility.eligibilityId, {
      deleted: true,
    });
    return { eligibilityId: eligibility.eligibilityId, deleted: true };
  }
}
