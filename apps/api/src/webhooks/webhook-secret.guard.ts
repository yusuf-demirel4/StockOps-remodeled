import { timingSafeEqual } from "node:crypto";
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";

type WebhookRequest = {
  headers: Record<string, string | string[] | undefined>;
};

@Injectable()
export class WebhookSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const expected = process.env.WEBHOOK_SHARED_SECRET;

    if (!expected) {
      return true;
    }

    const request = context.switchToHttp().getRequest<WebhookRequest>();
    const header = request.headers["x-stockops-webhook-secret"];
    const actual = Array.isArray(header) ? header[0] : header;

    if (!actual || !safeEqual(actual, expected)) {
      throw new ForbiddenException("Invalid webhook secret.");
    }

    return true;
  }
}

function safeEqual(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}
