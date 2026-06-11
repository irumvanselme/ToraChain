import { ElectionBlock } from "./block.ts";
import { ElectionsBlockData } from "./block-data.ts";
import assert from "node:assert";

interface ElectionBlockInput {
  voter: bigint;
  candidate: bigint;
}

export class BlockChain {
  private readonly blocks: ElectionBlock[];

  constructor(private readonly election: bigint) {
    this.blocks = [BlockChain.getGenesisBlock(election)];
  }

  public addBlock(block: ElectionBlockInput) {
    let previousBlock = this.blocks[this.blocks.length - 1];
    assert(
      previousBlock,
      "Previous block can not be undefined since we have a genesis block",
    );

    this.blocks.push(
      new ElectionBlock(
        this.blocks.length + 1,
        new ElectionsBlockData(block.voter, block.candidate),
        Date.now(),
        previousBlock.hash,
      ),
    );
  }

  static getGenesisBlock(election: bigint) {
    return new ElectionBlock(0, new ElectionsBlockData(0n, 0n), Date.now(), 0n);
  }
}
