import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockExecute, mockPoolOn, mockPoolEnd, PoolMock, drizzleMock } =
  vi.hoisted(() => {
    const mockExecute = vi.fn();
    const mockPoolOn = vi.fn();
    const mockPoolEnd = vi.fn();
    const PoolMock = vi.fn().mockImplementation((config: unknown) => ({
      on: mockPoolOn,
      end: mockPoolEnd,
      __config: config,
    }));
    const drizzleMock = vi.fn().mockReturnValue({ execute: mockExecute });
    return { mockExecute, mockPoolOn, mockPoolEnd, PoolMock, drizzleMock };
  });

vi.mock("pg", () => ({
  Pool: PoolMock,
}));

vi.mock("drizzle-orm/node-postgres", () => ({
  drizzle: drizzleMock,
}));

import { Database, type DatabaseConfig } from "./database.ts";
import type { Logger } from "../logging/logger.ts";

function createMockLogger() {
  const log: Record<string, ReturnType<typeof vi.fn>> = {
    child: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  };
  log.child!.mockReturnValue(log);
  return log as unknown as Logger & typeof log;
}

describe("Database", () => {
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPoolEnd.mockResolvedValue(undefined);
    drizzleMock.mockReturnValue({ execute: mockExecute });
    mockLogger = createMockLogger();
  });

  describe("pool configuration", () => {
    it("builds a connection-string pool config when url is provided", () => {
      const config: DatabaseConfig = {
        url: "postgres://user:pass@host:5432/db",
        max: 5,
        connectionTimeoutMs: 1000,
      };
      new Database(config, undefined, mockLogger);

      expect(PoolMock).toHaveBeenCalledWith({
        max: 5,
        connectionTimeoutMillis: 1000,
        ssl: undefined,
        connectionString: config.url,
      });
    });

    it("builds a discrete pool config when url is not provided", () => {
      const config: DatabaseConfig = {
        host: "localhost",
        port: 5432,
        user: "u",
        password: "p",
        database: "d",
      };
      new Database(config, undefined, mockLogger);

      expect(PoolMock).toHaveBeenCalledWith({
        max: undefined,
        connectionTimeoutMillis: undefined,
        ssl: undefined,
        host: "localhost",
        port: 5432,
        user: "u",
        password: "p",
        database: "d",
      });
    });

    it("enables ssl with rejectUnauthorized false when ssl is true", () => {
      new Database({ url: "postgres://x", ssl: true }, undefined, mockLogger);

      expect(PoolMock).toHaveBeenCalledWith(
        expect.objectContaining({ ssl: { rejectUnauthorized: false } }),
      );
    });

    it("leaves ssl undefined when ssl is false", () => {
      new Database({ url: "postgres://x", ssl: false }, undefined, mockLogger);

      expect(PoolMock).toHaveBeenCalledWith(
        expect.objectContaining({ ssl: undefined }),
      );
    });
  });

  describe("construction", () => {
    it("scopes a child logger to the database component", () => {
      new Database({ url: "postgres://x" }, undefined, mockLogger);
      expect(mockLogger.child).toHaveBeenCalledWith({
        component: "database",
      });
    });

    it("registers a pool error handler that logs unexpected errors", () => {
      new Database({ url: "postgres://x" }, undefined, mockLogger);

      expect(mockPoolOn).toHaveBeenCalledWith("error", expect.any(Function));
      const handler = mockPoolOn.mock.calls[0]![1] as (err: Error) => void;
      handler(new Error("connection dropped"));

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Unexpected error on idle Postgres client",
        { error: "connection dropped" },
      );
    });

    it("passes the provided schema through to drizzle", () => {
      const schema = { users: {} };
      new Database({ url: "postgres://x" }, schema, mockLogger);

      expect(drizzleMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ schema, logger: false }),
      );
    });
  });

  describe("connect", () => {
    it("executes a health check query and logs success", async () => {
      mockExecute.mockResolvedValueOnce(undefined);
      const db = new Database({ url: "postgres://x" }, undefined, mockLogger);

      await db.connect();

      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith("Connected to Postgres");
    });

    it("propagates errors from the health check", async () => {
      mockExecute.mockRejectedValueOnce(new Error("refused"));
      const db = new Database({ url: "postgres://x" }, undefined, mockLogger);

      await expect(db.connect()).rejects.toThrow("refused");
    });
  });

  describe("ping", () => {
    it("returns true when the query succeeds", async () => {
      mockExecute.mockResolvedValueOnce(undefined);
      const db = new Database({ url: "postgres://x" }, undefined, mockLogger);

      await expect(db.ping()).resolves.toBe(true);
    });

    it("returns false and logs a warning with the error message on Error rejection", async () => {
      mockExecute.mockRejectedValueOnce(new Error("timeout"));
      const db = new Database({ url: "postgres://x" }, undefined, mockLogger);

      await expect(db.ping()).resolves.toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith("Postgres ping failed", {
        error: "timeout",
      });
    });

    it("returns false and stringifies non-Error rejections", async () => {
      mockExecute.mockRejectedValueOnce("plain string failure");
      const db = new Database({ url: "postgres://x" }, undefined, mockLogger);

      await expect(db.ping()).resolves.toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith("Postgres ping failed", {
        error: "plain string failure",
      });
    });
  });

  describe("close", () => {
    it("ends the pool and logs once", async () => {
      const db = new Database({ url: "postgres://x" }, undefined, mockLogger);

      await db.close();

      expect(mockPoolEnd).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Postgres connection pool closed",
      );
    });

    it("is idempotent when called multiple times", async () => {
      const db = new Database({ url: "postgres://x" }, undefined, mockLogger);

      await db.close();
      await db.close();

      expect(mockPoolEnd).toHaveBeenCalledTimes(1);
    });
  });
});
