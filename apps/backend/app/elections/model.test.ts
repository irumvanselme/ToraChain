import { describe, expect, test } from "vitest";

import { serializeElection, type ElectionRow } from "./model.ts";

const baseRow: ElectionRow = {
  electionId: "11111111-1111-1111-1111-111111111111",
  electionNumber: "123456789012345678901234567890",
  title: "2026 General Election",
  description: "Nationwide general election.",
  status: "active",
  startTime: new Date("2026-06-09T08:00:00.000Z"),
  endTime: new Date("2026-06-09T20:00:00.000Z"),
  deleted: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("serializeElection", () => {
  test("maps a row to the documented DTO and ISO timestamps", () => {
    expect(serializeElection(baseRow)).toEqual({
      electionId: "11111111-1111-1111-1111-111111111111",
      title: "2026 General Election",
      description: "Nationwide general election.",
      status: "active",
      startTime: "2026-06-09T08:00:00.000Z",
      endTime: "2026-06-09T20:00:00.000Z",
      deleted: false,
    });
  });

  test("omits server-side electionNumber and never leaks createdAt/updatedAt", () => {
    const dto = serializeElection(baseRow) as unknown as Record<
      string,
      unknown
    >;
    expect(dto).not.toHaveProperty("electionNumber");
    expect(dto).not.toHaveProperty("createdAt");
    expect(dto).not.toHaveProperty("updatedAt");
  });

  test("preserves null description and timestamps", () => {
    const dto = serializeElection({
      ...baseRow,
      description: null,
      startTime: null,
      endTime: null,
    });
    expect(dto.description).toBeNull();
    expect(dto.startTime).toBeNull();
    expect(dto.endTime).toBeNull();
  });
});
