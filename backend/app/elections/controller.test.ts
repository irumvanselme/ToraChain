import { Elysia } from "elysia";
import { beforeEach, describe, expect, test } from "vitest";

import { errorHandler } from "../common/error-handler.ts";
import { InMemoryElectionsRepository } from "../test-helpers/fakes.ts";
import { readJson, type TestApp } from "../test-helpers/http.ts";
import { ElectionsController } from "./controller.ts";
import { ElectionsService } from "./service.ts";

let repo: InMemoryElectionsRepository;
let app: TestApp;

beforeEach(() => {
  repo = new InMemoryElectionsRepository();
  const service = new ElectionsService(repo);
  app = new Elysia().use(errorHandler).use(ElectionsController(service));
});

const req = (path: string, init?: RequestInit) =>
  app.handle(new Request(`http://localhost${path}`, init));

const jsonReq = (path: string, method: string, body: unknown) =>
  req(path, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /elections", () => {
  test("creates an election and returns 201", async () => {
    const res = await jsonReq("/elections", "POST", { title: "New" });
    expect(res.status).toBe(201);
    const body = await readJson(res);
    expect(body).toMatchObject({
      title: "New",
      status: "draft",
      deleted: false,
    });
    expect(body.electionId).toBeTypeOf("string");
  });

  test("rejects an empty title with 400 VALIDATION_ERROR", async () => {
    const res = await jsonReq("/elections", "POST", { title: "" });
    expect(res.status).toBe(400);
    expect((await readJson(res)).code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /elections/:id", () => {
  test("returns 404 with the standard error shape", async () => {
    const res = await req("/elections/22222222-2222-2222-2222-222222222222");
    expect(res.status).toBe(404);
    expect(await readJson(res)).toEqual({
      code: "RESOURCE_NOT_FOUND",
      message: expect.any(String),
      details: expect.anything(),
    });
  });

  test("returns the election when present", async () => {
    const row = repo.seed({ title: "Find me" });
    const res = await req(`/elections/${row.electionId}`);
    expect(res.status).toBe(200);
    expect((await readJson(res)).title).toBe("Find me");
  });
});

describe("GET /elections", () => {
  test("returns a paginated envelope", async () => {
    repo.seed({ title: "a" });
    repo.seed({ title: "b" });
    const res = await req("/elections?limit=1");
    const body = await readJson(res);
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toMatchObject({
      page: 1,
      limit: 1,
      total: 2,
      totalPages: 2,
    });
  });
});

describe("DELETE /elections/:id", () => {
  test("soft deletes and returns { electionId, deleted: true }", async () => {
    const row = repo.seed({ status: "draft" });
    const res = await req(`/elections/${row.electionId}`, { method: "DELETE" });
    expect(res.status).toBe(200);
    expect(await readJson(res)).toEqual({
      electionId: row.electionId,
      deleted: true,
    });
  });

  test("returns 409 CANNOT_DELETE_ACTIVE for active elections", async () => {
    const row = repo.seed({ status: "active" });
    const res = await req(`/elections/${row.electionId}`, { method: "DELETE" });
    expect(res.status).toBe(409);
    expect((await readJson(res)).code).toBe("CANNOT_DELETE_ACTIVE");
  });
});

describe("PATCH /elections/:id", () => {
  test("returns 409 INVALID_STATUS_TRANSITION for closed -> draft", async () => {
    const row = repo.seed({ status: "closed" });
    const res = await jsonReq(`/elections/${row.electionId}`, "PATCH", {
      status: "draft",
    });
    expect(res.status).toBe(409);
    expect((await readJson(res)).code).toBe("INVALID_STATUS_TRANSITION");
  });
});
