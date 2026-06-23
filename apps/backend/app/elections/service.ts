import { AppError } from "../common/errors.ts";
import { generateBigNumber } from "../common/numbers.ts";
import {
  normalizeOffset,
  offsetEnvelope,
  type OffsetEnvelope,
} from "../common/pagination.ts";
import {
  serializeElection,
  type ElectionDTO,
  type ElectionRow,
  type ElectionStatus,
} from "./model.ts";
import type { ElectionListFilter, ElectionsRepository } from "./repository.ts";
import {
  assertContentEditable,
  assertTimeWindow,
  assertValidTransition,
} from "./utils.ts";
import { Logger } from "@tora-chain/be-common";

export interface CreateElectionInput {
  title: string;
  description?: string | null;
  startTime?: Date | null;
  endTime?: Date | null;
  status?: ElectionStatus;
}

export interface ReplaceElectionInput {
  title: string;
  description: string | null;
  startTime: Date | null;
  endTime: Date | null;
  status: ElectionStatus;
}

export interface PatchElectionInput {
  title?: string;
  description?: string | null;
  startTime?: Date | null;
  endTime?: Date | null;
  status?: ElectionStatus;
}

export interface ListElectionsQuery extends ElectionListFilter {
  page?: number;
  limit?: number;
}

export class ElectionsService {
  constructor(
    private readonly repo: ElectionsRepository,
    private logger = new Logger({ name: ElectionsService.name }),
  ) {}

  async getRow(id: string, includeDeleted = false): Promise<ElectionRow> {
    const row = await this.repo.findById(id, includeDeleted);
    if (!row) {
      throw AppError.notFound(`Election ${id} was not found.`, {
        electionId: id,
      });
    }
    return row;
  }

  async list(query: ListElectionsQuery): Promise<OffsetEnvelope<ElectionDTO>> {
    const page = normalizeOffset(query);
    try {
      const { rows, total } = await this.repo.list(
        {
          status: query.status,
          q: query.q,
          includeDeleted: query.includeDeleted,
          trash: query.trash,
        },
        page,
      );

      return offsetEnvelope(rows.map(serializeElection), page, total);
    } catch (e) {
      this.logger.exception(e);
      throw e;
    }
  }

  async get(id: string, includeDeleted = false): Promise<ElectionDTO> {
    return serializeElection(await this.getRow(id, includeDeleted));
  }

  async create(input: CreateElectionInput): Promise<ElectionDTO> {
    assertTimeWindow(input.startTime, input.endTime);

    const status = input.status ?? "draft";
    if (status === "active") {
      const existing = await this.repo.findActiveByTitle(input.title);
      if (existing) {
        throw AppError.duplicateTitle(
          `An active election titled "${input.title}" already exists.`,
          { title: input.title },
        );
      }
    }

    const row = await this.repo.create({
      title: input.title,
      description: input.description ?? null,
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      status,
      electionNumber: generateBigNumber(),
    });
    return serializeElection(row);
  }

  async replace(id: string, input: ReplaceElectionInput): Promise<ElectionDTO> {
    const current = await this.getRow(id);
    assertValidTransition(current.status, input.status);
    assertContentEditable(current, input);
    assertTimeWindow(input.startTime, input.endTime);

    const row = await this.repo.update(id, {
      title: input.title,
      description: input.description,
      startTime: input.startTime,
      endTime: input.endTime,
      status: input.status,
    });
    return serializeElection(row!);
  }

  async patch(id: string, input: PatchElectionInput): Promise<ElectionDTO> {
    const current = await this.getRow(id);

    if (input.status !== undefined) {
      assertValidTransition(current.status, input.status);
    }
    assertContentEditable(current, input);

    const effectiveStart =
      input.startTime !== undefined ? input.startTime : current.startTime;
    const effectiveEnd =
      input.endTime !== undefined ? input.endTime : current.endTime;
    assertTimeWindow(effectiveStart, effectiveEnd);

    const patch: Partial<ReplaceElectionInput> = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description;
    if (input.startTime !== undefined) patch.startTime = input.startTime;
    if (input.endTime !== undefined) patch.endTime = input.endTime;
    if (input.status !== undefined) patch.status = input.status;

    const row = await this.repo.update(id, patch);
    return serializeElection(row!);
  }

  async remove(id: string): Promise<{ electionId: string; deleted: true }> {
    const current = await this.getRow(id);
    if (current.status === "active") {
      throw AppError.cannotDeleteActive(
        `Election ${id} is active and cannot be deleted.`,
        { electionId: id, status: current.status },
      );
    }
    await this.repo.update(id, { deleted: true });
    return { electionId: id, deleted: true };
  }
}
