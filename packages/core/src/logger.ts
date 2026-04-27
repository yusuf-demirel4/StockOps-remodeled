import pino from "pino";

export type LoggerOptions = {
  service: string;
  level?: string;
  version?: string;
};

export function createLogger(opts: LoggerOptions) {
  return pino({
    level: opts.level ?? process.env.LOG_LEVEL ?? "info",
    serializers: {
      req: pino.stdSerializers.req,
      err: pino.stdSerializers.err,
    },
    mixin: () => ({
      service: opts.service,
      version: opts.version ?? process.env.npm_package_version ?? "0.1.0",
    }),
    ...(process.env.NODE_ENV !== "production"
      ? { transport: { target: "pino-pretty", options: { colorize: true } } }
      : {}),
  });
}
