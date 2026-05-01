import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockOpsApiService } from "../domain/stockops-api.service";

@ApiTags("B2B Portal")
@Controller("portal")
export class PortalController {
  constructor(private readonly stockOps: StockOpsApiService) {}

  @Post("auth/login")
  @ApiOperation({ summary: "Authenticate a B2B customer user." })
  async login(@Body() body: { email: string; password: string }) {
    return this.stockOps.portalLogin(body.email, body.password);
  }

  @Get("catalog")
  @ApiOperation({ summary: "List products available in the B2B catalog." })
  async catalog(@Req() req: any) {
    const portalContext = await this.stockOps.requirePortalAuth(req);
    return this.stockOps.portalCatalog(portalContext);
  }

  @Post("orders")
  @ApiOperation({ summary: "Place a B2B order." })
  async placeOrder(@Req() req: any, @Body() body: { lines: Array<{ productId: string; quantity: number }>; notes?: string }) {
    const portalContext = await this.stockOps.requirePortalAuth(req);
    return this.stockOps.portalPlaceOrder(body.lines, body.notes, portalContext);
  }

  @Get("orders")
  @ApiOperation({ summary: "List B2B orders for the authenticated customer." })
  async listOrders(@Req() req: any) {
    const portalContext = await this.stockOps.requirePortalAuth(req);
    return this.stockOps.portalListOrders(portalContext);
  }
}
