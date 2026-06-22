import { AppError } from "../common/errors.ts";
import { generateBigNumber } from "../common/numbers.ts";
import {
  normalizeOffset,
  offsetEnvelope,
  type OffsetEnvelope,
} from "../common/pagination.ts";
import type { ElectionsService } from "../elections/service.ts";
import {
  serializeCandidate,
  type CandidateDTO,
  type CandidateRow,
} from "./model.ts";
import type {
  CandidateListFilter,
  CandidatesRepository,
} from "./repository.ts";
import { assertCandidatesEditable } from "./utils.ts";

export interface CreateCandidateInput {
  fullName: string;
  manifesto?: string | null;
}

export interface ReplaceCandidateInput {
  fullName: string;
  manifesto: string | null;
}

export interface PatchCandidateInput {
  fullName?: string;
  manifesto?: string | null;
}

export interface ListCandidatesQuery extends CandidateListFilter {
  page?: number;
  limit?: number;
}

export class CandidatesService {
  constructor(
    private readonly repo: CandidatesRepository,
    private readonly elections: ElectionsService,
  ) {}

  private async getRow(
    electionId: string,
    candidateId: string,
    includeDeleted = false,
  ): Promise<CandidateRow> {
    const row = await this.repo.findById(
      electionId,
      candidateId,
      includeDeleted,
    );
    if (!row) {
      throw AppError.notFound(
        `Candidate ${candidateId} was not found in election ${electionId}.`,
        { electionId, candidateId },
      );
    }
    return row;
  }

  async list(
    electionId: string,
    query: ListCandidatesQuery,
  ): Promise<OffsetEnvelope<CandidateDTO>> {
    await this.elections.getRow(electionId);
    const page = normalizeOffset(query);
    const { rows, total } = await this.repo.list(
      electionId,
      { q: query.q, includeDeleted: query.includeDeleted, trash: query.trash },
      page,
    );
    return offsetEnvelope(rows.map(serializeCandidate), page, total);
  }

  async get(
    electionId: string,
    candidateId: string,
    includeDeleted = false,
  ): Promise<CandidateDTO> {
    await this.elections.getRow(electionId);
    return serializeCandidate(
      await this.getRow(electionId, candidateId, includeDeleted),
    );
  }

  async create(
    electionId: string,
    input: CreateCandidateInput,
  ): Promise<CandidateDTO> {
    const election = await this.elections.getRow(electionId);
    assertCandidatesEditable(election.status);

    const row = await this.repo.create({
      electionId,
      fullName: input.fullName,
      manifesto: input.manifesto ?? null,
      candidateNumber: generateBigNumber(),
    });
    return serializeCandidate(row);
  }

  async replace(
    electionId: string,
    candidateId: string,
    input: ReplaceCandidateInput,
  ): Promise<CandidateDTO> {
    const election = await this.elections.getRow(electionId);
    assertCandidatesEditable(election.status);
    await this.getRow(electionId, candidateId);

    const row = await this.repo.update(candidateId, {
      fullName: input.fullName,
      manifesto: input.manifesto,
    });
    return serializeCandidate(row!);
  }

  async patch(
    electionId: string,
    candidateId: string,
    input: PatchCandidateInput,
  ): Promise<CandidateDTO> {
    const election = await this.elections.getRow(electionId);
    assertCandidatesEditable(election.status);
    await this.getRow(electionId, candidateId);

    const patch: Partial<ReplaceCandidateInput> = {};
    if (input.fullName !== undefined) patch.fullName = input.fullName;
    if (input.manifesto !== undefined) patch.manifesto = input.manifesto;

    const row = await this.repo.update(candidateId, patch);
    return serializeCandidate(row!);
  }

  async remove(
    electionId: string,
    candidateId: string,
  ): Promise<{ candidateId: string; deleted: true }> {
    const election = await this.elections.getRow(electionId);
    assertCandidatesEditable(election.status);
    await this.getRow(electionId, candidateId);

    await this.repo.update(candidateId, { deleted: true });
    return { candidateId, deleted: true };
  }
}
