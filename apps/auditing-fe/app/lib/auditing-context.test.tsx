import { useContext } from "react";
import { describe, test, expect, vi } from "vitest";
import { useAudit, AuditContext } from "./audit-context";

vi.mock("react");

describe("Auditing Context", () => {
  describe("useAudit", () => {
    test("should return the result from useContext", () => {
      useAudit();
      expect(useContext).toHaveBeenCalledWith(AuditContext);
    });
  });
});
