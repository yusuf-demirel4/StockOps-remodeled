import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Inject,
  Post,
} from "@nestjs/common";

import { WebhookInboxService } from "./webhook-inbox.service";

@Controller("webhooks")
export class WebhooksController {
  constructor(
    @Inject(WebhookInboxService)
    private readonly inbox: WebhookInboxService,
  ) {}

  @Post("shopify")
  @HttpCode(202)
  acceptShopify(
    @Headers("x-shopify-topic") topic: string | undefined,
    @Body() body: unknown,
  ) {
    return this.inbox.accept("shopify", topic, body);
  }

  @Post("woocommerce")
  @HttpCode(202)
  acceptWooCommerce(
    @Headers("x-wc-webhook-topic") topic: string | undefined,
    @Body() body: unknown,
  ) {
    return this.inbox.accept("woocommerce", topic, body);
  }
}
