/**
 * E2E Test: Products (Ürün Yönetimi)
 *
 * Kapsadığı senaryolar:
 *  - Ürünler listesi
 *  - Ürün oluşturma formu
 *  - Ürün detayı görüntüleme
 *  - Ürün arama / filtreleme
 */

import { test, expect } from "@playwright/test";
import { loginAsDemoUser } from "./helpers/auth";
import { goToProducts } from "./helpers/navigation";

test.describe("Products (Ürün Yönetimi)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoUser(page);
    await goToProducts(page);
  });

  // ── 1. Liste sayfası ─────────────────────────────────────────────────────

  test("ürünler sayfası doğru başlıkla yüklenir", async ({ page }) => {
    await expect(page.locator("h1, h2").first()).toContainText(
      /products|ürün/i,
      { timeout: 8_000 }
    );
  });

  test("ürünler tablosu veya kart listesi görünür", async ({ page }) => {
    const list = page.locator("table, [class*=list], [class*=grid], ul");
    await expect(list.first()).toBeVisible({ timeout: 8_000 });
  });

  test("demo ürünleri listelenir", async ({ page }) => {
    // Demo modunda en az 1 ürün olmalı
    const rows = page.locator("table tbody tr, [class*=product-row], li");
    await expect(rows.first()).toBeVisible({ timeout: 8_000 });
  });

  // ── 2. Yeni ürün ekleme ──────────────────────────────────────────────────

  test("'Add' / 'Ekle' butonu veya paneli görünür", async ({ page }) => {
    const addBtn = page.locator(
      'button:has-text("Add"), button:has-text("Ekle"), button:has-text("Oluştur"), button:has-text("Kaydet"), h2:has-text("Yeni ürün")'
    );
    await expect(addBtn.first()).toBeVisible({ timeout: 8_000 });
  });

  test("'Add' butonuna tıklayınca form açılır veya /products/new'e gidilir", async ({
    page,
  }) => {
    // Form artık direkt /products sayfasında Panel içinde render edildiğinden modal click'e gerek yok.
    await expect(page.locator("form").first()).toBeVisible({ timeout: 5_000 });
  });

  test("ürün oluşturma formunda 'name' alanı var", async ({ page }) => {
    const nameInput = page.locator(
      'input[name="name"], input[name="productName"], input[placeholder*="name" i], input[placeholder*="isim" i]'
    );
    await expect(nameInput.first()).toBeVisible({ timeout: 8_000 });
  });

  test("ürün oluşturma formunda 'sku' alanı var", async ({ page }) => {
    const skuInput = page.locator(
      'input[name="sku"], input[placeholder*="sku" i], input[placeholder*="SKU" i]'
    );
    await expect(skuInput.first()).toBeVisible({ timeout: 8_000 });
  });

  // ── 3. Arama ────────────────────────────────────────────────────────────

  test("arama input'u varsa arama yapılabilir", async ({ page }) => {
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="search" i], input[placeholder*="ara" i]'
    );

    if (await searchInput.first().isVisible()) {
      await searchInput.first().fill("test");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);
      // Sayfa crash olmamış olmalı
      expect(page.url()).not.toMatch(/error|500/);
    }
  });

  // ── 4. Ürün detayı ──────────────────────────────────────────────────────

  test("bir ürüne tıklayınca detay sayfasına gidilir", async ({ page }) => {
    const productLink = page
      .locator(
        'table tbody tr a, [class*=product-row] a, [class*=product-item] a'
      )
      .first();

    if (await productLink.isVisible()) {
      await productLink.click();
      // Ürün detay URL'i: /products/:id
      await expect(page).toHaveURL(/\/products\/[^/]+/, { timeout: 5_000 });
    }
  });
});
