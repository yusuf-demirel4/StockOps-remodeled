import {
  Controller,
  Get,
  Inject,
  Param,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import type { AuthContext } from "@stockops/core/types";
import {
  exportProductsCSV,
  exportStockCSV,
  exportMovementsCSV,
  exportCustomersCSV,
  exportProductsExcel,
  exportStockExcel,
  generateInvoicePDF,
} from "@stockops/core/export";
import type { Response } from "express";

import { ApiAuthGuard } from "../auth/api-auth.guard";
import { CurrentAuth } from "../auth/current-auth.decorator";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { StockOpsApiService } from "../domain/stockops-api.service";
import { ApiTokenSecurity } from "../openapi/decorators";

@ApiTags("Exports")
@ApiTokenSecurity()
@Controller("exports")
@UseGuards(ApiAuthGuard, PermissionsGuard)
export class ExportsController {
  constructor(
    @Inject(StockOpsApiService)
    private readonly stockOps: StockOpsApiService,
  ) {}

  // ---- CSV Exports ----

  @Get("products.csv")
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "Export products as CSV." })
  @ApiOkResponse({ description: "CSV file" })
  async productsCSV(@CurrentAuth() ctx: AuthContext, @Res() res: Response) {
    const products = await this.stockOps.listProducts(ctx);
    const items = Array.isArray(products) ? products : products.data;
    const csv = exportProductsCSV(items);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="products.csv"');
    res.send(csv);
  }

  @Get("stock.csv")
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "Export stock levels as CSV." })
  @ApiOkResponse({ description: "CSV file" })
  async stockCSV(@CurrentAuth() ctx: AuthContext, @Res() res: Response) {
    const rows = await this.stockOps.listStockRows(ctx);
    const csv = exportStockCSV(rows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="stock.csv"');
    res.send(csv);
  }

  @Get("movements.csv")
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "Export stock movements as CSV." })
  @ApiOkResponse({ description: "CSV file" })
  async movementsCSV(@CurrentAuth() ctx: AuthContext, @Res() res: Response) {
    const movements = await this.stockOps.listStockMovements(ctx);
    const csv = exportMovementsCSV(movements);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="movements.csv"');
    res.send(csv);
  }

  @Get("customers.csv")
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "Export customers as CSV." })
  @ApiOkResponse({ description: "CSV file" })
  async customersCSV(@CurrentAuth() ctx: AuthContext, @Res() res: Response) {
    const customers = await this.stockOps.listCustomers(ctx);
    const items = Array.isArray(customers) ? customers : customers.data;
    const csv = exportCustomersCSV(items);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="customers.csv"');
    res.send(csv);
  }

  // ---- Excel Exports ----

  @Get("products.xlsx")
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "Export products as Excel." })
  @ApiOkResponse({ description: "XLSX file" })
  async productsExcel(@CurrentAuth() ctx: AuthContext, @Res() res: Response) {
    const products = await this.stockOps.listProducts(ctx);
    const items = Array.isArray(products) ? products : products.data;
    const buffer = await exportProductsExcel(items);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="products.xlsx"');
    res.send(buffer);
  }

  @Get("stock.xlsx")
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "Export stock levels as Excel." })
  @ApiOkResponse({ description: "XLSX file" })
  async stockExcel(@CurrentAuth() ctx: AuthContext, @Res() res: Response) {
    const rows = await this.stockOps.listStockRows(ctx);
    const buffer = await exportStockExcel(rows);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="stock.xlsx"');
    res.send(buffer);
  }

  // ---- PDF Invoice ----

  @Get("invoices/:id/pdf")
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "Generate a PDF for an invoice." })
  @ApiParam({ name: "id", description: "Invoice ID" })
  @ApiOkResponse({ description: "PDF file" })
  async invoicePDF(
    @CurrentAuth() ctx: AuthContext,
    @Param("id") invoiceId: string,
    @Res() res: Response,
  ) {
    const invoices = await this.stockOps.listInvoices(ctx);
    const allInvoices = Array.isArray(invoices) ? invoices : invoices.data;
    const invoice = allInvoices.find((inv) => inv.id === invoiceId);
    if (!invoice) {
      res.status(404).json({ message: "Invoice not found." });
      return;
    }

    const customers = await this.stockOps.listCustomers(ctx);
    const allCustomers = Array.isArray(customers) ? customers : customers.data;
    const customer = allCustomers.find((c) => c.id === invoice.customerId);
    if (!customer) {
      res.status(404).json({ message: "Customer not found." });
      return;
    }

    const products = await this.stockOps.listProducts(ctx);
    const allProducts = Array.isArray(products) ? products : products.data;
    const productMap = new Map(allProducts.map((p) => [p.id, p]));

    const pdf = generateInvoicePDF({
      invoice,
      customer,
      products: productMap,
      companyName: ctx.organization.name,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${invoice.code}.pdf"`);
    pdf.pipe(res);
  }
}
