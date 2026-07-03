import { describe, test, expect } from "vitest";
import { ElectionsBlockData } from "./block-data.ts";
import { randomBigInt } from "./_test-utils/random-big-int.ts";

describe("Block Data", () => {
  describe("Construction", () => {
    test("should create a block data object with valid parameters", () => {
      // GIVEN valid parameters
      const givenVoterNumber = randomBigInt(20);
      const givenCommitment = randomBigInt(20).toString(16);

      // WHEN we create a block data object
      const blockDataObject = new ElectionsBlockData(
        givenVoterNumber,
        givenCommitment,
      );

      // THEN the object should be created successfully
      expect(blockDataObject).toBeDefined();

      // @ts-ignore we are in testing mode
      expect(blockDataObject.voter).toEqual(givenVoterNumber);

      // @ts-ignore we are in testing mode
      expect(blockDataObject.commitment).toBe(givenCommitment);
    });
  });

  describe("Serialization", () => {
    test("should serialize the block data object to a JSON string", () => {
      // GIVEN a block data object
      const blockDataObject = new ElectionsBlockData(
        randomBigInt(20),
        randomBigInt(20).toString(16),
      );

      // WHEN we serialize the object to JSON
      const json = blockDataObject.toJSON();

      // THEN it should a valid;
      expect(json).toMatchObject({
        voter: expect.any(String),
        commitment: expect.any(String),
      });
    });
  });
});
