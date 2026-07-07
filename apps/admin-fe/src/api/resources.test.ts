import { describe, test, expect, vi, beforeEach } from "vitest";

// A single mock for the shared request() used by every resource module.
const request = vi.fn();
vi.mock("api/request", () => ({
  request: (...args: unknown[]) => request(...args),
}));

import { API_BASE, CORE_API } from "lib/config.ts";
import {
  listElections,
  getElection,
  createElection,
  updateElection,
  updateElectionStatus,
  deleteElection,
  STATUS_TRANSITIONS,
  ELECTION_STATUSES,
} from "./elections.ts";
import {
  listCandidates,
  createCandidate,
  updateCandidate,
  deleteCandidate,
} from "./candidates.ts";
import { listVoters, grantVoter, updateVoter, revokeVoter } from "./voters.ts";
import { listUsers, createAdmin, USER_TYPES } from "./users.ts";
import {
  listAuditOrgs,
  approveAuditOrg,
  rejectAuditOrg,
  APPROVAL_STATUSES,
} from "./audit-orgs.ts";
import {
  getIntegration,
  upsertIntegration,
  deleteIntegration,
} from "./integrations.ts";

beforeEach(() => {
  request.mockReset();
  request.mockResolvedValue({ ok: true });
});

describe("elections API", () => {
  const root = `${API_BASE}/elections`;

  test("listElections passes params as query", async () => {
    const signal = new AbortController().signal;
    await listElections({ page: 2, status: "active" }, signal);
    expect(request).toHaveBeenCalledWith(root, {
      query: { page: 2, status: "active" },
      signal,
    });
  });

  test("listElections defaults params to {}", async () => {
    await listElections();
    expect(request).toHaveBeenCalledWith(root, {
      query: {},
      signal: undefined,
    });
  });

  test("getElection targets the id path", async () => {
    await getElection("e1");
    expect(request).toHaveBeenCalledWith(`${root}/e1`, { signal: undefined });
  });

  test("createElection posts the input", async () => {
    const input = {
      title: "T",
      description: null,
      startTime: null,
      endTime: null,
      status: "draft" as const,
    };
    await createElection(input);
    expect(request).toHaveBeenCalledWith(root, { method: "POST", body: input });
  });

  test("updateElection patches the input", async () => {
    await updateElection("e1", { title: "New" });
    expect(request).toHaveBeenCalledWith(`${root}/e1`, {
      method: "PATCH",
      body: { title: "New" },
    });
  });

  test("updateElectionStatus patches only status", async () => {
    await updateElectionStatus("e1", "active");
    expect(request).toHaveBeenCalledWith(`${root}/e1`, {
      method: "PATCH",
      body: { status: "active" },
    });
  });

  test("deleteElection deletes by id", async () => {
    await deleteElection("e1");
    expect(request).toHaveBeenCalledWith(`${root}/e1`, { method: "DELETE" });
  });

  test("status metadata is consistent", () => {
    expect(ELECTION_STATUSES).toContain("draft");
    expect(STATUS_TRANSITIONS.draft).toEqual(["enrolling_voters"]);
    expect(STATUS_TRANSITIONS.archived).toEqual([]);
  });
});

describe("candidates API", () => {
  const root = `${API_BASE}/elections/e1/candidates`;

  test("listCandidates", async () => {
    await listCandidates("e1", { page: 1 });
    expect(request).toHaveBeenCalledWith(root, {
      query: { page: 1 },
      signal: undefined,
    });
  });

  test("listCandidates default params", async () => {
    await listCandidates("e1");
    expect(request).toHaveBeenCalledWith(root, {
      query: {},
      signal: undefined,
    });
  });

  test("createCandidate", async () => {
    const input = { fullName: "Ann", manifesto: null };
    await createCandidate("e1", input);
    expect(request).toHaveBeenCalledWith(root, { method: "POST", body: input });
  });

  test("updateCandidate", async () => {
    await updateCandidate("e1", "c1", { fullName: "Bob" });
    expect(request).toHaveBeenCalledWith(`${root}/c1`, {
      method: "PATCH",
      body: { fullName: "Bob" },
    });
  });

  test("deleteCandidate", async () => {
    await deleteCandidate("e1", "c1");
    expect(request).toHaveBeenCalledWith(`${root}/c1`, { method: "DELETE" });
  });
});

describe("voters API", () => {
  const root = `${API_BASE}/elections/e1/voters`;

  test("listVoters", async () => {
    await listVoters("e1", { hasVoted: true });
    expect(request).toHaveBeenCalledWith(root, {
      query: { hasVoted: true },
      signal: undefined,
    });
  });

  test("listVoters default params", async () => {
    await listVoters("e1");
    expect(request).toHaveBeenCalledWith(root, {
      query: {},
      signal: undefined,
    });
  });

  test("grantVoter", async () => {
    await grantVoter("e1", { email: "a@b.c" });
    expect(request).toHaveBeenCalledWith(root, {
      method: "POST",
      body: { email: "a@b.c" },
    });
  });

  test("updateVoter", async () => {
    await updateVoter("e1", "v1", { email: "x@y.z" });
    expect(request).toHaveBeenCalledWith(`${root}/v1`, {
      method: "PATCH",
      body: { email: "x@y.z" },
    });
  });

  test("revokeVoter", async () => {
    await revokeVoter("e1", "v1");
    expect(request).toHaveBeenCalledWith(`${root}/v1`, { method: "DELETE" });
  });
});

describe("users API", () => {
  test("USER_TYPES", () => {
    expect(USER_TYPES).toEqual(["voters", "admins", "auditors"]);
  });

  test("listUsers", async () => {
    await listUsers("admins", { page: 3, q: "x" });
    expect(request).toHaveBeenCalledWith(`${CORE_API}/users/admins`, {
      query: { page: 3, q: "x" },
      signal: undefined,
    });
  });

  test("listUsers default params", async () => {
    await listUsers("voters");
    expect(request).toHaveBeenCalledWith(`${CORE_API}/users/voters`, {
      query: {},
      signal: undefined,
    });
  });

  test("createAdmin", async () => {
    const input = { name: "A", email: "a@b.c", password: "pw" };
    await createAdmin(input);
    expect(request).toHaveBeenCalledWith(`${CORE_API}/users/admins`, {
      method: "POST",
      body: input,
    });
  });
});

describe("audit-orgs API", () => {
  const root = `${CORE_API}/audit-orgs`;

  test("APPROVAL_STATUSES", () => {
    expect(APPROVAL_STATUSES).toEqual(["pending", "approved", "rejected"]);
  });

  test("listAuditOrgs with filter", async () => {
    await listAuditOrgs("pending");
    expect(request).toHaveBeenCalledWith(root, {
      query: { filter: "pending" },
      signal: undefined,
    });
  });

  test("listAuditOrgs without filter", async () => {
    await listAuditOrgs();
    expect(request).toHaveBeenCalledWith(root, {
      query: { filter: undefined },
      signal: undefined,
    });
  });

  test("approveAuditOrg", async () => {
    await approveAuditOrg("o1");
    expect(request).toHaveBeenCalledWith(`${root}/o1/approve`, {
      method: "POST",
      body: {},
    });
  });

  test("rejectAuditOrg", async () => {
    await rejectAuditOrg("o1", "bad");
    expect(request).toHaveBeenCalledWith(`${root}/o1/reject`, {
      method: "POST",
      body: { reason: "bad" },
    });
  });
});

describe("integrations API", () => {
  const root = `${API_BASE}/elections/e1/integration`;

  test("getIntegration returns the integration", async () => {
    request.mockResolvedValueOnce({ integrationId: "i1" });
    await expect(getIntegration("e1")).resolves.toEqual({
      integrationId: "i1",
    });
    expect(request).toHaveBeenCalledWith(root, { signal: undefined });
  });

  test("getIntegration swallows 404 into null", async () => {
    request.mockRejectedValueOnce({ status: 404 });
    await expect(getIntegration("e1")).resolves.toBeNull();
  });

  test("getIntegration rethrows non-404 errors", async () => {
    request.mockRejectedValueOnce({ status: 500 });
    await expect(getIntegration("e1")).rejects.toEqual({ status: 500 });
  });

  test("getIntegration rethrows errors without a status", async () => {
    const err = new Error("boom");
    request.mockRejectedValueOnce(err);
    await expect(getIntegration("e1")).rejects.toBe(err);
  });

  test("upsertIntegration puts the input", async () => {
    const input = { type: "http_api", config: {}, formFields: [] };
    await upsertIntegration("e1", input);
    expect(request).toHaveBeenCalledWith(root, { method: "PUT", body: input });
  });

  test("deleteIntegration", async () => {
    await deleteIntegration("e1");
    expect(request).toHaveBeenCalledWith(root, { method: "DELETE" });
  });
});
