# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: customers.spec.ts >> Customers (Müşteri Yönetimi) >> müşteri oluşturma formunda 'name' alanı var
- Location: e2e\customers.spec.ts:49:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('input[name="name"], input[placeholder*="name" i], input[placeholder*="isim" i], input[placeholder*="ad" i]').first()
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for locator('input[name="name"], input[placeholder*="name" i], input[placeholder*="isim" i], input[placeholder*="ad" i]').first()

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - heading "404" [level=1] [ref=e4]
    - heading "This page could not be found." [level=2] [ref=e6]
  - button "Open Next.js Dev Tools" [ref=e12] [cursor=pointer]:
    - img [ref=e13]
  - alert [ref=e16]
```

# Test source

```ts
  1  | /**
  2  |  * E2E Test: Customers (Müşteri Yönetimi)
  3  |  *
  4  |  * Kapsadığı senaryolar:
  5  |  *  - Müşteri listesi
  6  |  *  - Müşteri oluşturma formu
  7  |  *  - Müşteri detayı
  8  |  *  - Müşteri arama
  9  |  */
  10 | 
  11 | import { test, expect } from "@playwright/test";
  12 | import { loginAsDemoUser } from "./helpers/auth";
  13 | import { goToCustomers } from "./helpers/navigation";
  14 | 
  15 | test.describe("Customers (Müşteri Yönetimi)", () => {
  16 |   test.beforeEach(async ({ page }) => {
  17 |     await loginAsDemoUser(page);
  18 |     await goToCustomers(page);
  19 |   });
  20 | 
  21 |   // ── 1. Liste sayfası ──────────────────────────────────────────────────────
  22 | 
  23 |   test("müşteriler sayfası doğru başlıkla yüklenir", async ({ page }) => {
  24 |     await expect(page.locator("h1, h2").first()).toContainText(
  25 |       /customers|müşteri/i,
  26 |       { timeout: 8_000 }
  27 |     );
  28 |   });
  29 | 
  30 |   test("müşteriler tablosu veya listesi görünür", async ({ page }) => {
  31 |     const list = page.locator("table, [class*=list]");
  32 |     await expect(list.first()).toBeVisible({ timeout: 8_000 });
  33 |   });
  34 | 
  35 |   test("demo müşterileri listelenir", async ({ page }) => {
  36 |     const rows = page.locator("table tbody tr, li");
  37 |     await expect(rows.first()).toBeVisible({ timeout: 8_000 });
  38 |   });
  39 | 
  40 |   // ── 2. Yeni müşteri ───────────────────────────────────────────────────────
  41 | 
  42 |   test("'New Customer' / 'Yeni Müşteri' butonu görünür", async ({ page }) => {
  43 |     const addBtn = page.locator(
  44 |       'a[href*="new"], button:has-text("New"), button:has-text("Yeni"), button:has-text("Add"), a:has-text("Create")'
  45 |     );
  46 |     await expect(addBtn.first()).toBeVisible({ timeout: 8_000 });
  47 |   });
  48 | 
  49 |   test("müşteri oluşturma formunda 'name' alanı var", async ({ page }) => {
  50 |     await page.goto("/customers/new");
  51 |     const nameInput = page.locator(
  52 |       'input[name="name"], input[placeholder*="name" i], input[placeholder*="isim" i], input[placeholder*="ad" i]'
  53 |     );
> 54 |     await expect(nameInput.first()).toBeVisible({ timeout: 8_000 });
     |                                     ^ Error: expect(locator).toBeVisible() failed
  55 |   });
  56 | 
  57 |   test("müşteri oluşturma formunda 'email' alanı var", async ({ page }) => {
  58 |     await page.goto("/customers/new");
  59 |     const emailInput = page.locator(
  60 |       'input[name="email"], input[type="email"], input[placeholder*="email" i]'
  61 |     );
  62 |     await expect(emailInput.first()).toBeVisible({ timeout: 8_000 });
  63 |   });
  64 | 
  65 |   // ── 3. Müşteri detayı ────────────────────────────────────────────────────
  66 | 
  67 |   test("bir müşteriye tıklayınca detay sayfasına gidilir", async ({ page }) => {
  68 |     const customerLink = page
  69 |       .locator('table tbody tr a, [class*=customer-row] a')
  70 |       .first();
  71 | 
  72 |     if (await customerLink.isVisible()) {
  73 |       await customerLink.click();
  74 |       await expect(page).toHaveURL(/\/customers\/[^/]+/, { timeout: 5_000 });
  75 |     }
  76 |   });
  77 | 
  78 |   // ── 4. Arama ──────────────────────────────────────────────────────────────
  79 | 
  80 |   test("müşteri arama input'u varsa çalışır", async ({ page }) => {
  81 |     const searchInput = page.locator(
  82 |       'input[type="search"], input[placeholder*="search" i], input[placeholder*="ara" i]'
  83 |     );
  84 | 
  85 |     if (await searchInput.first().isVisible()) {
  86 |       await searchInput.first().fill("Ahmet");
  87 |       await page.keyboard.press("Enter");
  88 |       await page.waitForTimeout(500);
  89 |       expect(page.url()).not.toMatch(/error|500/);
  90 |     }
  91 |   });
  92 | });
  93 | 
```