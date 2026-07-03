export class ElectionsBlockData {
  constructor(
    private readonly voter: bigint,
    // A SHA-256 hex commitment to the encrypted ballot record. Kept as a
    // string (never a bigint) so master and workers hash the identical form —
    // BigInt round-tripping would drop leading zeros and diverge the hash.
    private readonly commitment: string,
  ) {}

  public toJSON() {
    return {
      voter: this.voter.toString(),
      commitment: this.commitment,
    };
  }
}
