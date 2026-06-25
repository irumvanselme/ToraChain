// Simplified pBFT consensus: collect BLOCK_VALIDATED responses within a
// timeout window and check whether ⌈2n/3⌉ nodes agree on the same hash.

export interface ValidationResponse {
  nodeId: string;
  hash: string;
}

export interface ConsensusResult {
  reached: boolean;
  agreedHash: string | null;
  agreeingNodes: string[];
  allResponses: ValidationResponse[];
}

const COLLECTION_TIMEOUT_MS = 5_000;

export function quorumRequired(connectedNodes: number): number {
  return Math.ceil((2 * connectedNodes) / 3);
}

export class PbftRound {
  private readonly responses: ValidationResponse[] = [];
  private readonly resolve: (result: ConsensusResult) => void;
  private readonly timer: Timer;
  private settled = false;

  constructor(
    private readonly totalNodes: number,
    onComplete: (result: ConsensusResult) => void,
  ) {
    this.resolve = onComplete;
    this.timer = setTimeout(
      () => this.settle(),
      COLLECTION_TIMEOUT_MS,
    );
  }

  collect(response: ValidationResponse): void {
    if (this.settled) return;
    this.responses.push(response);

    // Early exit: if enough nodes have already agreed, no need to wait
    const result = this.evaluate();
    if (result.reached) {
      clearTimeout(this.timer);
      this.settled = true;
      this.resolve(result);
    }
  }

  private settle(): void {
    if (this.settled) return;
    this.settled = true;
    this.resolve(this.evaluate());
  }

  private evaluate(): ConsensusResult {
    const tally = new Map<string, string[]>();
    for (const r of this.responses) {
      const nodes = tally.get(r.hash) ?? [];
      nodes.push(r.nodeId);
      tally.set(r.hash, nodes);
    }

    const needed = quorumRequired(this.totalNodes);

    for (const [hash, nodes] of tally) {
      if (nodes.length >= needed) {
        return {
          reached: true,
          agreedHash: hash,
          agreeingNodes: nodes,
          allResponses: [...this.responses],
        };
      }
    }

    return {
      reached: false,
      agreedHash: null,
      agreeingNodes: [],
      allResponses: [...this.responses],
    };
  }

  cancel(): void {
    clearTimeout(this.timer);
    this.settled = true;
  }
}

export function runPbftRound(
  totalNodes: number,
): { round: PbftRound; promise: Promise<ConsensusResult> } {
  let resolve!: (r: ConsensusResult) => void;
  const promise = new Promise<ConsensusResult>((res) => {
    resolve = res;
  });
  const round = new PbftRound(totalNodes, resolve);
  return { round, promise };
}
