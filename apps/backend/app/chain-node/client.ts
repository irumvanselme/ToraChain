export interface ChainVoteInput {
  electionId: string;
  votingNumber: string;
  candidateId: string;
}

export interface ChainNodeClient {
  submitVote(input: ChainVoteInput): void;
}

export class HttpChainNodeClient implements ChainNodeClient {
  constructor(private readonly baseUrl: string) {}

  submitVote(input: ChainVoteInput): void {
    // Fire-and-forget — the chain node is an audit trail; it must never block voting
    fetch(`${this.baseUrl}/api/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).catch(() => {
      // Intentionally swallowed: chain node being down must not surface to voters
    });
  }
}

export class NullChainNodeClient implements ChainNodeClient {
  submitVote(_input: ChainVoteInput): void {
    // No-op: chain node not configured
  }
}
