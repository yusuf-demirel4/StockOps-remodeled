import * as BullMQ from "bullmq";

export type ConnectionOptions = {
  db?: number;
  host?: string;
  password?: string;
  port?: number;
  tls?: Record<string, unknown>;
  username?: string;
};

export type QueueOptions = {
  connection?: ConnectionOptions;
};

export type WorkerOptions = {
  concurrency?: number;
  connection?: ConnectionOptions;
};

export type Job<DataType = unknown, ReturnType = unknown, NameType extends string = string> = {
  attemptsMade: number;
  data: DataType;
  id?: string | number | null;
  name: NameType;
  timestamp: number;
  returnvalue?: ReturnType;
};

type QueueAddResult = {
  id?: string | number | null;
  timestamp: number;
};

type QueueRuntime = {
  add: <T = unknown>(
    name: string,
    data: T,
    opts?: Record<string, unknown>,
  ) => Promise<QueueAddResult>;
  close: () => Promise<void>;
};

export type QueueInstance = QueueRuntime;

type WorkerRuntime<DataType = unknown, ReturnType = unknown, NameType extends string = string> = {
  close: () => Promise<void>;
  on: {
    (event: "completed", listener: (job: Job<DataType, ReturnType, NameType>) => void): WorkerRuntime<DataType, ReturnType, NameType>;
    (
      event: "failed",
      listener: (
        job: Job<DataType, ReturnType, NameType> | undefined,
        error: Error,
      ) => void,
    ): WorkerRuntime<DataType, ReturnType, NameType>;
    (event: "error", listener: (error: Error) => void): WorkerRuntime<DataType, ReturnType, NameType>;
  };
};

type BullMQRuntime = {
  Queue: new <T = unknown>(name: string, opts?: QueueOptions) => QueueRuntime;
  Worker: new <DataType = unknown, ReturnType = unknown, NameType extends string = string>(
    name: string,
    processor: (
      job: Job<DataType, ReturnType, NameType>,
    ) => Promise<unknown> | unknown,
    opts?: WorkerOptions,
  ) => WorkerRuntime<DataType, ReturnType, NameType>;
};

const bullmq = BullMQ as unknown as BullMQRuntime;

export const Queue = bullmq.Queue;
export const Worker = bullmq.Worker;