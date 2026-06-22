import type { NodePgDatabase } from "drizzle-orm/node-postgres";

/** A recorded builder call: the method name and the arguments it received. */
export interface FakeCall {
  method: string;
  args: unknown[];
}

/**
 * Minimal stand-in for a Drizzle `NodePgDatabase`, used to unit-test our
 * repositories without a real Postgres.
 *
 * Every query-builder method returns the same chainable instance, so a chain
 * like `db.select().from(t).where(c).limit(1)` is recorded call-by-call. The
 * instance is *thenable*: `await`-ing a chain dequeues the next canned result
 * from `results` (FIFO). One top-level `await` consumes exactly one result, so
 * a method that runs two queries (e.g. rows + count) needs two queued results
 * in the order they are awaited.
 *
 * Only the builder surface our repositories actually use is implemented.
 */
export class FakeDrizzle {
  results: unknown[];
  readonly calls: FakeCall[] = [];

  constructor(results: unknown[] = []) {
    this.results = [...results];
  }

  /** Append more canned results (handy between assertions in one test). */
  queue(...results: unknown[]): this {
    this.results.push(...results);
    return this;
  }

  private record(method: string, ...args: unknown[]): this {
    this.calls.push({ method, args });
    return this;
  }

  private dequeue(): unknown {
    if (this.results.length === 0) {
      throw new Error("FakeDrizzle: no queued result for the awaited query");
    }
    return this.results.shift();
  }

  // ---- read builder ------------------------------------------------------
  select(...a: unknown[]): this {
    return this.record("select", ...a);
  }
  from(...a: unknown[]): this {
    return this.record("from", ...a);
  }
  innerJoin(...a: unknown[]): this {
    return this.record("innerJoin", ...a);
  }
  where(...a: unknown[]): this {
    return this.record("where", ...a);
  }
  orderBy(...a: unknown[]): this {
    return this.record("orderBy", ...a);
  }
  groupBy(...a: unknown[]): this {
    return this.record("groupBy", ...a);
  }
  limit(...a: unknown[]): this {
    return this.record("limit", ...a);
  }
  offset(...a: unknown[]): this {
    return this.record("offset", ...a);
  }

  // ---- write builder -----------------------------------------------------
  insert(...a: unknown[]): this {
    return this.record("insert", ...a);
  }
  update(...a: unknown[]): this {
    return this.record("update", ...a);
  }
  values(...a: unknown[]): this {
    return this.record("values", ...a);
  }
  set(...a: unknown[]): this {
    return this.record("set", ...a);
  }
  returning(...a: unknown[]): this {
    return this.record("returning", ...a);
  }

  /** Runs the callback with this same instance as the transaction handle. */
  async transaction<T>(cb: (tx: this) => Promise<T>): Promise<T> {
    this.record("transaction");
    return cb(this);
  }

  // ---- thenable: awaiting a chain yields the next queued result ----------
  then<R1 = unknown, R2 = never>(
    onF?: ((value: unknown) => R1 | PromiseLike<R1>) | null,
    onR?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): Promise<R1 | R2> {
    try {
      return Promise.resolve(this.dequeue()).then(onF, onR);
    } catch (error) {
      return Promise.reject(error).then(onF, onR);
    }
  }

  // ---- assertion helpers -------------------------------------------------

  /** Args of the most recent call to `method`, or undefined if never called. */
  lastArgs(method: string): unknown[] | undefined {
    for (let i = this.calls.length - 1; i >= 0; i--) {
      if (this.calls[i]!.method === method) return this.calls[i]!.args;
    }
    return undefined;
  }

  /** How many times `method` was called. */
  countOf(method: string): number {
    return this.calls.filter((c) => c.method === method).length;
  }

  /** Cast to the Drizzle type expected by repository constructors. */
  asDb(): NodePgDatabase {
    return this as unknown as NodePgDatabase;
  }
}

export const fakeDb = (results: unknown[] = []): FakeDrizzle =>
  new FakeDrizzle(results);
