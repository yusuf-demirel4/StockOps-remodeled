import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from "prom-client";

const register = new Registry();

collectDefaultMetrics({ register });

export const queueDepth = new Gauge({
  name: "queue_depth",
  help: "Number of jobs waiting or active in the queue",
  labelNames: ["queue_name", "status"] as const,
  registers: [register],
});

export const jobProcessingDuration = new Histogram({
  name: "job_processing_duration_seconds",
  help: "Duration of job processing in seconds",
  labelNames: ["job_name"] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
  registers: [register],
});

export const jobProcessedTotal = new Counter({
  name: "job_processed_total",
  help: "Total number of jobs processed",
  labelNames: ["job_name", "status"] as const,
  registers: [register],
});

export const syncFailuresTotal = new Counter({
  name: "sync_failures_total",
  help: "Total number of failed syncs with external integrations",
  labelNames: ["integration", "entity_type"] as const,
  registers: [register],
});

export { register as workerMetricsRegistry };
