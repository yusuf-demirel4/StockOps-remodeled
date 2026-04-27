export {};

declare module "bullmq" {
  export interface ConnectionOptions {
    db?: number;
    host?: string;
    password?: string;
    port?: number;
    tls?: Record<string, unknown>;
    username?: string;
  }

  export interface QueueOptions {
    connection?: ConnectionOptions;
  }

  export interface WorkerOptions {
    concurrency?: number;
    connection?: ConnectionOptions;
  }

  export class Queue<T = unknown> {
    constructor(name: string, opts?: QueueOptions);
    add(
      name: string,
      data: T,
      opts?: Record<string, unknown>,
    ): Promise<{ id?: string | number | null; timestamp: number }>;
    close(): Promise<void>;
  }

  export class Worker<DataType = any, ReturnType = any, NameType extends string = string> {
    constructor(
      name: string,
      processor: (
        job: import("bullmq").Job<DataType, ReturnType, NameType>,
      ) => Promise<unknown> | unknown,
      opts?: WorkerOptions,
    );
    on(
      event: "completed",
      listener: (job: import("bullmq").Job<DataType, ReturnType, NameType>) => void,
    ): this;
    on(
      event: "failed",
      listener: (
        job: import("bullmq").Job<DataType, ReturnType, NameType> | undefined,
        error: Error,
      ) => void,
    ): this;
    on(event: "error", listener: (error: Error) => void): this;
    close(): Promise<void>;
  }
}