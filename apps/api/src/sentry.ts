// Sentry initialization — call before anything else in main.ts
// Only initializes if SENTRY_DSN is set

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  import("@sentry/node").then((Sentry) => {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV ?? "development",
      release: process.env.APP_VERSION ?? process.env.npm_package_version,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    });
  }).catch(() => {
    console.warn("Sentry SDK not installed — error tracking disabled");
  });
}
