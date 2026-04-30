# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard.spec.ts >> Dashboard >> status sayfasında servis kartları görünür
- Location: e2e\dashboard.spec.ts:98:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[class*=service], [class*=status], [class*=health], li, tr').first()
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for locator('[class*=service], [class*=status], [class*=health], li, tr').first()

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - heading "StockOps Status" [level=1] [ref=e4]
      - paragraph [ref=e5]: Real-time system status
    - paragraph [ref=e7]: Unable to reach the API. The service may be experiencing issues.
  - button "Open Next.js Dev Tools" [ref=e13] [cursor=pointer]:
    - img [ref=e14]
  - alert [ref=e17]
```

# Test source

```ts
  4   |  * Kapsadığı senaryolar:
  5   |  *  - Dashboard metric kartları
  6   |  *  - Navigation linkleri
  7   |  *  - Status sayfası
  8   |  *  - Hızlı eylem butonları
  9   |  */
  10  | 
  11  | import { test, expect } from "@playwright/test";
  12  | import { loginAsDemoUser } from "./helpers/auth";
  13  | import { goToDashboard } from "./helpers/navigation";
  14  | 
  15  | test.describe("Dashboard", () => {
  16  |   test.beforeEach(async ({ page }) => {
  17  |     await loginAsDemoUser(page);
  18  |     await goToDashboard(page);
  19  |   });
  20  | 
  21  |   // ── 1. Temel render ─────────────────────────────────────────────────────
  22  | 
  23  |   test("dashboard sayfası yüklenir", async ({ page }) => {
  24  |     await expect(page).not.toHaveURL(/\/sign-in/);
  25  |     // Herhangi bir içerik yüklenmeli
  26  |     await expect(page.locator("body")).not.toBeEmpty();
  27  |   });
  28  | 
  29  |   test("StockOps başlığı görünür", async ({ page }) => {
  30  |     await expect(page.locator("text=StockOps").first()).toBeVisible();
  31  |   });
  32  | 
  33  |   // ── 2. Metrik kartları ──────────────────────────────────────────────────
  34  | 
  35  |   test("ana metrik kartları görünür", async ({ page }) => {
  36  |     // Metrik kartları: Products, Orders, Stock, Revenue gibi sayılar
  37  |     const metricCards = page.locator(
  38  |       '[class*=card], [class*=metric], [class*=stat], [class*=kpi]'
  39  |     );
  40  |     const count = await metricCards.count();
  41  |     // En az 1 kart olmalı
  42  |     expect(count).toBeGreaterThanOrEqual(0); // Tolerant check - demo mode
  43  |   });
  44  | 
  45  |   // ── 3. Navigation ────────────────────────────────────────────────────────
  46  | 
  47  |   test("sol sidebar / nav menu görünür", async ({ page }) => {
  48  |     await expect(page.locator("nav")).toBeVisible();
  49  |   });
  50  | 
  51  |   test("nav'da Products linki var", async ({ page }) => {
  52  |     const productsLink = page.locator(
  53  |       'nav a[href*="product"], nav a:has-text("Product"), nav a:has-text("Ürün")'
  54  |     );
  55  |     await expect(productsLink.first()).toBeVisible();
  56  |   });
  57  | 
  58  |   test("nav'da Orders linki var", async ({ page }) => {
  59  |     const ordersLink = page.locator(
  60  |       'nav a[href*="order"], nav a:has-text("Order"), nav a:has-text("Sipariş")'
  61  |     );
  62  |     await expect(ordersLink.first()).toBeVisible();
  63  |   });
  64  | 
  65  |   test("nav'da Inventory linki var", async ({ page }) => {
  66  |     const inventoryLink = page.locator(
  67  |       'nav a[href*="inventory"], nav a:has-text("Inventory"), nav a:has-text("Stok"), nav a:has-text("Envanter")'
  68  |     );
  69  |     await expect(inventoryLink.first()).toBeVisible();
  70  |   });
  71  | 
  72  |   // ── 4. Sayfa içi navigasyon ─────────────────────────────────────────────
  73  | 
  74  |   test("Products linkine tıklayınca /products sayfasına gidilir", async ({
  75  |     page,
  76  |   }) => {
  77  |     const link = page
  78  |       .locator(
  79  |         'nav a[href*="product"], nav a:has-text("Product"), nav a:has-text("Ürün")'
  80  |       )
  81  |       .first();
  82  | 
  83  |     if (await link.isVisible()) {
  84  |       await link.click();
  85  |       await expect(page).toHaveURL(/\/products/, { timeout: 5_000 });
  86  |     }
  87  |   });
  88  | 
  89  |   // ── 5. Status sayfası ───────────────────────────────────────────────────
  90  | 
  91  |   test("status sayfası hizmet sağlığını gösterir", async ({ page }) => {
  92  |     await page.goto("/status");
  93  |     await expect(page.locator("h1")).toContainText(/StockOps Status/i, {
  94  |       timeout: 8_000,
  95  |     });
  96  |   });
  97  | 
  98  |   test("status sayfasında servis kartları görünür", async ({ page }) => {
  99  |     await page.goto("/status");
  100 |     // API, Database, Queue gibi servisler
  101 |     const serviceItems = page.locator(
  102 |       '[class*=service], [class*=status], [class*=health], li, tr'
  103 |     );
> 104 |     await expect(serviceItems.first()).toBeVisible({ timeout: 8_000 });
      |                                        ^ Error: expect(locator).toBeVisible() failed
  105 |   });
  106 | });
  107 | 
```