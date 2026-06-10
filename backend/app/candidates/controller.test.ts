import { Elysia } from "elysia";
import { beforeEach, describe, expect, test } from "vitest";

import { errorHandler } from "../common/error-handler.ts";
import { ElectionsService } from "../elections/service.ts";
import {
  InMemoryCandidatesRepository,
  InMemoryElectionsRepository,
} from "../test-helpers/fakes.ts";
import { readJson, type TestApp } from "../test-helpers/http.ts";
import { CandidatesController } from "./controller.ts";
import { CandidatesService } from "./service.ts";

let elections: InMemoryElectionsRepository;
let candidates: InMemoryCandidatesRepository;
let app: TestApp;

beforeEach(() => {
  elections = new InMemoryElectionsRepository();
  candidates = new InMemoryCandidatesRepository();
  const service = new CandidatesService(
    candidates,
    new ElectionsService(elections),
  );
  app = new Elysia().use(errorHandler).use(CandidatesController(service));
});

const req = (path: string, init?: RequestInit) =>
  app.handle(new Request(`http://localhost${path}`, init));

const jsonReq = (path: string, method: string, body: unknown) =>
  req(path, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /elections/:id/candidates", () => {
  test("201 on a draft election", async () => {
    const election = elections.seed({ status: "draft" });
    const res = await jsonReq(
      `/elections/${election.electionId}/candidates`,
      "POST",
      {
        fullName: "Jane Doe",
      },
    );
    expect(res.status).toBe(201);
    expect((await readJson(res)).fullName).toBe("Jane Doe");
  });

  test("409 CANDIDATES_LOCKED on an active election", async () => {
    const election = elections.seed({ status: "active" });
    const res = await jsonReq(
      `/elections/${election.electionId}/candidates`,
      "POST",
      {
        fullName: "Jane Doe",
      },
    );
    expect(res.status).toBe(409);
    expect((await readJson(res)).code).toBe("CANDIDATES_LOCKED");
  });
});

describe("GET /elections/:id/candidates", () => {
  test("returns a paginated envelope", async () => {
    const election = elections.seed();
    candidates.seed({ electionId: election.electionId, fullName: "A" });
    const res = await req(`/elections/${election.electionId}/candidates`);
    const body = await readJson(res);
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toMatchObject({ total: 1 });
  });

  test("404 for a missing election", async () => {
    const res = await req(
      `/elections/44444444-4444-4444-4444-444444444444/candidates`,
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /elections/:id/candidates/:candidateId", () => {
  test("soft deletes", async () => {
    const election = elections.seed({ status: "draft" });
    const candidate = candidates.seed({ electionId: election.electionId });
    const res = await req(
      `/elections/${election.electionId}/candidates/${candidate.candidateId}`,
      { method: "DELETE" },
    );
    expect(await readJson(res)).toEqual({
      candidateId: candidate.candidateId,
      deleted: true,
    });
  });
});
