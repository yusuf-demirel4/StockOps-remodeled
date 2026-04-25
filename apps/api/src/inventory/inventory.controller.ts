import { Controller, Get, Inject } from "@nestjs/common";

import { InventoryReadService } from "./inventory-read.service";

@Controller("inventory")
export class InventoryController {
  constructor(
    @Inject(InventoryReadService)
    private readonly inventory: InventoryReadService,
  ) {}

  @Get("products")
  listProducts() {
    return this.inventory.listProducts();
  }
}
