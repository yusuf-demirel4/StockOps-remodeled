import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Inject,
  Post,
  RawBody,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiAcceptedResponse,
  ApiBody,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import {
  errorResponseSchema,
  webhookAcceptedResponseSchema,
  webhookPayloadBodySchema,
} from "../openapi/schemas";
import { WebhookInboxService } from "./webhook-inbox.service";
import { WebhookSecretGuard } from "./webhook-secret.guard";

@ApiTags("Webhooks")
@ApiForbiddenResponse({
  description: "Webhook shared secret is missing or invalid.",
  schema: errorResponseSchema,
})
@ApiHeader({
  name: "X-StockOps-Webhook-Secret",
  required: false,
  description: "Required only when WEBHOOK_SHARED_SECRET is configured.",
})
@Controller("webhooks")
@UseGuards(WebhookSecretGuard)
export class WebhooksController {
  constructor(
    @Inject(WebhookInboxService)
    private readonly inbox: WebhookInboxService,
  ) {}

  @Post("shopify")
  @HttpCode(202)
  @ApiOperation({ summary: "Accept a Shopify webhook into the inbox." })
  @ApiHeader({
    name: "X-Shopify-Topic",
    required: false,
    example: "products/update",
  })
  @ApiHeader({
    name: "X-Shopify-Webhook-Id",
    required: false,
    example: "4c9b2a9f-6d54-4d8e-8893-3d7a7c830001",
  })
  @ApiHeader({
    name: "X-Shopify-Hmac-Sha256",
    required: false,
    description: "Required when SHOPIFY_WEBHOOK_SECRET is configured.",
  })
  @ApiBody({ schema: webhookPayloadBodySchema })
  @ApiAcceptedResponse({ schema: webhookAcceptedResponseSchema })
  acceptShopify(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Headers("x-shopify-topic") topic: string | undefined,
    @Body() body: unknown,
    @RawBody() rawBody: Buffer | undefined,
    @Req() request: { requestId?: string },
  ) {
    return this.inbox.accept("shopify", topic, body, headers, rawBody, request.requestId);
  }

  @Post("woocommerce")
  @HttpCode(202)
  @ApiOperation({ summary: "Accept a WooCommerce webhook into the inbox." })
  @ApiHeader({
    name: "X-WC-Webhook-Topic",
    required: false,
    example: "product.updated",
  })
  @ApiHeader({
    name: "X-WC-Webhook-Delivery-ID",
    required: false,
    example: "wc-delivery-0001",
  })
  @ApiHeader({
    name: "X-WC-Webhook-Signature",
    required: false,
    description: "Required when WOOCOMMERCE_WEBHOOK_SECRET is configured.",
  })
  @ApiBody({ schema: webhookPayloadBodySchema })
  @ApiAcceptedResponse({ schema: webhookAcceptedResponseSchema })
  acceptWooCommerce(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Headers("x-wc-webhook-topic") topic: string | undefined,
    @Body() body: unknown,
    @RawBody() rawBody: Buffer | undefined,
    @Req() request: { requestId?: string },
  ) {
    return this.inbox.accept("woocommerce", topic, body, headers, rawBody, request.requestId);
  }
}
