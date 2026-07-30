/**
 * Runs jobs strictly one after another.
 *
 * Appending to a chain is read-tip-then-write, so two overlapping appends could
 * both build on the same tip. Both node roles funnel their chain writes through
 * one of these — the master its votes, a worker the blocks it receives.
 */
export class SerialQueue {
  private tail: Promise<unknown> = Promise.resolve();

  public run<T>(job: () => Promise<T>): Promise<T> {
    // Chain onto the tail on both paths so one failed job does not stall the
    // queue, and keep the tail settled so failures aren't re-thrown downstream.
    const result = this.tail.then(job, job);
    this.tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}
