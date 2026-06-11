export class ElectionsBlockData {
  constructor(
    private readonly voter: bigint,
    private readonly candidate: bigint,
  ) {}

  public toJSON() {
    return {
      voter: this.voter.toString(),
      candidate: this.candidate.toString(),
    };
  }
}
