import {
  Body,
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { EXTENSION_EVENTS } from "@stockops/core/extensions";
import {
  customFieldInputSchema,
  webhookSubscriptionInputSchema,
  webhookSubscriptionUpdateSchema,
} from "@stockops/core/schemas";
import type {
  AuthContext,
  CustomFieldValue,
  ExtensionWebhookSubscription,
} from "@stockops/core/types";
import { getPrisma } from "@stockops/db";
import { z } from "zod";

import { ApiAuthGuard } from "../auth/api-auth.guard";
import { CurrentAuth } from "../auth/current-auth.decorator";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { ApiTokenSecurity, ApiValidationError } from "../openapi/decorators";
import {
  arrayOf,
  customFieldSchema,
  extensionEventSchema,
  webhookSubscriptionCreateBodySchema,
  webhookSubscriptionSchema,
  webhookSubscriptionUpdateBodySchema,
} from "../openapi/schemas";

const demoSubscriptions: ExtensionWebhookSubscription[] = [];
const demoCustomFields: CustomFieldValue[] = [];

@ApiTags("Extensions")
@ApiTokenSecurity()
@Controller("extensions")
@UseGuards(ApiAuthGuard, PermissionsGuard)
export class ExtensionsController {
  @Get("events")
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "List event names available to public extensions." })
  @ApiOkResponse({ schema: arrayOf(extensionEventSchema) })
  events() {
    return EXTENSION_EVENTS;
  }

  @Get("webhook-subscriptions")
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "List extension webhook subscriptions." })
  @ApiOkResponse({ schema: arrayOf(webhookSubscriptionSchema) })
  async listWebhookSubscriptions(@CurrentAuth() context: AuthContext) {
    if (!dbMode()) {
      return demoSubscriptions.filter(
        (item) => item.organizationId === context.organization.id,
      );
    }

    const rows = await (getPrisma() as any).extensionWebhookSubscription.findMany({
      where: { organizationId: context.organization.id },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapSubscription);
  }

  @Post("webhook-subscriptions")
  @RequirePermissions("manage_users")
  @ApiOperation({ summary: "Create an extension webhook subscription." })
  @ApiBody({ schema: webhookSubscriptionCreateBodySchema })
  @ApiCreatedResponse({ schema: webhookSubscriptionSchema })
  @ApiValidationError()
  async createWebhookSubscription(
    @CurrentAuth() context: AuthContext,
    @Body() body: unknown,
  ) {
    const parsed = parseInput(webhookSubscriptionInputSchema, body);

    if (!dbMode()) {
      const now = new Date().toISOString();
      const subscription: ExtensionWebhookSubscription = {
        id: `extwh_${Date.now()}`,
        organizationId: context.organization.id,
        url: parsed.url,
        events: parsed.events,
        secret: parsed.secret || undefined,
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      };
      demoSubscriptions.unshift(subscription);
      return subscription;
    }

    const row = await (getPrisma() as any).extensionWebhookSubscription.create({
      data: {
        organizationId: context.organization.id,
        url: parsed.url,
        events: parsed.events,
        secret: parsed.secret || null,
      },
    });
    return mapSubscription(row);
  }

  @Patch("webhook-subscriptions/:id")
  @RequirePermissions("manage_users")
  @ApiOperation({ summary: "Update an extension webhook subscription." })
  @ApiBody({ schema: webhookSubscriptionUpdateBodySchema })
  @ApiOkResponse({ schema: webhookSubscriptionSchema })
  @ApiValidationError()
  async updateWebhookSubscription(
    @CurrentAuth() context: AuthContext,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const parsed = parseInput(webhookSubscriptionUpdateSchema, body);

    if (!dbMode()) {
      const subscription = demoSubscriptions.find(
        (item) => item.id === id && item.organizationId === context.organization.id,
      );
      if (!subscription) {
        throw new NotFoundException("Webhook subscription not found.");
      }
      subscription.url = parsed.url ?? subscription.url;
      subscription.events = parsed.events ?? subscription.events;
      subscription.secret =
        parsed.secret === undefined ? subscription.secret : parsed.secret || undefined;
      subscription.status = parsed.status ?? subscription.status;
      subscription.updatedAt = new Date().toISOString();
      return subscription;
    }

    const prisma = getPrisma() as any;
    const existing = await prisma.extensionWebhookSubscription.findFirst({
      where: { id, organizationId: context.organization.id },
    });

    if (!existing) {
      throw new NotFoundException("Webhook subscription not found.");
    }

    const row = await prisma.extensionWebhookSubscription.update({
      where: { id: existing.id },
      data: {
        url: parsed.url,
        events: parsed.events,
        secret: parsed.secret === undefined ? undefined : parsed.secret || null,
        status: parsed.status,
      },
    });
    return mapSubscription(row);
  }

  @Get("custom-fields/:entityType/:entityId")
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "List custom fields for an entity." })
  @ApiOkResponse({ schema: arrayOf(customFieldSchema) })
  async listCustomFields(
    @CurrentAuth() context: AuthContext,
    @Param("entityType") entityType: string,
    @Param("entityId") entityId: string,
  ) {
    if (!dbMode()) {
      return demoCustomFields.filter(
        (field) =>
          field.organizationId === context.organization.id &&
          field.entityType === entityType &&
          field.entityId === entityId,
      );
    }

    const rows = await (getPrisma() as any).customField.findMany({
      where: { organizationId: context.organization.id, entityType, entityId },
      orderBy: { key: "asc" },
    });
    return rows.map(mapCustomField);
  }

  @Put("custom-fields/:entityType/:entityId")
  @RequirePermissions("manage_products")
  @ApiOperation({ summary: "Create or update a custom field value for an entity." })
  @ApiBody({ schema: customFieldSchema })
  @ApiOkResponse({ schema: customFieldSchema })
  @ApiValidationError()
  async upsertCustomField(
    @CurrentAuth() context: AuthContext,
    @Param("entityType") entityType: string,
    @Param("entityId") entityId: string,
    @Body() body: unknown,
  ) {
    const parsed = parseInput(customFieldInputSchema, body);

    if (!dbMode()) {
      const existing = demoCustomFields.find(
        (field) =>
          field.organizationId === context.organization.id &&
          field.entityType === entityType &&
          field.entityId === entityId &&
          field.key === parsed.key,
      );
      if (existing) {
        existing.value = parsed.value;
        existing.updatedAt = new Date().toISOString();
        return existing;
      }
      const now = new Date().toISOString();
      const field: CustomFieldValue = {
        id: `cf_${Date.now()}`,
        organizationId: context.organization.id,
        entityType,
        entityId,
        key: parsed.key,
        value: parsed.value,
        createdAt: now,
        updatedAt: now,
      };
      demoCustomFields.unshift(field);
      return field;
    }

    const row = await (getPrisma() as any).customField.upsert({
      where: {
        organizationId_entityType_entityId_key: {
          organizationId: context.organization.id,
          entityType,
          entityId,
          key: parsed.key,
        },
      },
      update: { value: parsed.value },
      create: {
        organizationId: context.organization.id,
        entityType,
        entityId,
        key: parsed.key,
        value: parsed.value,
      },
    });
    return mapCustomField(row);
  }
}

function dbMode() {
  return process.env.APP_DATA_SOURCE === "database";
}

function parseInput<T>(schema: z.ZodType<T>, input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new BadRequestException(parsed.error.flatten());
  }
  return parsed.data;
}

function mapSubscription(row: {
  id: string;
  organizationId: string;
  url: string;
  events: unknown;
  secret: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): ExtensionWebhookSubscription {
  return {
    id: row.id,
    organizationId: row.organizationId,
    url: row.url,
    events: Array.isArray(row.events)
      ? (row.events as ExtensionWebhookSubscription["events"])
      : [],
    secret: row.secret ?? undefined,
    status: row.status as ExtensionWebhookSubscription["status"],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapCustomField(row: {
  id: string;
  organizationId: string;
  entityType: string;
  entityId: string;
  key: string;
  value: unknown;
  createdAt: Date;
  updatedAt: Date;
}): CustomFieldValue {
  return {
    id: row.id,
    organizationId: row.organizationId,
    entityType: row.entityType,
    entityId: row.entityId,
    key: row.key,
    value: row.value,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
