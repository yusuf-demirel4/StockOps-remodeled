/**
 * E2E Test: Customers (Müşteri Yönetimi)
 *
 * Kapsadığı senaryolar:
 *  - Müşteri listesi
 *  - Müşteri oluşturma formu
 *  - Müşteri detayı
 *  - Müşteri arama
 */

import { test, expect } from "@playwright/test";
import { loginAsDemoUser } from "./helpers/auth";
import { goToCustomers } from "./helpers/navigation";

test.describe("Customers (Müşteri Yönetimi)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await goToCustomers(page);
  });

  // ── 1. Liste sayfası ──────────────────────────────────────────────────────

  test("müşteriler sayfası doğru başlıkla yüklenir", async ({ page }) => {
    await expect(page.locator("h1, h2").first()).toContainText(
      /customers|müşteri/i,
      { timeout: 8_000 }
    );
  });

  test("müşteriler tablosu veya listesi görünür", async ({ page }) => {
    const list = page.locator("table, [class*=list]");
    await expect(list.first()).toBeVisible({ timeout: 8_000 });
  });

  test("demo müşterileri listelenir", async ({ page }) => {
    const rows = page.locator("table tbody tr, li");
    await expect(rows.first()).toBeVisible({ timeout: 8_000 });
  });

  // ── 2. Yeni müşteri ───────────────────────────────────────────────────────

  test("'New Customer' / 'Yeni Müşteri' butonu görünür", async ({ page }) => {
    const addBtn = page.locator(
      'a[href*="new"], button:has-text("New"), button:has-text("Yeni"), button:has-text("Add"), a:has-text("Create")'
    );
    await expect(addBtn.first()).toBeVisible({ timeout: 8_000 });
  });

  test("müşteri oluşturma formunda 'name' alanı var", async ({ page }) => {
    await page.goto("/customers/new");
    const nameInput = page.locator(
      'input[name="name"], input[placeholder*="name" i], input[placeholder*="isim" i], input[placeholder*="ad" i]'
    );
    await expect(nameInput.first()).toBeVisible({ timeout: 8_000 });
  });

  test("müşteri oluşturma formunda 'email' alanı var", async ({ page }) => {
    await page.goto("/customers/new");
    const emailInput = page.locator(
      'input[name="email"], input[type="email"], input[placeholder*="email" i]'
    );
    await expect(emailInput.first()).toBeVisible({ timeout: 8_000 });
  });

  // ── 3. Müşteri detayı ────────────────────────────────────────────────────

  test("bir müşteriye tıklayınca detay sayfasına gidilir", async ({ page }) => {
    const customerLink = page
      .locator('table tbody tr a, [class*=customer-row] a')
      .first();

    if (await customerLink.isVisible()) {
      await customerLink.click();
      await expect(page).toHaveURL(/\/customers\/[^/]+/, { timeout: 5_000 });
    }
  });

  // ── 4. Arama ──────────────────────────────────────────────────────────────

  test("müşteri arama input'u varsa çalışır", async ({ page }) => {
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="search" i], input[placeholder*="ara" i]'
    );

    if (await searchInput.first().isVisible()) {
      await searchInput.first().fill("Ahmet");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);
      expect(page.url()).not.toMatch(/error|500/);
    }
  });
});
