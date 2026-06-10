import { beforeEach, describe, expect, test } from "vitest";

import { AppError } from "../common/errors.ts";
import { InMemoryElectionsRepository } from "../test-helpers/fakes.ts";
import { ElectionsService } from "./service.ts";

let repo: InMemoryElectionsRepository;
let service: ElectionsService;

beforeEach(() => {
  repo = new InMemoryElectionsRepository();
  service = new ElectionsService(repo);
});

const expectError = async (
  fn: () => Promise<unknown>,
  code: string,
  status: number,
) => {
  await expect(fn()).rejects.toMatchObject({ code, status });
};

describe("create", () => {
  test("defaults status to draft and assigns an electionNumber", async () => {
    const election = await service.create({ title: "A" });
    expect(election.status).toBe("draft");
    expect(election.deleted).toBe(false);
    const row = repo.rows.get(election.electionId)!;
    expect(row.electionNumber).toMatch(/^\d+$/);
  });

  test("rejects endTime before startTime with VALIDATION_ERROR", async () => {
    await expectError(
      () =>
        service.create({
          title: "A",
          startTime: new Date("2026-06-09T20:00:00Z"),
          endTime: new Date("2026-06-09T08:00:00Z"),
        }),
      "VALIDATION_ERROR",
      400,
    );
  });

  test("rejects a duplicate active title with DUPLICATE_TITLE", async () => {
    repo.seed({ title: "Dup", status: "active" });
    await expectError(
      () => service.create({ title: "Dup", status: "active" }),
      "DUPLICATE_TITLE",
      409,
    );
  });

  test("allows a duplicate title when not active", async () => {
    repo.seed({ title: "Dup", status: "active" });
    const election = await service.create({ title: "Dup", status: "draft" });
    expect(election.title).toBe("Dup");
  });
});

describe("get", () => {
  test("throws RESOURCE_NOT_FOUND for unknown id", async () => {
    await expectError(() => service.get("missing"), "RESOURCE_NOT_FOUND", 404);
  });

  test("hides soft-deleted rows unless includeDeleted", async () => {
    const row = repo.seed({ deleted: true });
    await expectError(
      () => service.get(row.electionId),
      "RESOURCE_NOT_FOUND",
      404,
    );
    expect((await service.get(row.electionId, true)).deleted).toBe(true);
  });
});

describe("patch / replace transitions", () => {
  test("rejects an illegal status transition", async () => {
    const row = repo.seed({ status: "closed" });
    await expectError(
      () => service.patch(row.electionId, { status: "draft" }),
      "INVALID_STATUS_TRANSITION",
      409,
    );
  });

  test("locks content edits while active", async () => {
    const row = repo.seed({ status: "active", title: "Locked" });
    await expectError(
      () => service.patch(row.electionId, { title: "New" }),
      "ELECTION_LOCKED",
      422,
    );
  });

  test("allows status-only transition while active", async () => {
    const row = repo.seed({ status: "active", title: "Locked" });
    const updated = await service.patch(row.electionId, { status: "closed" });
    expect(updated.status).toBe("closed");
  });

  test("replace updates all editable fields on a draft", async () => {
    const row = repo.seed({ status: "draft" });
    const updated = await service.replace(row.electionId, {
      title: "Replaced",
      description: "d",
      startTime: null,
      endTime: null,
      status: "scheduled",
    });
    expect(updated).toMatchObject({ title: "Replaced", status: "scheduled" });
  });
});

describe("remove", () => {
  test("soft-deletes a draft election", async () => {
    const row = repo.seed({ status: "draft" });
    expect(await service.remove(row.electionId)).toEqual({
      electionId: row.electionId,
      deleted: true,
    });
    expect(repo.rows.get(row.electionId)!.deleted).toBe(true);
  });

  test("refuses to delete an active election", async () => {
    const row = repo.seed({ status: "active" });
    await expectError(
      () => service.remove(row.electionId),
      "CANNOT_DELETE_ACTIVE",
      409,
    );
  });
});

describe("list", () => {
  test("paginates and excludes trashed by default", async () => {
    for (let i = 0; i < 25; i++) repo.seed({ title: `E${i}` });
    repo.seed({ title: "trashed", deleted: true });

    const page1 = await service.list({ page: 1, limit: 20 });
    expect(page1.data).toHaveLength(20);
    expect(page1.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 25,
      totalPages: 2,
    });

    const trash = await service.list({ trash: true });
    expect(trash.data).toHaveLength(1);
    expect(trash.data[0]!.title).toBe("trashed");
  });

  test("clamps limit to 100", async () => {
    const result = await service.list({ limit: 1000 });
    expect(result.pagination.limit).toBe(100);
  });
});

describe("AppError shape", () => {
  test("serializes to { code, message, details }", () => {
    expect(AppError.notFound("x", { a: 1 }).toBody()).toEqual({
      code: "RESOURCE_NOT_FOUND",
      message: "x",
      details: { a: 1 },
    });
  });
});
