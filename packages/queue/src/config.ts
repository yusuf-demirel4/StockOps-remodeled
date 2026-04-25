import type { ConnectionOptions } from "bullmq";

export type QueueDriver = "memory" | "bullmq";

export type QueueRuntimeConfig = {
  concurrency?: number;
  driver?: QueueDriver;
  queueName?: string;
  redisUrl?: string;
};

type BaseResolvedQueueConfig = {
  concurrency: number;
  queueName: string;
  redisUrl?: string;
};

export type ResolvedQueueConfig =
  | (BaseResolvedQueueConfig & {
      connection?: undefined;
      driver: "memory";
    })
  | (BaseResolvedQueueConfig & {
      connection: ConnectionOptions;
      driver: "bullmq";
    });

export function resolveQueueConfig(
  config: QueueRuntimeConfig = {},
): ResolvedQueueConfig {
  const redisUrl =
    config.redisUrl ||
    process.env.REDIS_URL ||
    process.env.UPSTASH_REDIS_URL ||
    undefined;
  const driver =
    config.driver ||
    parseQueueDriver(process.env.STOCKOPS_QUEUE_DRIVER) ||
    (redisUrl ? "bullmq" : "memory");

  const base = {
    concurrency:
      config.concurrency ??
      Number(process.env.STOCKOPS_QUEUE_CONCURRENCY ?? 5),
    queueName: config.queueName ?? process.env.STOCKOPS_QUEUE_NAME ?? "stockops.jobs",
    redisUrl,
  };

  if (driver === "bullmq") {
    return {
      ...base,
      connection: redisConnectionOptions(redisUrl) ?? {
        host: "127.0.0.1",
        port: 6379,
      },
      driver,
    };
  }

  return {
    ...base,
    driver,
  };
}

function parseQueueDriver(value: string | undefined): QueueDriver | undefined {
  if (!value) {
    return undefined;
  }

  if (value === "memory" || value === "bullmq") {
    return value;
  }

  throw new Error(`Unsupported STOCKOPS_QUEUE_DRIVER value: ${value}`);
}

function redisConnectionOptions(
  redisUrl: string | undefined,
): ConnectionOptions | undefined {
  if (!redisUrl) {
    return undefined;
  }

  const url = new URL(redisUrl);
  const db = url.pathname.length > 1 ? Number(url.pathname.slice(1)) : undefined;

  return {
    db: Number.isNaN(db) ? undefined : db,
    host: url.hostname,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    port: url.port ? Number(url.port) : 6379,
    tls: url.protocol === "rediss:" ? {} : undefined,
    username: url.username ? decodeURIComponent(url.username) : undefined,
  };
}
