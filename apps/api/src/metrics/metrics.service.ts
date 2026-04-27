import { Counter, Histogram, Gauge, Registry, collectDefaultMetrics } from "prom-client";

const register = new Registry();

collectDefaultMetrics({ register });

export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

export const httpRequestTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"] as const,
  registers: [register],
});

export const activeConnections = new Gauge({
  name: "active_connections",
  help: "Number of active WebSocket connections",
  registers: [register],
});

export const queueDepth = new Gauge({
  name: "queue_depth",
  help: "Number of jobs in the queue",
  labelNames: ["queue_name"] as const,
  registers: [register],
});

export const dbQueryDuration = new Histogram({
  name: "db_query_duration_seconds",
  help: "Duration of database queries in seconds",
  labelNames: ["operation"] as const,
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

export { register as metricsRegistry };
