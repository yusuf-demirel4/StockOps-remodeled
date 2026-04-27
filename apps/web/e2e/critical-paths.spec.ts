/**
 * E2E Test: Critical Paths — Hızlı Smoke Test
 *
 * Bu dosya orijinal critical-paths testini kapsamlı şekilde yeniden yazar.
 * Tüm kritik sayfaların erişilebilir ve doğru render ettiğini hızlıca doğrular.
 *
 * Daha derin testler için ayrı spec dosyalarına bakın:
 *   - auth.spec.ts
 *   - dashboard.spec.ts
 *   - products.spec.ts
 *   - orders.spec.ts
 *   - invoices.spec.ts
 *   - inventory.spec.ts
 *   - customers.spec.ts
 *   - critical-flow.spec.ts (tam uçtan uca senaryo)
 */

import { test, expect } from "@playwright/test";
import { loginAsDemoUser } from "./helpers/auth";

test.describe("Critical Paths — Smoke Tests", () => {
  // ── Public sayfalar (auth gerekmez) ──────────────────────────────────────

  test("ana sayfa (/) yüklenir", async ({ page }) => {
    // Oturumsuz - /sign-in'e yönlendirir
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    // Crash olmamalı
    expect(page.url()).not.toMatch(/error|500/);
  });

  test("sign-in sayfası yüklenir", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.locator("form")).toBeVisible({ timeout: 8_000 });
  });

  test("status sayfası hizmet durumunu gösterir", async ({ page }) => {
    await page.goto("/status");
    await expect(page.locator("h1")).toContainText(/StockOps Status/i, {
      timeout: 8_000,
    });
  });

  // ── Authenticated flows ────────────────────────────────────────────────────

  test.describe("Authenticated flows", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsDemoUser(page);
    });

    test("giriş sonrası dashboard (/) yüklenir", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("nav")).toBeVisible({ timeout: 8_000 });
    });

    test("products sayfası yüklenir", async ({ page }) => {
      await page.goto("/products");
      await expect(page.locator("h1, h2").first()).toContainText(
        /products|ürün/i,
        { timeout: 8_000 }
      );
    });

    test("products/new formu erişilebilir", async ({ page }) => {
      await page.goto("/products/new");
      await page.waitForLoadState("domcontentloaded");
      // 500 hatası olmamalı
      const is500 = await page
        .locator("text=Internal Server Error")
        .isVisible({ timeout: 1_000 })
        .catch(() => false);
      expect(is500).toBeFalsy();
    });

    test("orders sayfası yüklenir", async ({ page }) => {
      await page.goto("/orders");
      await expect(page.locator("h1, h2").first()).toContainText(
        /orders|sipariş/i,
        { timeout: 8_000 }
      );
    });

    test("inventory sayfası yüklenir", async ({ page }) => {
      await page.goto("/inventory");
      await expect(page.locator("h1, h2").first()).toContainText(
        /inventory|stok|envanter/i,
        { timeout: 8_000 }
      );
    });

    test("customers sayfası yüklenir", async ({ page }) => {
      await page.goto("/customers");
      await expect(page.locator("h1, h2").first()).toContainText(
        /customers|müşteri/i,
        { timeout: 8_000 }
      );
    });

    test("invoices sayfası yüklenir", async ({ page }) => {
      await page.goto("/invoices");
      await expect(page.locator("h1, h2").first()).toContainText(
        /invoices|fatura/i,
        { timeout: 8_000 }
      );
    });

    test("suppliers sayfası yüklenir", async ({ page }) => {
      await page.goto("/suppliers");
      await page.waitForLoadState("domcontentloaded");
      const is500 = await page
        .locator("text=Internal Server Error")
        .isVisible({ timeout: 1_000 })
        .catch(() => false);
      expect(is500).toBeFalsy();
    });

    test("settings sayfası yüklenir", async ({ page }) => {
      await page.goto("/settings");
      await expect(page.locator("h1, h2").first()).toContainText(
        /settings|ayar/i,
        { timeout: 8_000 }
      );
    });

    // ── Navigation bar linkleri ───────────────────────────────────────────────

    test("nav bar tüm ana linklere sahip", async ({ page }) => {
      await page.goto("/");

      const nav = page.locator("nav");
      await expect(nav).toBeVisible({ timeout: 8_000 });

      // En az 3 link olmalı (Products, Orders, Inventory gibi)
      const links = nav.locator("a");
      const count = await links.count();
      expect(count).toBeGreaterThanOrEqual(3);
    });
  });
});
