import { PubSub, type Subscription, type Topic } from "@google-cloud/pubsub";

// gRPC status code for "resource already exists" — thrown when two nodes
// race to create the same topic/subscription on startup.
const ALREADY_EXISTS = 6;

let client: PubSub | null = null;

// Pub/Sub is required for every node (master publishes, workers subscribe) and
// has no local fallback. If it isn't configured the underlying client silently
// hangs trying to reach the GCP metadata server for credentials/project — so
// we validate up front and fail fast with an actionable message instead.
//
// Two supported setups (see .env.example):
//   • Emulator — PUBSUB_EMULATOR_HOST (+ GOOGLE_CLOUD_PROJECT)
//   • Real GCP — GOOGLE_APPLICATION_CREDENTIALS (service-account key) +
//     GOOGLE_CLOUD_PROJECT. On Cloud Run the attached service account supplies
//     credentials automatically, so only the project is required there.
function assertPubSubConfigured(): void {
  const project = process.env["GOOGLE_CLOUD_PROJECT"];
  if (!project) {
    throw new Error(
      "Pub/Sub is not configured: GOOGLE_CLOUD_PROJECT is unset. Set it in " +
        "apps/torachain-cli/.env (see .env.example) — nodes cannot publish or " +
        "subscribe without it.",
    );
  }

  const usingEmulator = Boolean(process.env["PUBSUB_EMULATOR_HOST"]);
  const hasKey = Boolean(process.env["GOOGLE_APPLICATION_CREDENTIALS"]);
  // Outside Cloud Run (K_SERVICE is set there) a key or the emulator is
  // required — ambient metadata-server auth isn't available on a laptop.
  const onCloudRun = Boolean(process.env["K_SERVICE"]);
  if (!usingEmulator && !hasKey && !onCloudRun) {
    throw new Error(
      "Pub/Sub is not configured: set GOOGLE_APPLICATION_CREDENTIALS to a " +
        "service-account key (e.g. the dev key in .keys/) or PUBSUB_EMULATOR_HOST " +
        "for the local emulator. See apps/torachain-cli/.env.example.",
    );
  }
}

// Lazily creates the shared Pub/Sub client. GOOGLE_CLOUD_PROJECT,
// PUBSUB_EMULATOR_HOST, and GOOGLE_APPLICATION_CREDENTIALS are all honored
// by the underlying client without any extra wiring here.
export function pubsubClient(): PubSub {
  if (!client) {
    assertPubSubConfigured();
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
