import { describe, test, expect, vi, beforeEach } from "vitest";
import {
  render,
  renderHook,
  screen,
  waitFor,
  act,
} from "@testing-library/react";

const fetchAuditorToken = vi.fn();
const fetchAuditStatus = vi.fn();

vi.mock("../api/token.ts", () => ({
  fetchAuditorToken: () => fetchAuditorToken(),
}));

vi.mock("../api/org.ts", () => ({
  fetchAuditStatus: () => fetchAuditStatus(),
}));

import { AuditProvider, useAudit } from "./audit-context";

const status = {
  userId: "u1",
  name: "Aud",
  email: "a@b.c",
  org: null,
};

function Consumer() {
  const { token, auditStatus, loading, refresh } = useAudit();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="token">{token ?? "none"}</span>
      <span data-testid="status">
        {auditStatus ? auditStatus.userId : "no"}
      </span>
      <button onClick={() => void refresh()}>refresh</button>
    </div>
  );
}

describe("AuditProvider", () => {
  beforeEach(() => {
    fetchAuditorToken.mockReset();
    fetchAuditStatus.mockReset();
  });

  test("loads token and status on mount, then clears loading", async () => {
    fetchAuditorToken.mockResolvedValue("jwt-1");
    fetchAuditStatus.mockResolvedValue(status);

    render(
      <AuditProvider>
        <Consumer />
      </AuditProvider>,
    );

    // Initially loading.
    expect(screen.getByTestId("loading").textContent).toBe("true");

    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );
    expect(screen.getByTestId("token").textContent).toBe("jwt-1");
    expect(screen.getByTestId("status").textContent).toBe("u1");
  });

  test("handles a null session gracefully", async () => {
    fetchAuditorToken.mockResolvedValue(null);
    fetchAuditStatus.mockResolvedValue(null);

    render(
      <AuditProvider>
        <Consumer />
      </AuditProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );
    expect(screen.getByTestId("token").textContent).toBe("none");
    expect(screen.getByTestId("status").textContent).toBe("no");
  });

  test("refresh re-fetches token and status", async () => {
    fetchAuditorToken.mockResolvedValueOnce(null);
    fetchAuditStatus.mockResolvedValueOnce(null);

    render(
      <AuditProvider>
        <Consumer />
      </AuditProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );

    fetchAuditorToken.mockResolvedValueOnce("jwt-2");
    fetchAuditStatus.mockResolvedValueOnce(status);

    await act(async () => {
      screen.getByText("refresh").click();
    });

    await waitFor(() =>
      expect(screen.getByTestId("token").textContent).toBe("jwt-2"),
    );
    expect(screen.getByTestId("status").textContent).toBe("u1");
  });
});

describe("useAudit default context", () => {
  test("provides safe defaults with no provider", async () => {
    const { result } = renderHook(() => useAudit());
    expect(result.current.token).toBeNull();
    expect(result.current.auditStatus).toBeNull();
    expect(result.current.loading).toBe(true);
    await expect(result.current.refresh()).resolves.toBeUndefined();
  });
});
