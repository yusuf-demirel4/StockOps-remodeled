import {
  Controller,
  Get,
  Inject,
  Param,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import type { AuthContext, Invoice, Customer } from "@stockops/core/types";
import {
  exportProductsCSV,
  exportStockCSV,
  exportMovementsCSV,
  exportCustomersCSV,
  exportInvoicesCSV,
  exportOrdersCSV,
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
    const items = products;
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
    const result = await this.stockOps.listStockRows(ctx, { limit: 200 });
    const csv = exportStockCSV(result as any);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="stock.csv"');
    res.send(csv);
  }

  @Get("movements.csv")
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "Export stock movements as CSV." })
  @ApiOkResponse({ description: "CSV file" })
  async movementsCSV(@CurrentAuth() ctx: AuthContext, @Res() res: Response) {
    const result = await this.stockOps.listStockMovements(ctx, { limit: 200 });
    const csv = exportMovementsCSV(result.data);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="movements.csv"');
    res.send(csv);
  }

  @Get("customers.csv")
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "Export customers as CSV." })
  @ApiOkResponse({ description: "CSV file" })
  async customersCSV(@CurrentAuth() ctx: AuthContext, @Res() res: Response) {
    const result = await this.stockOps.listCustomers(ctx);
    const customers = (Array.isArray(result) ? result : (result as any).data) as any[];
    const csv = exportCustomersCSV(customers);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="customers.csv"');
    res.send(csv);
  }

  @Get("invoices.csv")
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "Export invoices as CSV." })
  @ApiOkResponse({ description: "CSV file" })
  async invoicesCSV(@CurrentAuth() ctx: AuthContext, @Res() res: Response) {
    const result = await this.stockOps.listInvoices(ctx);
    const invoices = Array.isArray(result) ? result : (result as any).data;
    const csv = exportInvoicesCSV(invoices);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="invoices.csv"');
    res.send(csv);
  }

  @Get("orders.csv")
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "Export sales orders as CSV." })
  @ApiOkResponse({ description: "CSV file" })
  async ordersCSV(@CurrentAuth() ctx: AuthContext, @Res() res: Response) {
    const result = await this.stockOps.listSalesOrders(ctx);
    const orders = (Array.isArray(result) ? result : (result as any).data) as any[];
    const csv = exportOrdersCSV(orders);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="orders.csv"');
    res.send(csv);
  }

  @Get("account-portability.json")
  @RequirePermissions("view_dashboard")
  @ApiOperation({
    summary: "Export a portable account bundle as JSON.",
  })
  @ApiOkResponse({ description: "JSON account export" })
  async accountPortability(
    @CurrentAuth() ctx: AuthContext,
    @Res() res: Response,
  ) {
    const [
      products,
      stockRows,
      stockMovements,
      customersResult,
      invoicesResult,
      salesOrdersResult,
      purchaseOrdersResult,
      suppliers,
      warehouses,
    ] = await Promise.all([
      this.stockOps.listProducts(ctx),
      this.stockOps.listStockRows(ctx, { limit: 200 }),
      this.stockOps.listStockMovements(ctx, { limit: 200 }),
      this.stockOps.listCustomers(ctx),
      this.stockOps.listInvoices(ctx),
      this.stockOps.listSalesOrders(ctx),
      this.stockOps.listPurchaseOrders(ctx),
      this.stockOps.listSuppliers(ctx),
      this.stockOps.listWarehouses(ctx),
    ]);

    const customers = unwrapList(customersResult);
    const invoices = unwrapList(invoicesResult);
    const salesOrders = unwrapList(salesOrdersResult);
    const purchaseOrders = unwrapList(purchaseOrdersResult);
    const movements = unwrapList(stockMovements);

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="stockops-account-export.json"',
    );
    res.setHeader("Cache-Control", "no-store");
    res.json({
      schemaVersion: "stockops.account-portability.v1",
      generatedAt: new Date().toISOString(),
      organization: {
        id: ctx.organization.id,
        name: ctx.organization.name,
      },
      counts: {
        customers: customers.length,
        invoices: invoices.length,
        products: products.length,
        purchaseOrders: purchaseOrders.length,
        salesOrders: salesOrders.length,
        stockMovements: movements.length,
        stockRows: Array.isArray(stockRows) ? stockRows.length : 0,
        suppliers: suppliers.length,
        warehouses: warehouses.length,
      },
      data: {
        customers,
        invoices,
        products,
        purchaseOrders,
        salesOrders,
        stockMovements: movements,
        stockRows,
        suppliers,
        warehouses,
      },
    });
  }

  // ---- Excel Exports ----

  @Get("products.xlsx")
  @RequirePermissions("view_dashboard")
  @ApiOperation({ summary: "Export products as Excel." })
  @ApiOkResponse({ description: "XLSX file" })
  async productsExcel(@CurrentAuth() ctx: AuthContext, @Res() res: Response) {
    const products = await this.stockOps.listProducts(ctx);
    const items = products;
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
    const result = await this.stockOps.listStockRows(ctx, { limit: 200 });
    const buffer = await exportStockExcel(result as any);
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
    const invoicesResult = await this.stockOps.listInvoices(ctx);
    const invoices = (Array.isArray(invoicesResult) ? invoicesResult : (invoicesResult as any).data) as any[];
    const invoice = invoices.find((i: any) => i.id === invoiceId) as Invoice;
    if (!invoice) {
      res.status(404).json({ message: "Invoice not found." });
      return;
    }

    const customersResult = await this.stockOps.listCustomers(ctx);
    const customers = (Array.isArray(customersResult) ? customersResult : (customersResult as any).data) as any[];
    const customer = customers.find((c: any) => c.id === invoice.customerId);
    if (!customer) {
      res.status(404).json({ message: "Customer not found." });
      return;
    }

    const products = await this.stockOps.listProducts(ctx);
    const allProducts = products;
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

function unwrapList<T>(value: T[] | { data?: T[] } | unknown): T[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === "object" && Array.isArray((value as { data?: T[] }).data)) {
    return (value as { data: T[] }).data;
  }

  return [];
}

