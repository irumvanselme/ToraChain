import { describe, expect, test } from "vitest";

import { AuditOrgService } from "./service.ts";
import type {
  AuditOrgRepository,
  OrgRow,
  OrgWithMemberRow,
} from "./repository.ts";

function orgRow(partial: Partial<OrgWithMemberRow> = {}): OrgWithMemberRow {
  return {
    id: "org-1",
    name: "Electoral Commission",
    slug: "ec",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    approvalStatus: "pending",
    approvedAt: null,
    rejectionReason: null,
    approvedBy: null,
    memberUserId: "auditor-1",
    memberRole: "owner",
    ...partial,
  };
}

/** A hand-rolled repo double recording calls and returning queued rows. */
class FakeRepo {
  findByUserIdResult: OrgRow | null = null;
  listAllResult: OrgWithMemberRow[] = [];
  approveResult: OrgRow | null = null;
  rejectResult: OrgRow | null = null;
  calls: Record<string, unknown[]> = {};

  private record(name: string, args: unknown[]) {
    this.calls[name] = args;
  }

  async findByUserId(userId: string) {
    this.record("findByUserId", [userId]);
    return this.findByUserIdResult;
  }
  async findById(orgId: string) {
    this.record("findById", [orgId]);
    return null;
  }
  async listAll(filter?: "pending" | "approved" | "rejected") {
    this.record("listAll", [filter]);
    return this.listAllResult;
  }
  async approve(orgId: string, approvedBy: string) {
    this.record("approve", [orgId, approvedBy]);
    return this.approveResult;
  }
  async reject(orgId: string, reason: string, rejectedBy: string) {
    this.record("reject", [orgId, reason, rejectedBy]);
    return this.rejectResult;
  }
}

describe("AuditOrgService", () => {
  test("getStatusByUserId serializes the org, defaulting a null status to pending", async () => {
    const repo = new FakeRepo();
    repo.findByUserIdResult = orgRow({ approvalStatus: null });
    const service = new AuditOrgService(repo as unknown as AuditOrgRepository);

    const dto = await service.getStatusByUserId("auditor-1");
    expect(dto).toStrictEqual({
      orgId: "org-1",
      name: "Electoral Commission",
      slug: "ec",
      approvalStatus: "pending",
      approvedAt: null,
      rejectionReason: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(repo.calls.findByUserId).toStrictEqual(["auditor-1"]);
  });

  test("getStatusByUserId returns null when the auditor has no org", async () => {
    const repo = new FakeRepo();
    const service = new AuditOrgService(repo as unknown as AuditOrgRepository);
    expect(await service.getStatusByUserId("nobody")).toBeNull();
  });

  test("listOrgs includes the member user id and passes the filter through", async () => {
    const repo = new FakeRepo();
    repo.listAllResult = [
      orgRow({
        approvalStatus: "approved",
        approvedAt: new Date("2026-02-02T00:00:00.000Z"),
      }),
    ];
    const service = new AuditOrgService(repo as unknown as AuditOrgRepository);

    const list = await service.listOrgs("approved");
    expect(list).toHaveLength(1);
    expect(list[0]?.memberUserId).toBe("auditor-1");
    expect(list[0]?.approvedAt).toBe("2026-02-02T00:00:00.000Z");
    expect(repo.calls.listAll).toStrictEqual(["approved"]);
  });

  test("approve returns the serialized org, or null when not found", async () => {
    const repo = new FakeRepo();
    repo.approveResult = orgRow({
      approvalStatus: "approved",
      approvedAt: new Date("2026-03-03T00:00:00.000Z"),
    });
    const service = new AuditOrgService(repo as unknown as AuditOrgRepository);

    const dto = await service.approve("org-1", "admin-1");
    expect(dto?.approvalStatus).toBe("approved");
    expect(repo.calls.approve).toStrictEqual(["org-1", "admin-1"]);

    repo.approveResult = null;
    expect(await service.approve("gone", "admin-1")).toBeNull();
  });

  test("reject returns the serialized org, or null when not found", async () => {
    const repo = new FakeRepo();
    repo.rejectResult = orgRow({
      approvalStatus: "rejected",
      rejectionReason: "Incomplete documents",
    });
    const service = new AuditOrgService(repo as unknown as AuditOrgRepository);

    const dto = await service.reject(
      "org-1",
      "Incomplete documents",
      "admin-1",
    );
    expect(dto?.approvalStatus).toBe("rejected");
    expect(dto?.rejectionReason).toBe("Incomplete documents");
    expect(repo.calls.reject).toStrictEqual([
      "org-1",
      "Incomplete documents",
      "admin-1",
    ]);

    repo.rejectResult = null;
    expect(await service.reject("gone", "x", "admin-1")).toBeNull();
  });
});
