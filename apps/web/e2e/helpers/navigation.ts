import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Ana sayfaya git ve yüklendiğini doğrula */
export async function goToDashboard(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

/** Ürünler sayfasına git */
export async function goToProducts(page: Page) {
  await page.goto("/products");
  await page.waitForLoadState("networkidle");
}

/** Siparişler sayfasına git */
export async function goToOrders(page: Page) {
  await page.goto("/orders");
  await page.waitForLoadState("networkidle");
}

/** Faturalar sayfasına git */
export async function goToInvoices(page: Page) {
  await page.goto("/invoices");
  await page.waitForLoadState("networkidle");
}

/** Müşteriler sayfasına git */
export async function goToCustomers(page: Page) {
  await page.goto("/customers");
  await page.waitForLoadState("networkidle");
}

/** Stok / Envanter sayfasına git */
export async function goToInventory(page: Page) {
  await page.goto("/inventory");
  await page.waitForLoadState("networkidle");
}

/** Ayarlar sayfasına git */
export async function goToSettings(page: Page) {
  await page.goto("/settings");
  await page.waitForLoadState("networkidle");
}

/** Status sayfasına git */
export async function goToStatus(page: Page) {
  await page.goto("/status");
  await page.waitForLoadState("networkidle");
}

/** h1 veya h2 heading'in belirtilen metni içerdiğini doğrula */
export async function expectHeading(page: Page, pattern: RegExp | string) {
  await expect(page.locator("h1, h2").first()).toContainText(pattern);
}
