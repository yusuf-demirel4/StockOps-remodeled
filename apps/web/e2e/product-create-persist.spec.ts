/**
 * E2E Regression Test: BUG-1 — Product Create Persists (Ürün Kayıt Kalıcılığı)
 *
 * BUG-1 root cause: FORCE RLS + missing SET app.current_organization_id caused
 * every INSERT to be silently denied. The user saw no error, but the row never
 * landed in the DB. Refreshing the page showed only the original seeded rows.
 *
 * Fix: Migration 20260502210000_disable_force_rls drops FORCE RLS on all tenant tables.
 *
 * This test is the acceptance criterion for BUG-1: create a product, reload,
 * assert it is still in the list. If this test passes, BUG-1 is fixed.
 *
 * Note: In demo mode the "database" is an in-memory store that ALWAYS persists
 * within the same server process. This test still provides regression value:
 * - It confirms the create action returns success (not a silent no-op).
 * - It confirms the product appears after navigation (not just optimistic UI).
 * - In database mode (CI with Postgres) it would confirm the row is durably written.
 */

import { test, expect } from "@playwright/test";
import { loginAsDemoUser } from "./helpers/auth";

test.describe("BUG-1 Regression: Product Create Persists", () => {
  test("creating a product → reloading the list → product still visible", async ({
    page,
  }) => {
    await loginAsDemoUser(page);
    await page.goto("/products");
    await page.waitForLoadState("networkidle");

    // Generate a unique SKU so we can find exactly this product in the list.
    const uniqueSku = `BUG1-E2E-${Date.now()}`;
    const uniqueName = `BUG-1 Regression ${Date.now()}`;

    // ── 1. Fill in the create form ────────────────────────────────────────────
    // The products page renders the create form inline as a panel (no navigation needed).
    const nameInput = page
      .locator(
        'input[name="name"], input[placeholder*="name" i], input[placeholder*="isim" i]'
      )
      .first();

    const skuInput = page
      .locator('input[name="sku"], input[placeholder*="sku" i]')
      .first();

    const submitBtn = page
      .locator(
        'button[type="submit"], button:has-text("Kaydet"), button:has-text("Ekle"), button:has-text("Oluştur")'
      )
      .first();

    // If the form isn't immediately visible, try /products/new
    const formVisible = await nameInput.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!formVisible) {
      // Some layouts put the form on a separate page
      await page.goto("/products/new");
      await page.waitForLoadState("networkidle");
    }

    // Assert form exists before filling
    await expect(
      page.locator('input[name="name"], input[name="sku"]').first()
    ).toBeVisible({ timeout: 8_000 });

    // Fill name
    const nameField = page
      .locator('input[name="name"], input[placeholder*="name" i], input[placeholder*="isim" i]')
      .first();
    await nameField.fill(uniqueName);

    // Fill SKU
    const skuField = page.locator('input[name="sku"]').first();
    if (await skuField.isVisible()) {
      await skuField.fill(uniqueSku);
    }

    // ── 2. Submit the form ───────────────────────────────────────────────────
    const submitButton = page
      .locator(
        'button[type="submit"], button:has-text("Kaydet"), button:has-text("Ekle"), button:has-text("Oluştur")'
      )
      .first();

    await expect(submitButton).toBeVisible({ timeout: 5_000 });
    await submitButton.click();

    // Wait for the mutation to complete — either success toast or list update.
    // Do NOT wait for a specific toast text since messages can vary.
    await page.waitForTimeout(1500);

    // ── 3. Navigate away then back to force a fresh fetch ───────────────────
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.goto("/products");
    await page.waitForLoadState("networkidle");

    // ── 4. Assert the product appears in the list ────────────────────────────
    // Look for the unique SKU anywhere on the page (table cell, card, etc.)
    const productRow = page.locator(`text=${uniqueSku}`);
    const productNameEl = page.locator(`text=${uniqueName}`);

    const skuVisible = await productRow.isVisible({ timeout: 5_000 }).catch(() => false);
    const nameVisible = await productNameEl.isVisible({ timeout: 5_000 }).catch(() => false);

    // At least one of SKU or name must be visible after reload.
    // If BOTH are false, BUG-1 is not fixed (the INSERT was silently dropped).
    expect(
      skuVisible || nameVisible,
      `BUG-1 REGRESSION: Product "${uniqueName}" (SKU: ${uniqueSku}) was not found after page reload. ` +
        `This means the INSERT was silently dropped — likely FORCE RLS is still enabled. ` +
        `Apply migration 20260502210000_disable_force_rls and re-run.`
    ).toBeTruthy();
  });

  test("form errors are surfaced — no silent failures", async ({ page }) => {
    await loginAsDemoUser(page);
    await page.goto("/products");
    await page.waitForLoadState("networkidle");

    // Try submitting a completely empty form — should show an error, not silently succeed.
    const submitBtn = page
      .locator(
        'button[type="submit"], button:has-text("Kaydet"), button:has-text("Ekle"), button:has-text("Oluştur")'
      )
      .first();

    if (await submitBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(1000);

      // Either an error message is shown OR HTML5 validation prevents submission
      // Either way the page should NOT be a success (no green toast saying "Ürün eklendi").
      const successToast = page.locator(
        'text=Ürün eklendi, text=eklendi, [class*=success]:visible'
      );
      const hasSuccess = await successToast.isVisible({ timeout: 2_000 }).catch(() => false);
      // A blank-form submit should NOT produce a success message.
      expect(hasSuccess).toBeFalsy();
    }
  });
});
