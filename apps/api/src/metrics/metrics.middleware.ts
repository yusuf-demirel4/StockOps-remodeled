import type { Request, Response, NextFunction } from "express";
import { httpRequestDuration, httpRequestTotal } from "./metrics.service";

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = performance.now();

  res.on("finish", () => {
    const durationSec = (performance.now() - start) / 1000;
    const route = req.route?.path ?? req.path;
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };

    httpRequestDuration.observe(labels, durationSec);
    httpRequestTotal.inc(labels);
  });

  next();
}
