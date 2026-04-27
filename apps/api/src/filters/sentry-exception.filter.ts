import { Catch, type ArgumentsHost, type ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Response } from "express";

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Only report 5xx to Sentry
    if (status >= 500) {
      this.reportToSentry(exception);
    }

    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : { statusCode: status, message: "Internal server error" };

    response.status(status).json(body);
  }

  private reportToSentry(exception: unknown) {
    try {
      // Dynamic import so Sentry is optional — won't crash if not installed
      import("@sentry/node").then((Sentry) => {
        if (Sentry.isInitialized()) {
          Sentry.captureException(exception);
        }
      }).catch(() => {
        // Sentry not available, skip
      });
    } catch {
      // Sentry not available, skip
    }
  }
}
