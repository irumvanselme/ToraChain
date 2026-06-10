import { Elysia } from "elysia";
import { beforeEach, describe, expect, test } from "vitest";

import { errorHandler } from "../common/error-handler.ts";
import { ElectionsService } from "../elections/service.ts";
import {
  FakeAuthDirectory,
  InMemoryElectionsRepository,
  InMemoryVotersRepository,
} from "../test-helpers/fakes.ts";
import { readJson, type TestApp } from "../test-helpers/http.ts";
import { VotersController } from "./controller.ts";
import { VotersService } from "./service.ts";

let elections: InMemoryElectionsRepository;
let voters: InMemoryVotersRepository;
let directory: FakeAuthDirectory;
let app: TestApp;
let electionId: string;

beforeEach(() => {
  elections = new InMemoryElectionsRepository();
  voters = new InMemoryVotersRepository();
  directory = new FakeAuthDirectory(false);
  const service = new VotersService(
    voters,
    new ElectionsService(elections),
    directory,
  );
  app = new Elysia().use(errorHandler).use(VotersController(service));
  electionId = elections.seed().electionId;
});

const req = (path: string, init?: RequestInit) =>
  app.handle(new Request(`http://localhost${path}`, init));

const jsonReq = (path: string, method: string, body: unknown) =>
  req(path, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /elections/:id/voters", () => {
  test("201 grants eligibility", async () => {
    const res = await jsonReq(`/elections/${electionId}/voters`, "POST", {
      email: "voter@example.com",
    });
    expect(res.status).toBe(201);
    const body = await readJson(res);
    expect(body).toMatchObject({ electionId, hasVoted: false, deleted: false });
  });

  test("400 VALIDATION_ERROR for an invalid email", async () => {
    const res = await jsonReq(`/elections/${electionId}/voters`, "POST", {
      email: "not-an-email",
    });
    expect(res.status).toBe(400);
    expect((await readJson(res)).code).toBe("VALIDATION_ERROR");
  });

  test("409 ALREADY_ELIGIBLE on a duplicate grant", async () => {
    await jsonReq(`/elections/${electionId}/voters`, "POST", {
      email: "v@example.com",
    });
    const res = await jsonReq(`/elections/${electionId}/voters`, "POST", {
      email: "v@example.com",
    });
    expect(res.status).toBe(409);
    expect((await readJson(res)).code).toBe("ALREADY_ELIGIBLE");
  });
});

describe("GET /elections/:id/voters", () => {
  test("returns a cursor envelope", async () => {
    await jsonReq(`/elections/${electionId}/voters`, "POST", {
      email: "v@example.com",
    });
    const res = await req(`/elections/${electionId}/voters?limit=50`);
    const body = await readJson(res);
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toMatchObject({ limit: 50, nextCursor: null });
  });
});

describe("DELETE /elections/:id/voters/:voterId", () => {
  test("revokes eligibility", async () => {
    const grant = await jsonReq(`/elections/${electionId}/voters`, "POST", {
      email: "v@example.com",
    });
    const { voterId, eligibilityId } = await readJson<{
      voterId: string;
      eligibilityId: string;
    }>(grant);
    const res = await req(`/elections/${electionId}/voters/${voterId}`, {
      method: "DELETE",
    });
    expect(await readJson(res)).toEqual({ eligibilityId, deleted: true });
  });
});
