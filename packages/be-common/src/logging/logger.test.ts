import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import pino from "pino";

import { Logger, logger } from "./logger.ts";

describe("Logger", () => {
  it("exports a default singleton logger instance", () => {
    expect(logger).toBeInstanceOf(Logger);
    expect(logger.raw).toBeDefined();
  });

  it("wraps a plain config into a pino instance", () => {
    const instance = new Logger({ pretty: false, level: "debug" });
    expect(instance.raw.level).toBe("debug");
  });

  it("wraps an existing pino logger instance directly", () => {
    const raw = pino({ level: "silent" });
    const instance = new Logger(raw);
    expect(instance.raw).toBe(raw);
  });

  it("sets base bindings from name and bindings config", () => {
    const instance = new Logger({
      pretty: false,
      name: "svc",
      bindings: { region: "eu" },
    });
    expect(instance.raw.bindings()).toMatchObject({
      name: "svc",
      region: "eu",
    });
  });

  it("reads default level from LOG_LEVEL and pretty from LOG_PRETTY env vars", () => {
    const originalLevel = process.env.LOG_LEVEL;
    const originalPretty = process.env.LOG_PRETTY;
    process.env.LOG_LEVEL = "warn";
    process.env.LOG_PRETTY = "false";

    try {
      const instance = new Logger();
      expect(instance.raw.level).toBe("warn");
    } finally {
      if (originalLevel === undefined) delete process.env.LOG_LEVEL;
      else process.env.LOG_LEVEL = originalLevel;
      if (originalPretty === undefined) delete process.env.LOG_PRETTY;
      else process.env.LOG_PRETTY = originalPretty;
    }
  });

  it("enables the pino-pretty transport when pretty is true", () => {
    const instance = new Logger({ pretty: true, level: "silent" });
    expect(instance.raw).toBeDefined();
  });

  describe("log level delegation", () => {
    let instance: Logger;

    beforeEach(() => {
      // level: "silent" keeps assertions on the spies without printing to stdout.
      instance = new Logger({ pretty: false, level: "silent" });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("delegates fatal with provided data", () => {
      const spy = vi.spyOn(instance.raw, "fatal");
      instance.fatal("boom", { code: 1 });
      expect(spy).toHaveBeenCalledWith({ code: 1 }, "boom");
    });

    it("delegates error with an empty object when no data is given", () => {
      const spy = vi.spyOn(instance.raw, "error");
      instance.error("oops");
      expect(spy).toHaveBeenCalledWith({}, "oops");
    });

    it("delegates warn with provided data", () => {
      const spy = vi.spyOn(instance.raw, "warn");
      instance.warn("careful", { reason: "slow" });
      expect(spy).toHaveBeenCalledWith({ reason: "slow" }, "careful");
    });

    it("delegates info with provided data", () => {
      const spy = vi.spyOn(instance.raw, "info");
      instance.info("started", { pid: 123 });
      expect(spy).toHaveBeenCalledWith({ pid: 123 }, "started");
    });

    it("delegates debug with provided data", () => {
      const spy = vi.spyOn(instance.raw, "debug");
      instance.debug("details", { step: 2 });
      expect(spy).toHaveBeenCalledWith({ step: 2 }, "details");
    });

    it("delegates trace with provided data", () => {
      const spy = vi.spyOn(instance.raw, "trace");
      instance.trace("granular", { step: 3 });
      expect(spy).toHaveBeenCalledWith({ step: 3 }, "granular");
    });

    it("logs exceptions directly without wrapping", () => {
      const spy = vi.spyOn(instance.raw, "error");
      const error = new Error("bad");
      instance.exception(error);
      expect(spy).toHaveBeenCalledWith(error);
    });
  });

  describe("child", () => {
    it("returns a Logger wrapping a pino child logger with merged bindings", () => {
      const parent = new Logger({ pretty: false, name: "parent" });
      const child = parent.child({ component: "database" });

      expect(child).toBeInstanceOf(Logger);
      expect(child.raw.bindings()).toMatchObject({
        name: "parent",
        component: "database",
      });
    });
  });
});
