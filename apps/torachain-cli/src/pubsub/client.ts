import { PubSub, type Subscription, type Topic } from "@google-cloud/pubsub";

// gRPC status code for "resource already exists" — thrown when two nodes
// race to create the same topic/subscription on startup.
const ALREADY_EXISTS = 6;

let client: PubSub | null = null;

// Lazily creates the shared Pub/Sub client. GOOGLE_CLOUD_PROJECT,
// PUBSUB_EMULATOR_HOST, and GOOGLE_APPLICATION_CREDENTIALS are all honored
// by the underlying client without any extra wiring here.
export function pubsubClient(): PubSub {
  if (!client) {
    client = new PubSub({ projectId: process.env["GOOGLE_CLOUD_PROJECT"] });
  }
  return client;
}

function isAlreadyExists(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === ALREADY_EXISTS
  );
}

// Idempotent: returns the named topic, creating it first if needed. Safe to
// call from every node on startup — production topics are normally
// provisioned ahead of time by iac/terraform/pubsub.tf, but this lets a
// fresh Pub/Sub emulator work for local dev with no extra setup.
export async function ensureTopic(name: string): Promise<Topic> {
  const topic = pubsubClient().topic(name);
  const [exists] = await topic.exists();
  if (!exists) {
    try {
      await pubsubClient().createTopic(name);
    } catch (err) {
      if (!isAlreadyExists(err)) throw err;
    }
  }
  return topic;
}

export interface EnsureSubscriptionOptions {
  // Server-side filter (e.g. `attributes.electionId = "..."`). Omit to
  // receive every message published to the topic.
  filter?: string;
  // Master subscriptions are permanent infra and should never expire.
  // Worker subscriptions are per-process and ephemeral: default to
  // auto-deleting after a day of inactivity so an abandoned worker doesn't
  // leave orphaned subscriptions behind.
  neverExpire?: boolean;
}

// Idempotent: returns the named subscription on `topic`, creating it first
// if needed.
export async function ensureSubscription(
  topic: Topic,
  name: string,
  options: EnsureSubscriptionOptions = {},
): Promise<Subscription> {
  const subscription = pubsubClient().subscription(name);
  const [exists] = await subscription.exists();
  if (!exists) {
    try {
      await topic.createSubscription(name, {
        filter: options.filter,
        expirationPolicy: options.neverExpire
          ? {}
          : { ttl: { seconds: 60 * 60 * 24 } },
      });
    } catch (err) {
      if (!isAlreadyExists(err)) throw err;
    }
  }
  return subscription;
}
