import { AppError } from "../common/errors.ts";
import { generateBigNumber } from "../common/numbers.ts";
import type { ElectionsService } from "../elections/service.ts";
import { serializeEligibility, type EligibilityDTO } from "../voters/model.ts";
import type { VotersRepository } from "../voters/repository.ts";
import { normalizeEmail } from "../voters/utils.ts";
import {
  serializeIntegration,
  type CheckResult,
  type FormField,
  type HttpApiConfig,
  type IntegrationDTO,
  type IntegrationRow,
} from "./model.ts";
import type { IntegrationsRepository } from "./repository.ts";

export interface UpsertIntegrationInput {
  type: string;
  config: Record<string, unknown>;
  formFields: FormField[];
}

export class IntegrationsService {
  constructor(
    private readonly repo: IntegrationsRepository,
    private readonly elections: ElectionsService,
    private readonly votersRepo: VotersRepository,
  ) {}

  async get(electionId: string): Promise<IntegrationDTO | null> {
    await this.elections.getRow(electionId);
    const row = await this.repo.findByElection(electionId);
    return row ? serializeIntegration(row) : null;
  }

  async upsert(
    electionId: string,
    input: UpsertIntegrationInput,
  ): Promise<IntegrationDTO> {
    await this.elections.getRow(electionId);
    const row = await this.repo.upsert({
      electionId,
      type: input.type,
      config: input.config,
      formFields: input.formFields,
    });
    return serializeIntegration(row);
  }

  async remove(electionId: string): Promise<void> {
    await this.elections.getRow(electionId);
    const removed = await this.repo.remove(electionId);
    if (!removed) {
      throw AppError.integrationNotConfigured(
        `No integration configured for election ${electionId}.`,
        { electionId },
      );
    }
  }

  async checkEligibility(
    electionId: string,
    voterAccountId: string,
    fields: Record<string, string>,
  ): Promise<CheckResult> {
    await this.elections.getRow(electionId);
    const integration = await this.repo.findByElection(electionId);
    if (!integration) {
      throw AppError.integrationNotConfigured(
        `No integration configured for election ${electionId}.`,
        { electionId },
      );
    }
    return this.dispatchCheck(integration, electionId, voterAccountId, fields);
  }

  async enroll(
    electionId: string,
    voterAccountId: string,
    email: string,
    fields: Record<string, string>,
  ): Promise<EligibilityDTO> {
    await this.elections.getRow(electionId);
    const integration = await this.repo.findByElection(electionId);
    if (!integration) {
      throw AppError.integrationNotConfigured(
        `No integration configured for election ${electionId}.`,
        { electionId },
      );
    }

    // Re-verify with external system — prevents forged enrollment.
    const result = await this.dispatchCheck(
      integration,
      electionId,
      voterAccountId,
      fields,
    );
    if (!result.eligible) {
      throw AppError.notEligible(
        result.reason ??
          `Voter is not eligible for election ${electionId} according to the integration.`,
        { electionId },
      );
    }

    const normalizedEmail = normalizeEmail(email);

    // Find or create the voter record.
    let voter = await this.votersRepo.findVoterByEmail(normalizedEmail);
    if (!voter) {
      voter = await this.votersRepo.createVoter({
        email: normalizedEmail,
        accountId: voterAccountId,
      });
    } else if (voter.accountId !== voterAccountId) {
      voter =
        (await this.votersRepo.updateVoter(voter.voterId, {
          accountId: voterAccountId,
        })) ?? voter;
    }

    // Re-grant a previously revoked eligibility, or reject an active one.
    const existing = await this.votersRepo.findEligibility(
      electionId,
      voter.voterId,
      true,
    );
    if (existing && !existing.deleted) {
      throw AppError.alreadyEligible(
        `Voter ${voter.voterId} is already enrolled in election ${electionId}.`,
        { electionId, voterId: voter.voterId },
      );
    }
    if (existing && existing.deleted) {
      await this.votersRepo.updateEligibility(existing.eligibilityId, {
        deleted: false,
        externalVoterId: result.externalVoterId ?? null,
      });
    } else {
      await this.votersRepo.createEligibility({
        voterId: voter.voterId,
        electionId,
        votingNumber: generateBigNumber(),
        externalVoterId: result.externalVoterId ?? null,
      });
    }

    const row = await this.votersRepo.findEligibility(
      electionId,
      voter.voterId,
    );
    return serializeEligibility(row!);
  }

  /**
   * Dispatch the eligibility check to the correct handler based on integration type.
   * Add new `if` branches here as new integration types are implemented.
   */
  private async dispatchCheck(
    integration: IntegrationRow,
    electionId: string,
    voterAccountId: string,
    fields: Record<string, string>,
  ): Promise<CheckResult> {
    if (integration.type === "http_api") {
      return this.checkViaHttpApi(
        integration.config as unknown as HttpApiConfig,
        electionId,
        voterAccountId,
        fields,
      );
    }

    throw AppError.integrationTypeUnsupported(
      `Integration type "${integration.type}" is not yet supported.`,
      { type: integration.type },
    );
  }

  private async checkViaHttpApi(
    config: HttpApiConfig,
    electionId: string,
    voterAccountId: string,
    fields: Record<string, string>,
  ): Promise<CheckResult> {
    const body = {
      "election-id": electionId,
      "voter-account-id": voterAccountId,
      ...fields,
    };

    let res: Response;
    try {
      res = await fetch(config.url, {
        method: config.method,
        headers: {
          "content-type": "application/json",
          [config.apiKeyHeaderName]: config.apiKeyHeaderValue,
        },
        body: JSON.stringify(body),
      });
    } catch {
      throw AppError.externalApiError(
        "Failed to reach the eligibility API. Please try again later.",
        { url: config.url },
      );
    }

    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      // The external API returns the voter's unique identifier — accept any of
      // the common field names (id, voterId, userId, identifier).
      const externalVoterId =
        String(
          data.id ?? data.voterId ?? data.userId ?? data.identifier ?? "",
        ).trim() || undefined;
      return { eligible: true, externalVoterId };
    }

    // Surface the external API's message (e.g. "Either 'fingerprint' or
    // 'eyes' is required.") so the voter sees why the check failed.
    const errData = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const reason =
      typeof errData.message === "string" && errData.message.trim()
        ? errData.message
        : undefined;
    return { eligible: false, reason };
  }
}
