import { describe, it, expect, afterEach, vi } from "vitest";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_VITE_NODE_ENV = process.env.VITE_NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  process.env.VITE_NODE_ENV = ORIGINAL_VITE_NODE_ENV;
});

async function loadLinks(nodeEnv: "development" | "demo") {
  delete process.env.VITE_NODE_ENV;
  process.env.NODE_ENV = nodeEnv;
  vi.resetModules();
  return await import("./links.ts");
}

describe("links in development", () => {
  it("points every service at its *.localhost dev port", async () => {
    const links = await loadLinks("development");
    expect(links.adminFeLink).toBe("http://admin.localhost:3000");
    expect(links.votingFeLink).toBe("http://voting.localhost:3001");
    expect(links.auditingFeLink).toBe("http://auditing.localhost:3002");
    expect(links.idpLink).toBe("http://idp.localhost:8001");
    expect(links.apiLink).toBe("http://api.localhost:8000");
    expect(links.chainNodeLink).toBe("http://localhost:7100");
  });
});

describe("links in demo", () => {
  it("points every service at its deployed demo URL", async () => {
    const links = await loadLinks("demo");
    expect(links.adminFeLink).toBe("https://admin.tora-chain-demo.iansel.me");
    expect(links.votingFeLink).toBe("https://tora-chain-demo.iansel.me");
    expect(links.auditingFeLink).toBe(
      "https://auditing.tora-chain-demo.iansel.me",
    );
    expect(links.idpLink).toBe("https://idp.tora-chain-demo.iansel.me");
    expect(links.apiLink).toBe("https://api.tora-chain-demo.iansel.me");
    expect(links.chainNodeLink).toBe("https://node.tora-chain-demo.iansel.me");
  });
});

describe("feLinkByUserType", () => {
  it("maps each identity domain to its own frontend", async () => {
    const links = await loadLinks("development");
    expect(links.feLinkByUserType.voters).toBe(links.votingFeLink);
    expect(links.feLinkByUserType.admins).toBe(links.adminFeLink);
    expect(links.feLinkByUserType.auditors).toBe(links.auditingFeLink);
  });
});

describe("DEV_LINKS", () => {
  it("lists one entry per frontend and backend, matching the computed links", async () => {
    const links = await loadLinks("development");
    expect(links.DEV_LINKS).toHaveLength(5);

    const byLabel = Object.fromEntries(
      links.DEV_LINKS.map((entry) => [entry.label, entry]),
    );
    expect(byLabel["Admin FE"]?.href).toBe(links.adminFeLink);
    expect(byLabel["Admin FE"]?.group).toBe("Frontends");
    expect(byLabel["Voting FE"]?.href).toBe(links.votingFeLink);
    expect(byLabel["Auditing FE"]?.href).toBe(links.auditingFeLink);
    expect(byLabel["Identity Provider"]?.href).toBe(links.idpLink);
    expect(byLabel["Identity Provider"]?.group).toBe("Backends");
    expect(byLabel["Elections API"]?.href).toBe(`${links.apiLink}/docs`);
    expect(byLabel["Elections API"]?.group).toBe("Backends");
  });
});
