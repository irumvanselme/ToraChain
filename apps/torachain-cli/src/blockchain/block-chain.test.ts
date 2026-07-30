import { describe, test, expect } from "vitest";

import { BlockChain } from "./block-chain.ts";
import { ElectionBlock, GENESIS_INDEX } from "./block.ts";
import { ElectionsBlockData } from "./block-data.ts";
import { InMemoryBlockChainStorageService } from "./_test-utils/in-memory-storage-service.ts";
import { randomBigInt } from "./_test-utils/random-big-int.ts";

const ELECTION = "election-1";

function aVote() {
  return { voter: randomBigInt(8), commitment: randomBigInt(8).toString(16) };
}

/** A chain of `count` real blocks (on top of genesis), in wire form. */
async function aChainOf(count: number, election = ELECTION) {
  const storage = new InMemoryBlockChainStorageService();
  const chain = await BlockChain.load(election, storage);
  for (let i = 0; i < count; i++) await chain.addBlock(aVote());
  return chain.serialize();
}

describe("BlockChain", () => {
  describe("Loading", () => {
    test("an election with nothing stored should load an empty chain", async () => {
      // GIVEN empty storage
      const storage = new InMemoryBlockChainStorageService();

      // WHEN we load an election's chain
      const chain = await BlockChain.load(ELECTION, storage);

      // THEN nothing is in it yet — a chain does not open itself
      expect(chain.isEmpty).toBe(true);
      expect(chain.length).toBe(0);
      expect(chain.tip).toBeNull();
      expect(storage.appended).toHaveLength(0);
    });

    test("should rebuild the chain from what storage holds", async () => {
      // GIVEN a persisted chain
      const persisted = await aChainOf(3);
      const storage = new InMemoryBlockChainStorageService(persisted);

      // WHEN a node loads it
      const chain = await BlockChain.load(ELECTION, storage);

      // THEN it holds the same blocks, verified, in order
      expect(chain.length).toBe(4); // genesis + 3
      expect(chain.isValid()).toBe(true);
      expect(chain.serialize()).toEqual(persisted);
      expect(chain.tip?.blockIndex).toBe(3);
    });

    test("should load only the blocks of its own election", async () => {
      // GIVEN storage holding two elections
      const storage = new InMemoryBlockChainStorageService([
        ...(await aChainOf(2, "election-a")),
        ...(await aChainOf(3, "election-b")),
      ]);

      // WHEN we load one of them
      const chain = await BlockChain.load("election-b", storage);

      // THEN only that election's blocks are in it
      expect(chain.length).toBe(4); // genesis + 3
      expect(
        chain.serialize().every((b) => b.electionId === "election-b"),
      ).toBe(true);
    });

    test("should rebuild in index order however storage returns the blocks", async () => {
      // GIVEN a persisted chain handed back shuffled
      const persisted = await aChainOf(3);
      const storage = new InMemoryBlockChainStorageService(
        [...persisted].reverse(),
      );

      // WHEN we load it
      const chain = await BlockChain.load(ELECTION, storage);

      // THEN the chain is ordered and links up
      expect(chain.serialize().map((b) => b.index)).toEqual([0, 1, 2, 3]);
      expect(chain.isValid()).toBe(true);
    });
  });

  describe("addBlock", () => {
    test("the first vote should open the chain with a genesis block", async () => {
      // GIVEN an election with no chain yet
      const storage = new InMemoryBlockChainStorageService();
      const chain = await BlockChain.load(ELECTION, storage);

      // WHEN the first vote is recorded
      const block = await chain.addBlock(aVote());

      // THEN genesis was created for it and the vote sits on top
      expect(chain.length).toBe(2);
      expect(chain.serialize()[0]).toMatchObject({
        index: GENESIS_INDEX,
        hash: "0",
      });
      expect(block.blockIndex).toBe(1);
      expect(block.electionId).toBe(ELECTION);
      expect(chain.isValid()).toBe(true);
    });

    test("blocks should be numbered consecutively from genesis", async () => {
      // GIVEN a chain
      const storage = new InMemoryBlockChainStorageService();
      const chain = await BlockChain.load(ELECTION, storage);

      // WHEN three votes are recorded
      const indices = [];
      for (let i = 0; i < 3; i++) {
        indices.push((await chain.addBlock(aVote())).blockIndex);
      }

      // THEN they take 1, 2, 3 — no gaps, no skipped index
      expect(indices).toEqual([1, 2, 3]);
      expect(chain.serialize().map((b) => b.index)).toEqual([0, 1, 2, 3]);
    });

    test("each block should chain onto the hash of the previous one", async () => {
      // GIVEN a chain with several votes
      const storage = new InMemoryBlockChainStorageService();
      const chain = await BlockChain.load(ELECTION, storage);
      for (let i = 0; i < 3; i++) await chain.addBlock(aVote());

      // WHEN we walk it
      const blocks = chain.serialize();

      // THEN every block points at its parent's hash
      for (let i = 1; i < blocks.length; i++) {
        expect(blocks[i]!.prevHash).toBe(blocks[i - 1]!.hash);
      }
      expect(chain.isValid()).toBe(true);
    });

    test("should record the vote's voter and commitment verbatim", async () => {
      // GIVEN a vote
      const storage = new InMemoryBlockChainStorageService();
      const chain = await BlockChain.load(ELECTION, storage);
      const vote = { voter: 42n, commitment: "0abc" };

      // WHEN it is recorded
      const block = await chain.addBlock(vote);

      // THEN the commitment is anchored exactly as given — leading zero and all
      expect(block.toJSON().data).toEqual({
        voter: "42",
        commitment: "0abc",
      });
    });

    test("should persist every block it appends, in serialized form", async () => {
      // GIVEN a chain over a storage service
      const storage = new InMemoryBlockChainStorageService();
      const chain = await BlockChain.load(ELECTION, storage);

      // WHEN two votes are recorded
      await chain.addBlock(aVote());
      await chain.addBlock(aVote());

      // THEN genesis and both votes reached storage as JSON
      expect(storage.appended).toHaveLength(3);
      expect(storage.appended.map((b) => b.index)).toEqual([0, 1, 2]);
      expect(await storage.getAll(ELECTION)).toEqual(chain.serialize());
    });

    test("should notify onAppend for every appended block, genesis included", async () => {
      // GIVEN a chain with an observer (this is how the master publishes)
      const storage = new InMemoryBlockChainStorageService();
      const published: number[] = [];
      const chain = await BlockChain.load(ELECTION, storage, {
        onAppend: (block) => published.push(block.blockIndex),
      });

      // WHEN two votes are recorded
      await chain.addBlock(aVote());
      await chain.addBlock(aVote());

      // THEN the observer saw genesis and both, in order
      expect(published).toEqual([0, 1, 2]);
    });

    test("should not notify onAppend for blocks loaded from storage", async () => {
      // GIVEN an already-persisted chain
      const storage = new InMemoryBlockChainStorageService(await aChainOf(2));
      const published: number[] = [];

      // WHEN it is loaded
      const chain = await BlockChain.load(ELECTION, storage, {
        onAppend: (block) => published.push(block.blockIndex),
      });

      // THEN loading is silent — only new blocks are announced
      expect(chain.length).toBe(3);
      expect(published).toEqual([]);
    });

    test("should continue a chain that was loaded from storage", async () => {
      // GIVEN a node restarting on a persisted chain
      const storage = new InMemoryBlockChainStorageService(await aChainOf(2));
      const chain = await BlockChain.load(ELECTION, storage);

      // WHEN a new vote comes in
      const block = await chain.addBlock(aVote());

      // THEN it picks up where the stored chain left off
      expect(block.blockIndex).toBe(3);
      expect(block.toJSON().prevHash).toBe(chain.serialize()[2]!.hash);
      expect(chain.isValid()).toBe(true);
    });
  });

  describe("accept", () => {
    test("should take in a valid block and append it", async () => {
      // GIVEN a replica holding the same chain as its source
      const source = await aChainOf(1);
      const storage = new InMemoryBlockChainStorageService(source);
      const replica = await BlockChain.load(ELECTION, storage);

      // AND the next block committed at the source
      const next = ElectionBlock.fromJSON(source[1]!).next(
        new ElectionsBlockData(7n, "ff"),
      );

      // WHEN the replica receives it
      const result = await replica.accept(next.toJSON());

      // THEN it is appended and persisted
      expect(result.status).toBe("appended");
      expect(replica.tip?.hash).toBe(next.hash);
      expect(storage.appended).toEqual([next.toJSON()]);
    });

    test("should reject a block whose hash does not match its contents", async () => {
      // GIVEN a replica and a block whose commitment was rewritten in transit
      const source = await aChainOf(1);
      const storage = new InMemoryBlockChainStorageService([source[0]!]);
      const replica = await BlockChain.load(ELECTION, storage);
      const tampered = {
        ...source[1]!,
        data: { ...source[1]!.data, commitment: "deadbeef" },
      };

      // WHEN the replica receives it
      const result = await replica.accept(tampered);

      // THEN it is refused and nothing is written
      expect(result).toEqual({ status: "rejected", reason: "invalid-hash" });
      expect(replica.length).toBe(1);
      expect(storage.appended).toHaveLength(0);
    });

    test("should reject a block whose hashes are not hex", async () => {
      // GIVEN a replica and a malformed block
      const storage = new InMemoryBlockChainStorageService();
      const replica = await BlockChain.load(ELECTION, storage);
      const malformed = {
        ...(await aChainOf(1))[1]!,
        hash: "not-a-hash",
      };

      // WHEN the replica receives it
      const result = await replica.accept(malformed);

      // THEN it is refused rather than throwing
      expect(result).toEqual({ status: "rejected", reason: "invalid-hash" });
      expect(storage.appended).toHaveLength(0);
    });

    test("should reject a block belonging to another election", async () => {
      // GIVEN a chain for one election and a block from another
      const storage = new InMemoryBlockChainStorageService();
      const chain = await BlockChain.load("election-a", storage);
      const foreign = (await aChainOf(1, "election-b"))[1]!;

      // WHEN it is offered
      const result = await chain.accept(foreign);

      // THEN it does not get in
      expect(result).toEqual({ status: "rejected", reason: "wrong-election" });
      expect(chain.isEmpty).toBe(true);
    });

    test("should ignore a block it already holds", async () => {
      // GIVEN a replica that already has the block (pub/sub redelivers)
      const source = await aChainOf(1);
      const storage = new InMemoryBlockChainStorageService(source);
      const replica = await BlockChain.load(ELECTION, storage);

      // WHEN the same block arrives again
      const result = await replica.accept(source[1]!);

      // THEN it is a no-op, not a second entry
      expect(result).toEqual({ status: "duplicate" });
      expect(replica.length).toBe(2);
      expect(storage.appended).toHaveLength(0);
    });

    test("should keep a block that overtakes its parent, flagged out-of-order", async () => {
      // GIVEN a replica holding only genesis
      const source = await aChainOf(2);
      const storage = new InMemoryBlockChainStorageService([source[0]!]);
      const replica = await BlockChain.load(ELECTION, storage);

      // WHEN block 2 arrives before block 1
      const overtaking = await replica.accept(source[2]!);

      // THEN it is kept — its hash checks out — but reported as out of order
      expect(overtaking.status).toBe("out-of-order");
      expect(replica.length).toBe(2);

      // AND when the missing parent arrives, it slots in ahead of it
      const late = await replica.accept(source[1]!);
      expect(late.status).toBe("appended");
      expect(replica.serialize().map((b) => b.index)).toEqual([0, 1, 2]);
      expect(replica.isValid()).toBe(true);
      expect(replica.tip?.blockIndex).toBe(2);
    });
  });

  describe("isValid", () => {
    test("a chain built through addBlock should verify end to end", async () => {
      // GIVEN a chain of votes
      const storage = new InMemoryBlockChainStorageService();
      const chain = await BlockChain.load(ELECTION, storage);
      for (let i = 0; i < 5; i++) await chain.addBlock(aVote());

      // THEN it verifies
      expect(chain.isValid()).toBe(true);
    });

    test("a chain rebuilt from tampered storage should not verify", async () => {
      // GIVEN a persisted chain whose middle block was edited in the database,
      // hash and all, so the block itself still looks self-consistent
      const persisted = await aChainOf(3);
      const rewritten = ElectionBlock.fromJSON(persisted[2]!)
        .next(new ElectionsBlockData(99n, "abcd"))
        .toJSON();
      const storage = new InMemoryBlockChainStorageService([
        persisted[0]!,
        persisted[1]!,
        rewritten, // claims index 2's slot… but chains onto index 2
      ]);

      // WHEN a node loads it
      const chain = await BlockChain.load(ELECTION, storage);

      // THEN the broken link is caught
      expect(chain.isValid()).toBe(false);
    });

    test("a chain that does not start at genesis should not verify", async () => {
      // GIVEN storage missing the genesis block
      const persisted = await aChainOf(2);
      const storage = new InMemoryBlockChainStorageService(persisted.slice(1));

      // WHEN a node loads it
      const chain = await BlockChain.load(ELECTION, storage);

      // THEN it does not verify — a chain has to be anchored
      expect(chain.isValid()).toBe(false);
    });
  });

  describe("Serialization", () => {
    test("serialize then deserialize should round-trip the chain", async () => {
      // GIVEN a chain
      const storage = new InMemoryBlockChainStorageService();
      const chain = await BlockChain.load(ELECTION, storage);
      for (let i = 0; i < 3; i++) await chain.addBlock(aVote());

      // WHEN we take it through its persisted form and back
      const blocks = BlockChain.deserialize(chain.serialize());

      // THEN every block survives unchanged and still verifies
      expect(blocks.map((b) => b.toJSON())).toEqual(chain.serialize());
      expect(blocks.every((b) => b.IsValid())).toBe(true);
    });
  });
});
