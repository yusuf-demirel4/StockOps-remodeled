/**
 * E2E Test: Authentication (Kimlik Doğrulama)
 *
 * Kapsadığı senaryolar:
 *  - Login sayfası render
 *  - Hatalı kimlik bilgileriyle giriş reddi
 *  - Başarılı giriş → dashboard yönlendirme
 *  - Oturum açıkken /sign-in'e gitme → / yönlendirme
 *  - Oturum açık değilken korumalı sayfalara gitme → /sign-in yönlendirme
 */

import { test, expect } from "@playwright/test";
import { loginAsDemoUser, DEMO_CREDENTIALS } from "./helpers/auth";

test.describe("Authentication", () => {
  // ── 1. Login sayfası ────────────────────────────────────────────────────

  test("sign-in sayfası render olur", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.locator("form")).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("sign-in sayfasında StockOps logosu/başlığı görünür", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    // Logo metni veya başlık
    await expect(
      page.locator("text=StockOps, h1, p:has-text('StockOps')").first()
    ).toBeVisible();
  });

  // ── 2. Hatalı giriş ─────────────────────────────────────────────────────

  test("yanlış şifreyle giriş hata mesajı gösterir", async ({ page }) => {
    await page.goto("/sign-in");
    await page.fill('input[name="email"]', DEMO_CREDENTIALS.email);
    await page.fill('input[name="password"]', "yanlis_sifre_123");
    await page.click('button[type="submit"]');

    // Hata mesajı ya sayfada inline ya da ?error query param ile gelir
    await page.waitForTimeout(1000);
    const hasErrorText =
      (await page
        .locator(
          "text=hatalı, text=incorrect, text=geçersiz, text=invalid, [class*=error], [role=alert]"
        )
        .count()) > 0;
    const hasErrorParam = page.url().includes("error");

    expect(hasErrorText || hasErrorParam).toBeTruthy();
  });

  test("boş form submit edilirse sayfa /sign-in'de kalır", async ({ page }) => {
    await page.goto("/sign-in");
    // Email boş bırak - HTML5 validation devreye girer
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  // ── 3. Başarılı giriş ───────────────────────────────────────────────────

  test("geçerli demo kimlik bilgileriyle giriş başarılı olur", async ({
    page,
  }) => {
    await loginAsDemoUser(page);
    // Dashboard'da ya da uygulama içinde bir sayfada olmalı
    expect(page.url()).not.toMatch(/\/sign-in/);
  });

  test("giriş sonrası nav bar görünür", async ({ page }) => {
    await loginAsDemoUser(page);
    await expect(page.locator("nav")).toBeVisible();
  });

  // ── 4. Oturum yönetimi ──────────────────────────────────────────────────

  test("oturum açıkken /sign-in'e gidince / yönlendirilir", async ({
    page,
  }) => {
    await loginAsDemoUser(page);
    await page.goto("/sign-in");
    // / ya da başka korumalı sayfaya yönlendirilmeli
    await expect(page).not.toHaveURL(/\/sign-in/);
  });

  test.describe("Korumalı rotalar - oturumsuz erişim", () => {
    const protectedRoutes = [
      "/products",
      "/orders",
      "/inventory",
      "/customers",
      "/invoices",
      "/settings",
    ];

    for (const route of protectedRoutes) {
      test(`${route} sayfasına oturumsuz erişim /sign-in'e yönlendirir`, async ({
        page,
      }) => {
        await page.goto(route);
        await expect(page).toHaveURL(/\/sign-in/, { timeout: 8_000 });
      });
    }
  });
});
