import { describe, test, expect } from "vitest";

import { ElectionBlock, GENESIS_INDEX } from "./block.ts";
import { ElectionsBlockData } from "./block-data.ts";
import { randomBigInt } from "./_test-utils/random-big-int.ts";

const ELECTION = "election-1";

describe("ElectionBlock", () => {
  describe("Construction", () => {
    test("should create a block with valid parameters", () => {
      // GIVEN
      const index = 1;
      const voter = randomBigInt(8);
      const commitment = randomBigInt(8).toString(16);
      const data = new ElectionsBlockData(voter, commitment);
      const timestamp = Date.now();
      const prevHash = randomBigInt(16);

      // WHEN
      const block = new ElectionBlock(
        index,
        ELECTION,
        data,
        timestamp,
        prevHash,
      );

      // THEN
      expect(block).toBeDefined();
      expect(block.hash).toBeDefined();
      expect(typeof block.hash).toBe("bigint");
      expect(block.IsValid()).toBe(true);
    });

    test("should create blocks with various index values", () => {
      // GIVEN different indices
      const indices = [1, 100, 999999];
      const data = new ElectionsBlockData(
        randomBigInt(8),
        randomBigInt(8).toString(16),
      );
      const timestamp = Date.now();
      const prevHash = randomBigInt(16);

      // WHEN creating blocks with each index
      indices.forEach((index) => {
        const block = new ElectionBlock(
          index,
          ELECTION,
          data,
          timestamp,
          prevHash,
        );

        // THEN each should be valid
        expect(block.IsValid()).toBe(true);
        expect(block.toJSON().index).toBe(index);
      });
    });

    test("should create blocks with extreme bigint values", () => {
      // GIVEN extreme bigint values
      const index = 1;
      const extremeLargeVoter = BigInt("999999999999999999999999999999");
      const extremeLargeCommitment = "888888888888888888888888888888";
      const data = new ElectionsBlockData(
        extremeLargeVoter,
        extremeLargeCommitment,
      );
      const timestamp = 0; // Unix epoch
      const prevHash = BigInt(0);

      // WHEN
      const block = new ElectionBlock(
        index,
        ELECTION,
        data,
        timestamp,
        prevHash,
      );

      // THEN
      expect(block.IsValid()).toBe(true);
      expect(block.hash).toBeDefined();
    });

    test("should create blocks with zero timestamp", () => {
      // GIVEN
      const index = 1;
      const data = new ElectionsBlockData(
        randomBigInt(8),
        randomBigInt(8).toString(16),
      );
      const timestamp = 0;
      const prevHash = randomBigInt(16);

      // WHEN
      const block = new ElectionBlock(
        index,
        ELECTION,
        data,
        timestamp,
        prevHash,
      );

      // THEN
      expect(block.IsValid()).toBe(true);
      expect(block.toJSON().timestamp).toBe(0);
    });

    test("should create blocks with zero hashOfPreviousBlock", () => {
      // GIVEN a first real block, which chains onto the genesis sentinel
      const index = 1;
      const data = new ElectionsBlockData(
        randomBigInt(8),
        randomBigInt(8).toString(16),
      );
      const timestamp = Date.now();
      const prevHash = BigInt(0);

      // WHEN
      const block = new ElectionBlock(
        index,
        ELECTION,
        data,
        timestamp,
        prevHash,
      );

      // THEN
      expect(block.IsValid()).toBe(true);
      expect(block.toJSON().prevHash).toBe("0");
    });
  });

  describe("Genesis", () => {
    test("genesis block should carry the protocol's sentinel hash", () => {
      // GIVEN / WHEN
      const genesis = ElectionBlock.genesis(ELECTION, 1625097600000);

      // THEN
      expect(genesis.blockIndex).toBe(GENESIS_INDEX);
      expect(genesis.hash).toBe(0n);
      expect(genesis.electionId).toBe(ELECTION);
      expect(genesis.IsValid()).toBe(true);
      expect(genesis.toJSON()).toEqual({
        index: 0,
        electionId: ELECTION,
        data: { voter: "0", commitment: "0" },
        timestamp: 1625097600000,
        prevHash: "0",
        hash: "0",
      });
    });

    test("a genesis block claiming any other hash should be invalid", () => {
      // GIVEN a genesis block on the wire whose hash was rewritten
      const tampered = {
        ...ElectionBlock.genesis(ELECTION).toJSON(),
        hash: "abc123",
      };

      // WHEN we rehydrate it
      const block = ElectionBlock.fromJSON(tampered);

      // THEN it does not verify
      expect(block.IsValid()).toBe(false);
    });

    test("each election gets its own genesis block", () => {
      // GIVEN two elections
      // WHEN each opens its chain
      const first = ElectionBlock.genesis("election-a");
      const second = ElectionBlock.genesis("election-b");

      // THEN the blocks name their own election
      expect(first.electionId).toBe("election-a");
      expect(second.electionId).toBe("election-b");
    });
  });

  describe("Chaining", () => {
    test("next() should build the block that follows this one", () => {
      // GIVEN a block
      const previous = new ElectionBlock(
        1,
        ELECTION,
        new ElectionsBlockData(randomBigInt(8), randomBigInt(8).toString(16)),
        Date.now(),
        randomBigInt(16),
      );

      // WHEN we extend it
      const data = new ElectionsBlockData(
        randomBigInt(8),
        randomBigInt(8).toString(16),
      );
      const next = previous.next(data);

      // THEN it takes the next index, the same election, and the parent's hash
      expect(next.blockIndex).toBe(2);
      expect(next.electionId).toBe(ELECTION);
      expect(next.toJSON().prevHash).toBe(previous.hash.toString(16));
      expect(next.IsValid()).toBe(true);
      expect(next.follows(previous)).toBe(true);
    });

    test("follows() should reject a block that does not sit on the given one", () => {
      // GIVEN two unrelated blocks in the same election
      const data = new ElectionsBlockData(
        randomBigInt(8),
        randomBigInt(8).toString(16),
      );
      const first = new ElectionBlock(1, ELECTION, data, 1000, BigInt(0));
      const unrelated = new ElectionBlock(2, ELECTION, data, 2000, BigInt(7));

      // THEN
      expect(unrelated.follows(first)).toBe(false);
    });

    test("follows() should reject a block from another election", () => {
      // GIVEN a block and its continuation re-labelled to another election
      const data = new ElectionsBlockData(
        randomBigInt(8),
        randomBigInt(8).toString(16),
      );
      const previous = new ElectionBlock(1, ELECTION, data, 1000, BigInt(0));
      const next = new ElectionBlock(
        2,
        "another-election",
        data,
        2000,
        previous.hash,
      );

      // THEN
      expect(next.follows(previous)).toBe(false);
    });
  });

  describe("Hash Generation", () => {
    test("should generate consistent hash for identical inputs", () => {
      // GIVEN identical inputs
      const index = 1;
      const voter = randomBigInt(10);
      const commitment = randomBigInt(10).toString(16);
      const data = new ElectionsBlockData(voter, commitment);
      const timestamp = 1625097600000;
      const prevHash = randomBigInt(20);

      // WHEN
      const block1 = new ElectionBlock(
        index,
        ELECTION,
        data,
        timestamp,
        prevHash,
      );
      const block2 = new ElectionBlock(
        index,
        ELECTION,
        data,
        timestamp,
        prevHash,
      );

      // THEN
      expect(block1.hash).toBe(block2.hash);
    });

    test("should generate different hashes for different indices", () => {
      // GIVEN
      const voter = randomBigInt(8);
      const commitment = randomBigInt(8).toString(16);
      const data = new ElectionsBlockData(voter, commitment);
      const timestamp = Date.now();
      const prevHash = randomBigInt(16);

      // WHEN
      const block1 = new ElectionBlock(1, ELECTION, data, timestamp, prevHash);
      const block2 = new ElectionBlock(2, ELECTION, data, timestamp, prevHash);

      // THEN
      expect(block1.hash).not.toBe(block2.hash);
    });

    test("should generate different hashes for different data", () => {
      // GIVEN
      const index = 1;
      const data1 = new ElectionsBlockData(
        randomBigInt(8),
        randomBigInt(8).toString(16),
      );
      const data2 = new ElectionsBlockData(
        randomBigInt(8),
        randomBigInt(8).toString(16),
      );
      const timestamp = Date.now();
      const prevHash = randomBigInt(16);

      // WHEN
      const block1 = new ElectionBlock(
        index,
        ELECTION,
        data1,
        timestamp,
        prevHash,
      );
      const block2 = new ElectionBlock(
        index,
        ELECTION,
        data2,
        timestamp,
        prevHash,
      );

      // THEN (extremely unlikely to be equal due to random data)
      expect(block1.hash).not.toBe(block2.hash);
    });

    test("should generate different hashes for different timestamps", () => {
      // GIVEN
      const index = 1;
      const data = new ElectionsBlockData(
        randomBigInt(8),
        randomBigInt(8).toString(16),
      );
      const prevHash = randomBigInt(16);

      // WHEN
      const block1 = new ElectionBlock(index, ELECTION, data, 1000, prevHash);
      const block2 = new ElectionBlock(index, ELECTION, data, 2000, prevHash);

      // THEN
      expect(block1.hash).not.toBe(block2.hash);
    });

    test("should generate different hashes for different previous block hashes", () => {
      // GIVEN
      const index = 1;
      const data = new ElectionsBlockData(
        randomBigInt(8),
        randomBigInt(8).toString(16),
      );
      const timestamp = Date.now();

      // WHEN
      const block1 = new ElectionBlock(
        index,
        ELECTION,
        data,
        timestamp,
        BigInt(1),
      );
      const block2 = new ElectionBlock(
        index,
        ELECTION,
        data,
        timestamp,
        BigInt(2),
      );

      // THEN
      expect(block1.hash).not.toBe(block2.hash);
    });

    test("hash should be accessible via getter", () => {
      // GIVEN
      const index = 1;
      const data = new ElectionsBlockData(
        randomBigInt(8),
        randomBigInt(8).toString(16),
      );
      const timestamp = Date.now();
      const prevHash = randomBigInt(16);

      // WHEN
      const block = new ElectionBlock(
        index,
        ELECTION,
        data,
        timestamp,
        prevHash,
      );

      // THEN
      expect(block.hash).toBeDefined();
      expect(typeof block.hash).toBe("bigint");
      expect(block.hash).toBeGreaterThan(0n);
    });
  });

  describe("Validation", () => {
    test("valid block should pass IsValid check", () => {
      // GIVEN
      const index = 1;
      const voter = randomBigInt(8);
      const commitment = randomBigInt(8).toString(16);
      const data = new ElectionsBlockData(voter, commitment);
      const timestamp = Date.now();
      const prevHash = randomBigInt(16);

      // WHEN
      const block = new ElectionBlock(
        index,
        ELECTION,
        data,
        timestamp,
        prevHash,
      );

      // THEN
      expect(block.IsValid()).toBe(true);
    });

    test("block with tampered index should fail validation", () => {
      // GIVEN a valid block
      const index = 2;
      const data = new ElectionsBlockData(
        randomBigInt(8),
        randomBigInt(8).toString(16),
      );
      const timestamp = Date.now();
      const prevHash = randomBigInt(16);
      const block = new ElectionBlock(
        index,
        ELECTION,
        data,
        timestamp,
        prevHash,
      );

      expect(block.IsValid()).toBe(true);

      // WHEN we tamper with the index
      // @ts-ignore - intentionally mutate private property for testing
      block.index = 999;

      // THEN the block should fail validation
      expect(block.IsValid()).toBe(false);
    });

    test("block with tampered timestamp should fail validation", () => {
      // GIVEN a valid block
      const index = 2;
      const data = new ElectionsBlockData(
        randomBigInt(8),
        randomBigInt(8).toString(16),
      );
      const timestamp = Date.now();
      const prevHash = randomBigInt(16);
      const block = new ElectionBlock(
        index,
        ELECTION,
        data,
        timestamp,
        prevHash,
      );

      expect(block.IsValid()).toBe(true);

      // WHEN we tamper with the timestamp
      // @ts-ignore - intentionally mutate private property for testing
      block.timestamp = 0;

      // THEN the block should fail validation
      expect(block.IsValid()).toBe(false);
    });

    test("block with tampered previous hash should fail validation", () => {
      // GIVEN a valid block
      const index = 2;
      const data = new ElectionsBlockData(
        randomBigInt(8),
        randomBigInt(8).toString(16),
      );
      const timestamp = Date.now();
      const prevHash = randomBigInt(16);
      const block = new ElectionBlock(
        index,
        ELECTION,
        data,
        timestamp,
        prevHash,
      );

      expect(block.IsValid()).toBe(true);

      // WHEN we tamper with the previous hash
      // @ts-ignore - intentionally mutate private property for testing
      block.hashOfPreviousBlock = BigInt(999);

      // THEN the block should fail validation
      expect(block.IsValid()).toBe(false);
    });

    test("block with tampered data should fail validation", () => {
      // GIVEN a valid block
      const index = 2;
      const data = new ElectionsBlockData(
        randomBigInt(8),
        randomBigInt(8).toString(16),
      );
      const timestamp = Date.now();
      const prevHash = randomBigInt(16);
      const block = new ElectionBlock(
        index,
        ELECTION,
        data,
        timestamp,
        prevHash,
      );

      expect(block.IsValid()).toBe(true);

      // WHEN we tamper with the data
      // @ts-ignore - intentionally mutate private property for testing
      block.data = new ElectionsBlockData(
        randomBigInt(8),
        randomBigInt(8).toString(16),
      );

      // THEN the block should fail validation
      expect(block.IsValid()).toBe(false);
    });

    test("block with all fields tampered should fail validation", () => {
      // GIVEN a valid block
      const index = 3;
      const data = new ElectionsBlockData(
        randomBigInt(8),
        randomBigInt(8).toString(16),
      );
      const timestamp = 100;
      const prevHash = randomBigInt(12);
      const block = new ElectionBlock(
        index,
        ELECTION,
        data,
        timestamp,
        prevHash,
      );

      expect(block.IsValid()).toBe(true);

      // WHEN we tamper with multiple fields
      // @ts-ignore
      block.index = 999;
      // @ts-ignore
      block.timestamp = 0;

      // THEN the block should fail validation
      expect(block.IsValid()).toBe(false);
    });

    test("a received block whose commitment was swapped should fail validation", () => {
      // GIVEN a block as it travels on the wire
      const original = new ElectionBlock(
        1,
        ELECTION,
        new ElectionsBlockData(randomBigInt(8), "aa".repeat(32)),
        1625097600000,
        BigInt(0),
      ).toJSON();

      // WHEN someone rewrites the anchored commitment but keeps the hash
      const tampered = {
        ...original,
        data: { ...original.data, commitment: "bb".repeat(32) },
      };

      // THEN the receiving node re-hashes it and refuses it
      expect(ElectionBlock.fromJSON(tampered).IsValid()).toBe(false);
    });
  });

  describe("Serialization", () => {
    test("toJSON returns expected structure and values", () => {
      // GIVEN
      const index = 3;
      const voter = randomBigInt(6);
      const commitment = randomBigInt(6).toString(16);
      const data = new ElectionsBlockData(voter, commitment);
      const timestamp = 100;
      const prevHash = randomBigInt(12);

      // WHEN
      const block = new ElectionBlock(
        index,
        ELECTION,
        data,
        timestamp,
        prevHash,
      );
      const json = block.toJSON();

      // THEN
      expect(json).toMatchObject({
        index: index,
        electionId: ELECTION,
        data: {
          voter: voter.toString(),
          commitment: commitment,
        },
        timestamp: timestamp,
        prevHash: prevHash.toString(16),
        hash: block.hash.toString(16),
      });
    });

    test("toJSON should render every bigint as a string", () => {
      // GIVEN
      const index = 1;
      const voter = BigInt("12345678901234567890");
      const commitment = "98765432109876543210";
      const data = new ElectionsBlockData(voter, commitment);
      const timestamp = 1625097600000;
      const prevHash = BigInt("111222333444555666777");

      // WHEN
      const block = new ElectionBlock(
        index,
        ELECTION,
        data,
        timestamp,
        prevHash,
      );
      const json = block.toJSON();

      // THEN
      expect(typeof json.data.voter).toBe("string");
      expect(typeof json.data.commitment).toBe("string");
      expect(typeof json.prevHash).toBe("string");
      expect(typeof json.hash).toBe("string");
      expect(json.data.voter).toBe("12345678901234567890");
      expect(json.data.commitment).toBe("98765432109876543210");
      // Hashes travel as hex, never decimal.
      expect(json.prevHash).toBe(prevHash.toString(16));
    });

    test("toJSON should return consistent structure across multiple calls", () => {
      // GIVEN
      const index = 2;
      const data = new ElectionsBlockData(
        randomBigInt(8),
        randomBigInt(8).toString(16),
      );
      const timestamp = Date.now();
      const prevHash = randomBigInt(16);
      const block = new ElectionBlock(
        index,
        ELECTION,
        data,
        timestamp,
        prevHash,
      );

      // WHEN
      const json1 = block.toJSON();
      const json2 = block.toJSON();

      // THEN
      expect(json1).toEqual(json2);
      expect(Object.keys(json1).sort()).toEqual([
        "data",
        "electionId",
        "hash",
        "index",
        "prevHash",
        "timestamp",
      ]);
    });

    test("two blocks with identical inputs should produce identical JSON", () => {
      // GIVEN identical inputs
      const index = 4;
      const voter = randomBigInt(6);
      const commitment = randomBigInt(6).toString(16);
      const data = new ElectionsBlockData(voter, commitment);
      const timestamp = Date.now();
      const prevHash = randomBigInt(8);

      // WHEN
      const blockA = new ElectionBlock(
        index,
        ELECTION,
        data,
        timestamp,
        prevHash,
      );
      const blockB = new ElectionBlock(
        index,
        ELECTION,
        data,
        timestamp,
        prevHash,
      );

      // THEN
      expect(blockA.IsValid()).toBe(true);
      expect(blockB.IsValid()).toBe(true);
      expect(blockA.toJSON()).toEqual(blockB.toJSON());
      expect(blockA.hash).toBe(blockB.hash);
    });

    test("fromJSON should round-trip a block without changing it", () => {
      // GIVEN a persisted block
      const original = new ElectionBlock(
        7,
        ELECTION,
        new ElectionsBlockData(randomBigInt(8), randomBigInt(8).toString(16)),
        1625097600000,
        randomBigInt(16),
      );
      const json = original.toJSON();

      // WHEN we rehydrate it
      const restored = ElectionBlock.fromJSON(json);

      // THEN it is the same block, and it still verifies
      expect(restored.IsValid()).toBe(true);
      expect(restored.hash).toBe(original.hash);
      expect(restored.blockIndex).toBe(original.blockIndex);
      expect(restored.electionId).toBe(original.electionId);
      expect(restored.toJSON()).toEqual(json);
    });

    test("fromJSON should reject a non-hex hash", () => {
      // GIVEN a block whose hash is not hex at all
      const json = {
        ...ElectionBlock.genesis(ELECTION).toJSON(),
        index: 1,
        hash: "not-a-hash",
      };

      // WHEN / THEN rehydrating it throws rather than silently accepting it
      expect(() => ElectionBlock.fromJSON(json)).toThrow();
    });
  });

  describe("Integration", () => {
    test("block chain pattern: multiple blocks in sequence", () => {
      // GIVEN a genesis block to build on
      const genesis = ElectionBlock.genesis(ELECTION);
      const blocks = [genesis];

      // WHEN creating a small blockchain
      let previous = genesis;
      for (let i = 0; i < 3; i++) {
        const data = new ElectionsBlockData(
          randomBigInt(8),
          randomBigInt(8).toString(16),
        );
        const block = previous.next(data, Date.now() + i * 1000);

        expect(block.IsValid()).toBe(true);
        expect(block.follows(previous)).toBe(true);
        blocks.push(block);
        previous = block;
      }

      // THEN all blocks should be valid
      blocks.forEach((block) => {
        expect(block.IsValid()).toBe(true);
      });

      // AND indices run 0..3 with unique hashes
      expect(blocks.map((b) => b.blockIndex)).toEqual([0, 1, 2, 3]);
      const uniqueHashes = new Set(blocks.map((b) => b.hash));
      expect(uniqueHashes.size).toBe(blocks.length);
    });

    test("should be able to recreate block from JSON-like data", () => {
      // GIVEN
      const index = 7;
      const voter = randomBigInt(8);
      const commitment = randomBigInt(8).toString(16);
      const data = new ElectionsBlockData(voter, commitment);
      const timestamp = 1625097600000;
      const prevHash = randomBigInt(16);

      // WHEN creating original block
      const originalBlock = new ElectionBlock(
        index,
        ELECTION,
        data,
        timestamp,
        prevHash,
      );
      const json = originalBlock.toJSON();

      // WHEN recreating from extracted data
      const recreatedData = new ElectionsBlockData(voter, commitment);
      const recreatedBlock = new ElectionBlock(
        json.index,
        json.electionId,
        recreatedData,
        json.timestamp,
        BigInt("0x" + json.prevHash),
      );

      // THEN both blocks should have identical properties
      expect(originalBlock.IsValid()).toBe(true);
      expect(recreatedBlock.IsValid()).toBe(true);
      expect(originalBlock.hash).toBe(recreatedBlock.hash);
      expect(originalBlock.toJSON()).toEqual(recreatedBlock.toJSON());
    });
  });
});
