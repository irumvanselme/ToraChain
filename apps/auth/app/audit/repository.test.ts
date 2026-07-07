import { beforeEach, describe, expect, test } from "vitest";

import { AuditOrgRepository, type Queryable } from "./repository.ts";

class FakeQueryable implements Queryable {
  calls: { text: string; params?: unknown[] }[] = [];
  private results: unknown[][] = [];

  queue(rows: unknown[]): this {
    this.results.push(rows);
    return this;
  }

  async query<R = Record<string, unknown>>(text: string, params?: unknown[]) {
    this.calls.push({ text, params });
    return { rows: (this.results.shift() ?? []) as R[] };
  }
}

describe("AuditOrgRepository", () => {
  let db: FakeQueryable;
  let repo: AuditOrgRepository;

  beforeEach(() => {
    db = new FakeQueryable();
    repo = new AuditOrgRepository(db);
  });

  test("findByUserId joins members and returns the newest org", async () => {
    db.queue([{ id: "org-1" }]);
    const org = await repo.findByUserId("auditor-1");
    expect(org?.id).toBe("org-1");
    expect(db.calls[0]?.text).toContain('join "auditor_members"');
    expect(db.calls[0]?.params).toStrictEqual(["auditor-1"]);

    db.queue([]);
    expect(await repo.findByUserId("nobody")).toBeNull();
  });

  test("findById reads a single org", async () => {
    db.queue([{ id: "org-1" }]);
    expect((await repo.findById("org-1"))?.id).toBe("org-1");
    expect(db.calls[0]?.params).toStrictEqual(["org-1"]);
  });

  test("listAll without a filter runs no where clause", async () => {
    db.queue([{ id: "a" }, { id: "b" }]);
    const rows = await repo.listAll();
    expect(rows).toHaveLength(2);
    expect(db.calls[0]?.text).not.toContain("where");
    expect(db.calls[0]?.params).toStrictEqual([]);
  });

  test("listAll with a filter binds the status", async () => {
    db.queue([]);
    await repo.listAll("pending");
    expect(db.calls[0]?.text).toContain('"approvalStatus" = $1');
    expect(db.calls[0]?.params).toStrictEqual(["pending"]);
  });

  test("approve sets approved fields and clears the rejection reason", async () => {
    db.queue([{ id: "org-1", approvalStatus: "approved" }]);
    const org = await repo.approve("org-1", "admin-1");
    expect(org?.approvalStatus).toBe("approved");
    expect(db.calls[0]?.text).toContain("\"approvalStatus\" = 'approved'");
    expect(db.calls[0]?.text).toContain('"rejectionReason" = null');
    expect(db.calls[0]?.params).toStrictEqual(["org-1", "admin-1"]);

    db.queue([]);
    expect(await repo.approve("gone", "admin-1")).toBeNull();
  });

  test("reject sets the reason and clears the approval timestamp", async () => {
    db.queue([{ id: "org-1", approvalStatus: "rejected" }]);
    const org = await repo.reject("org-1", "bad docs", "admin-1");
    expect(org?.approvalStatus).toBe("rejected");
    expect(db.calls[0]?.text).toContain("\"approvalStatus\" = 'rejected'");
    expect(db.calls[0]?.text).toContain('"approvedAt" = null');
    expect(db.calls[0]?.params).toStrictEqual(["org-1", "bad docs", "admin-1"]);

    db.queue([]);
    expect(await repo.reject("gone", "x", "admin-1")).toBeNull();
  });
});
