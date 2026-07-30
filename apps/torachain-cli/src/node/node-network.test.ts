import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import type { Topic } from "@google-cloud/pubsub";
import { TOPICS, type SerializedBlock } from "@tora-chain/specs";

import { FakePubSub } from "./_test-utils/fake-pubsub.ts";
import { InMemoryBlockChainStorageService } from "../blockchain/_test-utils/in-memory-storage-service.ts";
import { BlockChain, idToBigInt } from "../blockchain/index.ts";

// One shared broker per test, swapped in for Google Cloud Pub/Sub so a master
// and its workers can be run end to end in-process.
const broker = { current: new FakePubSub() };

vi.mock("../pubsub/client.ts", () => ({
  ensureTopic: async (name: string) => broker.current.topic(name),
  ensureSubscription: async (
    topic: Topic,
    name: string,
    options: { filter?: string } = {},
  ) => broker.current.subscription(topic.name, name, options.filter),
  pubsubClient: () => {
    throw new Error("not used in tests");
  },
}));

const { MasterNode } = await import("./master-node.ts");
const { WorkerNode } = await import("./worker-node.ts");

const ELECTION = "election-under-test";

// Each test gets its own ports so a closed server's keep-alive sockets can
// never be reused against the next test's node.
let nextPort = 7690;

let master: InstanceType<typeof MasterNode>;
let masterStorage: InMemoryBlockChainStorageService;
let masterPort: number;
const workers: Array<InstanceType<typeof WorkerNode>> = [];

async function startMaster() {
  masterPort = nextPort++;
  masterStorage = new InMemoryBlockChainStorageService();
  master = new MasterNode(masterPort, masterStorage);
  await master.start();
  return masterStorage;
}

async function startWorker(electionId = "all") {
  const storage = new InMemoryBlockChainStorageService();
  const worker = new WorkerNode(
    nextPort++,
    `http://localhost:${masterPort}`,
    electionId,
    storage,
  );
  await worker.start();
  workers.push(worker);
  return { worker, storage };
}

/** Wait until a worker's storage holds exactly what the master's does. */
async function expectReplicated(worker: InMemoryBlockChainStorageService) {
  await vi.waitFor(async () =>
    expect(await worker.getAll()).toEqual(await masterStorage.getAll()),
  );
}

async function castVote(
  votingNumber: string,
  commitment: string,
  electionId = ELECTION,
) {
  const res = await fetch(`http://localhost:${masterPort}/api/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ electionId, votingNumber, commitment }),
  });
  return { status: res.status, body: await res.json() };
}

beforeEach(() => {
  broker.current = new FakePubSub();
});

afterEach(async () => {
  await Promise.all(workers.splice(0).map((worker) => worker.stop()));
  await master?.stop();
});

describe("master + worker network", () => {
  test("a vote should become a block the master persists and publishes", async () => {
    // GIVEN a running master
    const storage = await startMaster();

    // WHEN a vote is cast
    const { status, body } = await castVote("VN-0001", "aa".repeat(32));

    // THEN it is accepted as block 1 on that election's chain
    expect(status).toBe(202);
    expect(body).toMatchObject({ accepted: true, blockIndex: 1 });

    // AND the chain the master persisted opens with genesis and verifies
    const chain = await BlockChain.load(ELECTION, storage);
    expect(chain.serialize().map((b) => b.index)).toEqual([0, 1]);
    expect(chain.isValid()).toBe(true);

    // AND the block records the voter as their hashed voting number, never the
    // voting number itself
    expect(chain.tip?.toJSON().data).toEqual({
      voter: idToBigInt("VN-0001").toString(),
      commitment: "aa".repeat(32),
    });

    // AND both blocks were published for the workers
    expect(broker.current.published.map((p) => p.topic)).toEqual([
      TOPICS.NEW_BLOCK,
      TOPICS.NEW_BLOCK,
    ]);
  });

  test("a worker should replicate the master's chain block for block", async () => {
    // GIVEN a master and a subscribed worker
    await startMaster();
    const { storage: workerStorage } = await startWorker();

    // WHEN three votes are cast
    for (let i = 1; i <= 3; i++) {
      await castVote(`VN-${i}`, i.toString(16).padStart(64, "0"));
    }

    // THEN the worker holds exactly what the master holds
    await expectReplicated(workerStorage);

    // AND its copy re-hashes and re-links end to end
    const replica = await BlockChain.load(ELECTION, workerStorage);
    expect(replica.length).toBe(4); // genesis + 3
    expect(replica.isValid()).toBe(true);
  });

  test("a worker joining late should sync the existing chain over HTTP", async () => {
    // GIVEN votes already committed before the worker exists
    await startMaster();
    await castVote("VN-early-1", "11".repeat(32));
    await castVote("VN-early-2", "22".repeat(32));

    // WHEN a worker starts
    const { storage: workerStorage } = await startWorker();

    // THEN it has caught up
    await expectReplicated(workerStorage);

    // AND it keeps up with what comes next
    await castVote("VN-late", "33".repeat(32));
    await expectReplicated(workerStorage);
  });

  test("a worker following one election should ignore the others", async () => {
    // GIVEN a worker subscribed to a single election
    await startMaster();
    const { storage: workerStorage } = await startWorker(ELECTION);

    // WHEN votes are cast in that election and in another one
    await castVote("VN-mine", "44".repeat(32), ELECTION);
    await castVote("VN-other", "55".repeat(32), "some-other-election");

    // THEN only its own election's blocks are stored
    await vi.waitFor(async () =>
      expect((await workerStorage.getAll()).map((b) => b.index)).toEqual([
        0, 1,
      ]),
    );
    const stored = await workerStorage.getAll();
    expect(stored.every((b) => b.electionId === ELECTION)).toBe(true);
  });

  test("a worker should reject a published block whose hash was tampered with", async () => {
    // GIVEN a worker that has replicated a real block
    await startMaster();
    const { storage: workerStorage } = await startWorker();
    await castVote("VN-real", "66".repeat(32));
    await expectReplicated(workerStorage);
    const before = await workerStorage.getAll();

    // WHEN a forged block is published to the topic — a valid-looking next
    // block whose anchored commitment has been swapped
    const genuine = before[before.length - 1]!;
    const forged: SerializedBlock = {
      ...genuine,
      index: genuine.index + 1,
      prevHash: genuine.hash,
      data: { ...genuine.data, commitment: "ff".repeat(32) },
    };
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    broker.current.publishRaw(TOPICS.NEW_BLOCK, forged, {
      electionId: ELECTION,
    });

    // THEN the worker re-hashes it and says so
    await vi.waitFor(() =>
      expect(logged).toHaveBeenCalledWith(
        expect.stringContaining("rejected block 2"),
      ),
    );
    logged.mockRestore();

    // AND its chain is untouched
    expect(await workerStorage.getAll()).toEqual(before);
  });

  test("a worker should survive junk on the topic", async () => {
    // GIVEN a worker with a replicated chain
    await startMaster();
    const { storage: workerStorage } = await startWorker();
    await castVote("VN-real", "99".repeat(32));
    await expectReplicated(workerStorage);
    const before = await workerStorage.getAll();
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    // WHEN something that is not a block at all is published
    broker.current.publishRaw(TOPICS.NEW_BLOCK, { nonsense: true });
    broker.current.publishRaw(TOPICS.NEW_BLOCK, "not-an-object");
    broker.current.publishRaw(TOPICS.NEW_BLOCK, null);

    // THEN it is dropped, and the worker keeps working
    await vi.waitFor(() => expect(logged).toHaveBeenCalled());
    logged.mockRestore();
    expect(await workerStorage.getAll()).toEqual(before);

    await castVote("VN-after-junk", "aa".repeat(32));
    await expectReplicated(workerStorage);
  });

  test("the master's public chain export should serve what it persisted", async () => {
    // GIVEN a master with votes in two elections
    await startMaster();
    await castVote("VN-a", "77".repeat(32), "election-a");
    await castVote("VN-b", "88".repeat(32), "election-b");

    // WHEN a voter's browser reads one election's chain
    const res = await fetch(
      `http://localhost:${masterPort}/api/chain?electionId=election-a`,
    );
    const { blocks } = (await res.json()) as { blocks: SerializedBlock[] };

    // THEN it gets that election only, and it verifies on its own
    expect(blocks.every((b) => b.electionId === "election-a")).toBe(true);
    expect(
      BlockChain.deserialize(blocks).every((block) => block.IsValid()),
    ).toBe(true);
    // AND CORS is open, since the point is an independent cross-check
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  test("concurrent votes should each get their own block", async () => {
    // GIVEN a running master
    const storage = await startMaster();

    // WHEN ten votes arrive at once
    const responses = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        castVote(`VN-concurrent-${i}`, i.toString(16).padStart(64, "0")),
      ),
    );

    // THEN every one was accepted with a distinct index, and none was lost
    const indices = responses
      .map((r) => (r.body as { blockIndex: number }).blockIndex)
      .sort((a, b) => a - b);
    expect(indices).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    // AND the resulting chain still links up
    const chain = await BlockChain.load(ELECTION, storage);
    expect(chain.length).toBe(11); // genesis + 10
    expect(chain.isValid()).toBe(true);
  });
});
