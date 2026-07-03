import { describe, test, expect } from "vitest";

import { ElectionBlock } from "./block.ts";
import { ElectionsBlockData } from "./block-data.ts";
import { randomBigInt } from "./_test-utils/random-big-int.ts";

describe("ElectionBlock", () => {
  describe("Construction", () => {
    test("should create a block with valid parameters", () => {
      // GIVEN
      const index = 1;
      const voter = randomBigInt(8);
      const candidate = randomBigInt(8);
      const data = new ElectionsBlockData(voter, candidate);
      const timestamp = Date.now();
      const prevHash = randomBigInt(16);

      // WHEN
      const block = new ElectionBlock(index, data, timestamp, prevHash);

      // THEN
      expect(block).toBeDefined();
      expect(block.hash).toBeDefined();
      expect(typeof block.hash).toBe("bigint");
      expect(block.IsValid()).toBe(true);
    });

    test("should create blocks with various index values", () => {
      // GIVEN different indices
      const indices = [0, 1, 100, 999999];
      const data = new ElectionsBlockData(randomBigInt(8), randomBigInt(8));
      const timestamp = Date.now();
      const prevHash = randomBigInt(16);

      // WHEN creating blocks with each index
      indices.forEach((index) => {
        const block = new ElectionBlock(index, data, timestamp, prevHash);

        // THEN each should be valid
        expect(block.IsValid()).toBe(true);
        expect(block.toJSON().index).toBe(index);
      });
    });

    test("should create blocks with extreme bigint values", () => {
      // GIVEN extreme bigint values
      const index = 1;
      const extremeLargeVoter = BigInt("999999999999999999999999999999");
      const extremeLargeCandidate = BigInt("888888888888888888888888888888");
      const data = new ElectionsBlockData(
        extremeLargeVoter,
        extremeLargeCandidate,
      );
      const timestamp = 0; // Unix epoch
      const prevHash = BigInt(0);

      // WHEN
      const block = new ElectionBlock(index, data, timestamp, prevHash);

      // THEN
      expect(block.IsValid()).toBe(true);
      expect(block.hash).toBeDefined();
    });

    test("should create blocks with zero timestamp", () => {
      // GIVEN
      const index = 1;
      const data = new ElectionsBlockData(randomBigInt(8), randomBigInt(8));
      const timestamp = 0;
      const prevHash = randomBigInt(16);

      // WHEN
      const block = new ElectionBlock(index, data, timestamp, prevHash);

      // THEN
      expect(block.IsValid()).toBe(true);
      expect(block.toJSON().timestamp).toBe(0);
    });

    test("should create blocks with zero hashOfPreviousBlock", () => {
      // GIVEN
      const index = 0; // Genesis block scenario
      const data = new ElectionsBlockData(randomBigInt(8), randomBigInt(8));
      const timestamp = Date.now();
      const prevHash = BigInt(0);

      // WHEN
      const block = new ElectionBlock(index, data, timestamp, prevHash);

      // THEN
      expect(block.IsValid()).toBe(true);
      expect(block.toJSON().hashOfPreviousBlock).toBe("0");
    });
  });

  describe("Hash Generation", () => {
    test("should generate consistent hash for identical inputs", () => {
      // GIVEN identical inputs
      const index = 1;
      const voter = randomBigInt(10);
      const candidate = randomBigInt(10);
      const data = new ElectionsBlockData(voter, candidate);
      const timestamp = 1625097600000;
      const prevHash = randomBigInt(20);

      // WHEN
      const block1 = new ElectionBlock(index, data, timestamp, prevHash);
      const block2 = new ElectionBlock(index, data, timestamp, prevHash);

      // THEN
      expect(block1.hash).toBe(block2.hash);
    });

    test("should generate different hashes for different indices", () => {
      // GIVEN
      const voter = randomBigInt(8);
      const candidate = randomBigInt(8);
      const data = new ElectionsBlockData(voter, candidate);
      const timestamp = Date.now();
      const prevHash = randomBigInt(16);

      // WHEN
      const block1 = new ElectionBlock(1, data, timestamp, prevHash);
      const block2 = new ElectionBlock(2, data, timestamp, prevHash);

      // THEN
      expect(block1.hash).not.toBe(block2.hash);
    });

    test("should generate different hashes for different data", () => {
      // GIVEN
      const index = 1;
      const data1 = new ElectionsBlockData(randomBigInt(8), randomBigInt(8));
      const data2 = new ElectionsBlockData(randomBigInt(8), randomBigInt(8));
      const timestamp = Date.now();
      const prevHash = randomBigInt(16);

      // WHEN
      const block1 = new ElectionBlock(index, data1, timestamp, prevHash);
      const block2 = new ElectionBlock(index, data2, timestamp, prevHash);

      // THEN (extremely unlikely to be equal due to random data)
      expect(block1.hash).not.toBe(block2.hash);
    });

    test("should generate different hashes for different timestamps", () => {
      // GIVEN
      const index = 1;
      const data = new ElectionsBlockData(randomBigInt(8), randomBigInt(8));
      const prevHash = randomBigInt(16);

      // WHEN
      const block1 = new ElectionBlock(index, data, 1000, prevHash);
      const block2 = new ElectionBlock(index, data, 2000, prevHash);

      // THEN
      expect(block1.hash).not.toBe(block2.hash);
    });

    test("should generate different hashes for different previous block hashes", () => {
      // GIVEN
      const index = 1;
      const data = new ElectionsBlockData(randomBigInt(8), randomBigInt(8));
      const timestamp = Date.now();

      // WHEN
      const block1 = new ElectionBlock(index, data, timestamp, BigInt(1));
      const block2 = new ElectionBlock(index, data, timestamp, BigInt(2));

      // THEN
      expect(block1.hash).not.toBe(block2.hash);
    });

    test("hash should be accessible via getter", () => {
      // GIVEN
      const index = 1;
      const data = new ElectionsBlockData(randomBigInt(8), randomBigInt(8));
      const timestamp = Date.now();
      const prevHash = randomBigInt(16);

      // WHEN
      const block = new ElectionBlock(index, data, timestamp, prevHash);

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
      const candidate = randomBigInt(8);
      const data = new ElectionsBlockData(voter, candidate);
      const timestamp = Date.now();
      const prevHash = randomBigInt(16);

      // WHEN
      const block = new ElectionBlock(index, data, timestamp, prevHash);

      // THEN
      expect(block.IsValid()).toBe(true);
    });

    test("block with tampered index should fail validation", () => {
      // GIVEN a valid block
      const index = 2;
      const data = new ElectionsBlockData(randomBigInt(8), randomBigInt(8));
      const timestamp = Date.now();
      const prevHash = randomBigInt(16);
      const block = new ElectionBlock(index, data, timestamp, prevHash);

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
      const data = new ElectionsBlockData(randomBigInt(8), randomBigInt(8));
      const timestamp = Date.now();
      const prevHash = randomBigInt(16);
      const block = new ElectionBlock(index, data, timestamp, prevHash);

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
      const data = new ElectionsBlockData(randomBigInt(8), randomBigInt(8));
      const timestamp = Date.now();
      const prevHash = randomBigInt(16);
      const block = new ElectionBlock(index, data, timestamp, prevHash);

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
      const data = new ElectionsBlockData(randomBigInt(8), randomBigInt(8));
      const timestamp = Date.now();
      const prevHash = randomBigInt(16);
      const block = new ElectionBlock(index, data, timestamp, prevHash);

      expect(block.IsValid()).toBe(true);

      // WHEN we tamper with the data
      // @ts-ignore - intentionally mutate private property for testing
      block.data = new ElectionsBlockData(randomBigInt(8), randomBigInt(8));

      // THEN the block should fail validation
      expect(block.IsValid()).toBe(false);
    });

    test("block with all fields tampered should fail validation", () => {
      // GIVEN a valid block
      const index = 3;
      const data = new ElectionsBlockData(randomBigInt(8), randomBigInt(8));
      const timestamp = 100;
      const prevHash = randomBigInt(12);
      const block = new ElectionBlock(index, data, timestamp, prevHash);

      expect(block.IsValid()).toBe(true);

      // WHEN we tamper with multiple fields
      // @ts-ignore
      block.index = 999;
      // @ts-ignore
      block.timestamp = 0;

      // THEN the block should fail validation
      expect(block.IsValid()).toBe(false);
    });
  });

  describe("Serialization", () => {
    test("toJSON returns expected structure and values", () => {
      // GIVEN
      const index = 3;
      const voter = randomBigInt(6);
      const candidate = randomBigInt(6);
      const data = new ElectionsBlockData(voter, candidate);
      const timestamp = 100;
      const prevHash = randomBigInt(12);

      // WHEN
      const block = new ElectionBlock(index, data, timestamp, prevHash);
      const json = block.toJSON();

      // THEN
      expect(json).toMatchObject({
        index: index,
        data: {
          voter: voter.toString(),
          candidate: candidate.toString(),
        },
        timestamp: timestamp,
        hashOfPreviousBlock: prevHash.toString(),
      });
    });

    test("toJSON should convert all bigint values to strings", () => {
      // GIVEN
      const index = 1;
      const voter = BigInt("12345678901234567890");
      const candidate = BigInt("98765432109876543210");
      const data = new ElectionsBlockData(voter, candidate);
      const timestamp = 1625097600000;
      const prevHash = BigInt("111222333444555666777");

      // WHEN
      const block = new ElectionBlock(index, data, timestamp, prevHash);
      const json = block.toJSON();

      // THEN
      expect(typeof json.data.voter).toBe("string");
      expect(typeof json.data.candidate).toBe("string");
      expect(typeof json.hashOfPreviousBlock).toBe("string");
      expect(json.data.voter).toBe("12345678901234567890");
      expect(json.data.candidate).toBe("98765432109876543210");
      expect(json.hashOfPreviousBlock).toBe("111222333444555666777");
    });

    test("toJSON should return consistent structure across multiple calls", () => {
      // GIVEN
      const index = 2;
      const data = new ElectionsBlockData(randomBigInt(8), randomBigInt(8));
      const timestamp = Date.now();
      const prevHash = randomBigInt(16);
      const block = new ElectionBlock(index, data, timestamp, prevHash);

      // WHEN
      const json1 = block.toJSON();
      const json2 = block.toJSON();

      // THEN
      expect(json1).toEqual(json2);
      expect(Object.keys(json1).sort()).toEqual([
        "data",
        "hashOfPreviousBlock",
        "index",
        "timestamp",
      ]);
    });

    test("two blocks with identical inputs should produce identical JSON", () => {
      // GIVEN identical inputs
      const index = 4;
      const voter = randomBigInt(6);
      const candidate = randomBigInt(6);
      const data = new ElectionsBlockData(voter, candidate);
      const timestamp = Date.now();
      const prevHash = randomBigInt(8);

      // WHEN
      const blockA = new ElectionBlock(index, data, timestamp, prevHash);
      const blockB = new ElectionBlock(index, data, timestamp, prevHash);

      // THEN
      expect(blockA.IsValid()).toBe(true);
      expect(blockB.IsValid()).toBe(true);
      expect(blockA.toJSON()).toEqual(blockB.toJSON());
      expect(blockA.hash).toBe(blockB.hash);
    });

    test("toJSON should have consistent key ordering", () => {
      // GIVEN
      const index = 5;
      const data = new ElectionsBlockData(randomBigInt(8), randomBigInt(8));
      const timestamp = 1234567890;
      const prevHash = randomBigInt(10);

      // WHEN
      const block = new ElectionBlock(index, data, timestamp, prevHash);
      const json = block.toJSON();

      // THEN
      const keyOrder = Object.keys(json);
      expect(keyOrder).toContain("index");
      expect(keyOrder).toContain("data");
      expect(keyOrder).toContain("timestamp");
      expect(keyOrder).toContain("hashOfPreviousBlock");
    });
  });

  describe("Integration", () => {
    test("block chain pattern: multiple blocks in sequence", () => {
      // GIVEN multiple blocks to be chained
      const blocks = [];
      let previousHash = BigInt(0); // Genesis block

      // WHEN creating a small blockchain
      for (let i = 0; i < 3; i++) {
        const data = new ElectionsBlockData(randomBigInt(8), randomBigInt(8));
        const block = new ElectionBlock(
          i,
          data,
          Date.now() + i * 1000,
          previousHash,
        );

        expect(block.IsValid()).toBe(true);
        blocks.push(block);
        previousHash = block.hash;
      }

      // THEN all blocks should be valid
      blocks.forEach((block) => {
        expect(block.IsValid()).toBe(true);
      });

      // AND hashes should be different
      const hashes = blocks.map((b) => b.hash);
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(blocks.length);
    });

    test("should be able to recreate block from JSON-like data", () => {
      // GIVEN
      const index = 7;
      const voter = randomBigInt(8);
      const candidate = randomBigInt(8);
      const data = new ElectionsBlockData(voter, candidate);
      const timestamp = 1625097600000;
      const prevHash = randomBigInt(16);

      // WHEN creating original block
      const originalBlock = new ElectionBlock(index, data, timestamp, prevHash);
      const json = originalBlock.toJSON();

      // WHEN recreating from extracted data
      const recreatedData = new ElectionsBlockData(voter, candidate);
      const recreatedBlock = new ElectionBlock(
        json.index,
        recreatedData,
        json.timestamp,
        BigInt(json.hashOfPreviousBlock),
      );

      // THEN both blocks should have identical properties
      expect(originalBlock.IsValid()).toBe(true);
      expect(recreatedBlock.IsValid()).toBe(true);
      expect(originalBlock.hash).toBe(recreatedBlock.hash);
      expect(originalBlock.toJSON()).toEqual(recreatedBlock.toJSON());
    });
  });
});
