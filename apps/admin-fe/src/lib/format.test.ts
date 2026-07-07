import { describe, test, expect } from "vitest";
import {
  formatDateTime,
  isoToLocalInput,
  localInputToIso,
  statusLabel,
} from "./format.ts";

describe("formatDateTime", () => {
  test("returns an em dash for null", () => {
    expect(formatDateTime(null)).toBe("—");
  });

  test("returns an em dash for an invalid date", () => {
    expect(formatDateTime("not-a-date")).toBe("—");
  });

  test("formats a valid ISO string", () => {
    const out = formatDateTime("2024-01-02T03:04:00.000Z");
    expect(out).not.toBe("—");
    expect(out.length).toBeGreaterThan(0);
  });
});

describe("isoToLocalInput", () => {
  test("returns empty string for null", () => {
    expect(isoToLocalInput(null)).toBe("");
  });

  test("returns empty string for an invalid date", () => {
    expect(isoToLocalInput("nope")).toBe("");
  });

  test("produces a datetime-local shaped value", () => {
    const out = isoToLocalInput("2024-01-02T03:04:00.000Z");
    expect(out).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});

describe("localInputToIso", () => {
  test("returns null for empty input", () => {
    expect(localInputToIso("")).toBeNull();
  });

  test("returns null for an invalid value", () => {
    expect(localInputToIso("nope")).toBeNull();
  });

  test("round-trips through isoToLocalInput", () => {
    const local = isoToLocalInput("2024-06-15T10:30:00.000Z");
    const iso = localInputToIso(local);
    expect(iso).not.toBeNull();
    expect(isoToLocalInput(iso)).toBe(local);
  });
});

describe("statusLabel", () => {
  test("delegates to the shared label helper", () => {
    expect(typeof statusLabel("draft")).toBe("string");
    expect(statusLabel("draft").length).toBeGreaterThan(0);
  });
});
