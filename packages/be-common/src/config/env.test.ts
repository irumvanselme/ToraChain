import { describe, it, expect, beforeEach, afterEach } from "vitest";

import {
  MissingEnvError,
  getEnv,
  requireEnv,
  getNumberEnv,
  getBoolEnv,
  getNodeEnv,
  isProduction,
} from "./env.ts";

const KEY = "BE_COMMON_TEST_VAR";
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

describe("MissingEnvError", () => {
  it("names the missing key in its message", () => {
    const error = new MissingEnvError(KEY);
    expect(error.name).toBe("MissingEnvError");
    expect(error.message).toBe(`Missing required environment variable: ${KEY}`);
    expect(error).toBeInstanceOf(Error);
  });
});

describe("getEnv", () => {
  beforeEach(() => stash(KEY));
  afterEach(restore);

  it("returns the value when set", () => {
    process.env[KEY] = "hello";
    expect(getEnv(KEY)).toBe("hello");
  });

  it("returns the fallback when unset", () => {
    delete process.env[KEY];
    expect(getEnv(KEY, "fallback")).toBe("fallback");
  });

  it("returns the fallback when the value is an empty string", () => {
    process.env[KEY] = "";
    expect(getEnv(KEY, "fallback")).toBe("fallback");
  });

  it("returns undefined when unset and no fallback is given", () => {
    delete process.env[KEY];
    expect(getEnv(KEY)).toBeUndefined();
  });
});

describe("requireEnv", () => {
  beforeEach(() => stash(KEY));
  afterEach(restore);

  it("returns the value when set", () => {
    process.env[KEY] = "hello";
    expect(requireEnv(KEY)).toBe("hello");
  });

  it("throws MissingEnvError when unset", () => {
    delete process.env[KEY];
    expect(() => requireEnv(KEY)).toThrow(MissingEnvError);
  });

  it("throws MissingEnvError when the value is an empty string", () => {
    process.env[KEY] = "";
    expect(() => requireEnv(KEY)).toThrow(MissingEnvError);
  });
});

describe("getNumberEnv", () => {
  beforeEach(() => stash(KEY));
  afterEach(restore);

  it("parses a numeric value", () => {
    process.env[KEY] = "42";
    expect(getNumberEnv(KEY, 0)).toBe(42);
  });

  it("returns the fallback when unset", () => {
    delete process.env[KEY];
    expect(getNumberEnv(KEY, 7)).toBe(7);
  });

  it("returns the fallback when the value is an empty string", () => {
    process.env[KEY] = "";
    expect(getNumberEnv(KEY, 7)).toBe(7);
  });

  it("returns the fallback when the value is not a finite number", () => {
    process.env[KEY] = "not-a-number";
    expect(getNumberEnv(KEY, 7)).toBe(7);
  });
});

describe("getBoolEnv", () => {
  beforeEach(() => stash(KEY));
  afterEach(restore);

  it.each(["1", "true", "yes", "on", "TRUE", "On"])(
    "treats %s as true",
    (value) => {
      process.env[KEY] = value;
      expect(getBoolEnv(KEY)).toBe(true);
    },
  );

  it.each(["0", "false", "no", "off", "garbage"])(
    "treats %s as false",
    (value) => {
      process.env[KEY] = value;
      expect(getBoolEnv(KEY)).toBe(false);
    },
  );

  it("returns the fallback when unset", () => {
    delete process.env[KEY];
    expect(getBoolEnv(KEY, true)).toBe(true);
    expect(getBoolEnv(KEY)).toBe(false);
  });

  it("returns the fallback when the value is an empty string", () => {
    process.env[KEY] = "";
    expect(getBoolEnv(KEY, true)).toBe(true);
  });
});

describe("getNodeEnv / isProduction", () => {
  beforeEach(() => stash("NODE_ENV"));
  afterEach(restore);

  it("returns 'production' when NODE_ENV is production", () => {
    process.env.NODE_ENV = "production";
    expect(getNodeEnv()).toBe("production");
    expect(isProduction()).toBe(true);
  });

  it("returns 'test' when NODE_ENV is test", () => {
    process.env.NODE_ENV = "test";
    expect(getNodeEnv()).toBe("test");
    expect(isProduction()).toBe(false);
  });

  it("is case-insensitive", () => {
    process.env.NODE_ENV = "PRODUCTION";
    expect(getNodeEnv()).toBe("production");
  });

  it("defaults to 'development' for unset or unrecognized values", () => {
    delete process.env.NODE_ENV;
    expect(getNodeEnv()).toBe("development");

    process.env.NODE_ENV = "staging";
    expect(getNodeEnv()).toBe("development");
    expect(isProduction()).toBe(false);
  });
});
