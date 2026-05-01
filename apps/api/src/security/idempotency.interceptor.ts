import { createHash } from "node:crypto";
import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { getPrisma } from "@stockops/db";
import { from, Observable, of } from "rxjs";
import { mergeMap } from "rxjs/operators";

import type { ApiRequest } from "../auth/api-request";

type IdempotencyRecord = {
  key: string;
  method: string;
  path: string;
  requestHash: string;
  statusCode: number;
  responseBody: unknown;
};

type IdempotencyRequest = ApiRequest & {
  body?: unknown;
  method?: string;
  originalUrl?: string;
  url?: string;
};

const replayStore = new Map<string, IdempotencyRecord>();
const IDEMPOTENCY_TTL_MS = 1000 * 60 * 60 * 24;

function headerValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isUnsafeMethod(method: string | undefined) {
  return method === "POST" || method === "PATCH" || method === "DELETE";
}

function requestHash(method: string, path: string, body: unknown) {
  return createHash("sha256")
    .update(JSON.stringify({ body: body ?? null, method, path }))
    .digest("hex");
}

function replayKey(organizationId: string, key: string) {
  return `${organizationId}:${key}`;
}

function expiresAt() {
  return new Date(Date.now() + IDEMPOTENCY_TTL_MS);
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const http = context.switchToHttp();
    const request = http.getRequest<IdempotencyRequest>();
    const response = http.getResponse<{ statusCode?: number; status?: (code: number) => void; setHeader?: (name: string, value: string) => void }>();
    const method = request.method ?? "GET";

    if (!isUnsafeMethod(method) || !request.apiAuthContext) {
      return next.handle();
    }

    const key = headerValue(request.headers["idempotency-key"]);
    if (!key) {
      return next.handle();
    }

    if (key.length > 128 || !/^[a-zA-Z0-9:._-]+$/.test(key)) {
      throw new BadRequestException(
        "Idempotency-Key must be 1-128 characters and contain only letters, numbers, colon, dot, underscore, or dash.",
      );
    }

    const path = request.originalUrl ?? request.url ?? "";
    const organizationId = request.apiAuthContext.organization.id;
    const hash = requestHash(method, path, request.body);
    const existing = await this.findExisting(organizationId, key);

    if (existing) {
      if (
        existing.method !== method ||
        existing.path !== path ||
        existing.requestHash !== hash
      ) {
        throw new ConflictException(
          "Idempotency-Key was already used for a different request.",
        );
      }

      response.status?.(existing.statusCode);
      response.setHeader?.("Idempotency-Replayed", "true");
      return of(existing.responseBody);
    }

    return (next.handle() as any).pipe(
      mergeMap((body: unknown) =>
        from(
          this.store({
            key,
            method,
            path,
            requestHash: hash,
            statusCode: response.statusCode ?? 200,
            responseBody: body ?? null,
          }, organizationId, request.apiAuthContext!.user.id).then(() => body),
        ),
      ),
    );
  }

  private async findExisting(
    organizationId: string,
    key: string,
  ): Promise<IdempotencyRecord | null> {
    if (process.env.APP_DATA_SOURCE !== "database") {
      return replayStore.get(replayKey(organizationId, key)) ?? null;
    }

    const record = await (getPrisma() as any).idempotencyKey?.findUnique?.({
      where: {
        organizationId_key: {
          organizationId,
          key,
        },
      },
    });

    if (!record || record.expiresAt.getTime() < Date.now()) {
      return null;
    }

    return {
      key: record.key,
      method: record.method,
      path: record.path,
      requestHash: record.requestHash,
      statusCode: record.statusCode,
      responseBody: record.responseBody,
    };
  }

  private async store(
    record: IdempotencyRecord,
    organizationId: string,
    userId: string,
  ) {
    if (process.env.APP_DATA_SOURCE !== "database") {
      replayStore.set(replayKey(organizationId, record.key), record);
      return;
    }

    await (getPrisma() as any).idempotencyKey?.create?.({
      data: {
        organizationId,
        userId,
        key: record.key,
        method: record.method,
        path: record.path,
        requestHash: record.requestHash,
        statusCode: record.statusCode,
        responseBody: record.responseBody,
        expiresAt: expiresAt(),
      },
    }).catch((error: unknown) => {
      if (error instanceof Error && error.message.includes("Unique constraint")) {
        return;
      }

      throw error;
    });
  }
}
