import type { Message, Subscription, Topic } from "@google-cloud/pubsub";

type MessageHandler = (message: Message) => void;

interface FakeSubscription {
  name: string;
  filter?: string | undefined;
  handlers: MessageHandler[];
  deleted: boolean;
}

/**
 * An in-process stand-in for Google Cloud Pub/Sub, enough of it for the node
 * roles to talk to each other in a test: topics, per-subscription attribute
 * filters, and delivery to every live subscription.
 *
 * It is deliberately synchronous — a published block reaches the subscribers
 * before `publishMessage` returns, so a test never has to poll.
 */
export class FakePubSub {
  private readonly subscriptions = new Map<string, FakeSubscription[]>();
  readonly published: Array<{ topic: string; json: unknown }> = [];

  topic(name: string): Topic {
    const publishMessage = ({
      json,
      attributes,
    }: {
      json?: unknown;
      attributes?: Record<string, string>;
    }) => {
      this.published.push({ topic: name, json });
      this.deliver(name, json, attributes ?? {});
      return Promise.resolve(["fake-message-id"]);
    };
    return { name, publishMessage } as unknown as Topic;
  }

  subscription(topicName: string, name: string, filter?: string): Subscription {
    const record: FakeSubscription = {
      name,
      filter,
      handlers: [],
      deleted: false,
    };
    const forTopic = this.subscriptions.get(topicName) ?? [];
    forTopic.push(record);
    this.subscriptions.set(topicName, forTopic);

    const subscription = {
      name,
      on(event: string, handler: MessageHandler) {
        if (event === "message") record.handlers.push(handler);
        return subscription;
      },
      delete() {
        record.deleted = true;
        return Promise.resolve([{}]);
      },
    };
    return subscription as unknown as Subscription;
  }

  /** Publish a raw payload as if it came from somewhere other than the master. */
  publishRaw(
    topicName: string,
    json: unknown,
    attributes: Record<string, string> = {},
  ): void {
    this.deliver(topicName, json, attributes);
  }

  private deliver(
    topicName: string,
    json: unknown,
    attributes: Record<string, string>,
  ): void {
    for (const subscription of this.subscriptions.get(topicName) ?? []) {
      if (subscription.deleted) continue;
      if (!matchesFilter(subscription.filter, attributes)) continue;
      const message = {
        data: Buffer.from(JSON.stringify(json)),
        attributes,
        ack: () => {},
        nack: () => {},
      } as unknown as Message;
      for (const handler of subscription.handlers) handler(message);
    }
  }
}

// Only the one filter shape the specs package produces:
// `attributes.<key> = "<value>"`. No filter means every message.
function matchesFilter(
  filter: string | undefined,
  attributes: Record<string, string>,
): boolean {
  if (!filter) return true;
  const match = /^attributes\.(\w+) = "(.*)"$/.exec(filter);
  if (!match) throw new Error(`FakePubSub cannot parse filter: ${filter}`);
  return attributes[match[1]!] === match[2];
}
