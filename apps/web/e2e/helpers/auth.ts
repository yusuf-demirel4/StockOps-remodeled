import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export const DEMO_CREDENTIALS = {
  email: "eren@example.com",
  password: "stockops123",
};

/**
 * Demo hesabıyla oturum açar ve dashboard'a yönlendirilmeyi bekler.
 */
export async function loginAsDemoUser(page: Page): Promise<void> {
  await page.goto("/sign-in");

  // Form alanlarını doldur
  await page.fill('input[name="email"]', DEMO_CREDENTIALS.email);
  await page.fill('input[name="password"]', DEMO_CREDENTIALS.password);

  // Submit et
  await page.click('button[type="submit"]');

  // Dashboard'a ya da inventory'e yönlendirilmeyi bekle
  await page.waitForURL(/\/(inventory|products|orders|customers|$)/, {
    timeout: 10_000,
  });
}

/**
 * Kullanıcının oturum açmış olduğunu doğrular (nav barı görünür olmalı).
 */
export async function expectAuthenticated(page: Page): Promise<void> {
  await expect(page.locator("nav")).toBeVisible();
}

/**
 * Oturumu kapatır.
 */
export async function signOut(page: Page): Promise<void> {
  // Sign-out butonu ya da linki
  const signOutBtn = page.locator(
    'button:has-text("Sign out"), a:has-text("Sign out"), button:has-text("Çıkış"), a:has-text("Çıkış")'
  );

  if (await signOutBtn.isVisible()) {
    await signOutBtn.click();
    await page.waitForURL(/\/sign-in/, { timeout: 5_000 });
  }
}
