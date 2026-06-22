import { describe, expect, test } from "vitest";

import { serializeCandidate, type CandidateRow } from "./model.ts";

const row: CandidateRow = {
  candidateId: "33333333-3333-3333-3333-333333333333",
  electionId: "11111111-1111-1111-1111-111111111111",
  fullName: "Jane Doe",
  manifesto: "A fairer future for all.",
  candidateNumber: "987654321098765432109876543210",
  deleted: false,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("serializeCandidate", () => {
  test("maps a row to the documented DTO", () => {
    expect(serializeCandidate(row)).toEqual({
      candidateId: "33333333-3333-3333-3333-333333333333",
      electionId: "11111111-1111-1111-1111-111111111111",
      fullName: "Jane Doe",
      manifesto: "A fairer future for all.",
      deleted: false,
    });
  });

  test("omits server-side candidateNumber", () => {
    expect(serializeCandidate(row)).not.toHaveProperty("candidateNumber");
  });

  test("preserves null manifesto", () => {
    expect(
      serializeCandidate({ ...row, manifesto: null }).manifesto,
    ).toBeNull();
  });
});
