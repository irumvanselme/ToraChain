import { describe, it, expect, beforeEach, afterEach } from "vitest";

import {
  getEnv,
  isDevelopment,
  isDemo,
  getEnvironmentFullName,
} from "./env.ts";

const originalEnv: Record<string, string | undefined> = {};

function stash(...keys: string[]) {
  for (const key of keys) originalEnv[key] = process.env[key];
}

function restore() {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

describe("getEnv", () => {
  beforeEach(() => stash("NODE_ENV", "VITE_NODE_ENV"));
  afterEach(restore);

  it("returns 'development' when NODE_ENV is development", () => {
    delete process.env.VITE_NODE_ENV;
    process.env.NODE_ENV = "development";
    expect(getEnv()).toBe("development");
  });

  it("returns 'demo' when NODE_ENV is demo", () => {
    delete process.env.VITE_NODE_ENV;
    process.env.NODE_ENV = "demo";
    expect(getEnv()).toBe("demo");
  });

  it("maps 'production' to 'demo'", () => {
    delete process.env.VITE_NODE_ENV;
    process.env.NODE_ENV = "production";
    expect(getEnv()).toBe("demo");
  });

  it("maps 'test' to 'development'", () => {
    delete process.env.VITE_NODE_ENV;
    process.env.NODE_ENV = "test";
    expect(getEnv()).toBe("development");
  });

  it("prefers VITE_NODE_ENV over NODE_ENV", () => {
    process.env.VITE_NODE_ENV = "demo";
    process.env.NODE_ENV = "development";
    expect(getEnv()).toBe("demo");
  });

  it("throws for an unrecognized value", () => {
    delete process.env.VITE_NODE_ENV;
    process.env.NODE_ENV = "staging";
    expect(() => getEnv()).toThrow(/Invalid NODE_ENV staging/);
  });

  it("throws when neither VITE_NODE_ENV nor NODE_ENV is set", () => {
    delete process.env.VITE_NODE_ENV;
    delete process.env.NODE_ENV;
    expect(() => getEnv()).toThrow(/Invalid NODE_ENV/);
  });
});

describe("isDevelopment / isDemo", () => {
  beforeEach(() => stash("NODE_ENV", "VITE_NODE_ENV"));
  afterEach(restore);

  it("isDevelopment is true only in development", () => {
    delete process.env.VITE_NODE_ENV;
    process.env.NODE_ENV = "development";
    expect(isDevelopment()).toBe(true);
    expect(isDemo()).toBe(false);
  });

  it("isDemo is true only in demo", () => {
    delete process.env.VITE_NODE_ENV;
    process.env.NODE_ENV = "demo";
    expect(isDemo()).toBe(true);
    expect(isDevelopment()).toBe(false);
  });
});

describe("getEnvironmentFullName", () => {
  beforeEach(() => stash("NODE_ENV", "VITE_NODE_ENV"));
  afterEach(restore);

  it("capitalizes the environment name", () => {
    delete process.env.VITE_NODE_ENV;
    process.env.NODE_ENV = "development";
    expect(getEnvironmentFullName()).toBe("Development");

    process.env.NODE_ENV = "demo";
    expect(getEnvironmentFullName()).toBe("Demo");
  });
});
