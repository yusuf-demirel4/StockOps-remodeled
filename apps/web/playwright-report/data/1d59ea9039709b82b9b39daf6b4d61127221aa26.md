# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products.spec.ts >> Products (Ürün Yönetimi) >> ürün oluşturma formunda 'name' alanı var
- Location: e2e\products.spec.ts:71:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('input[name="name"], input[name="productName"], input[placeholder*="name" i], input[placeholder*="isim" i]').first()
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for locator('input[name="name"], input[name="productName"], input[placeholder*="name" i], input[placeholder*="isim" i]').first()

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
  1   | /**
  2   |  * E2E Test: Products (Ürün Yönetimi)
  3   |  *
  4   |  * Kapsadığı senaryolar:
  5   |  *  - Ürünler listesi
  6   |  *  - Ürün oluşturma formu
  7   |  *  - Ürün detayı görüntüleme
  8   |  *  - Ürün arama / filtreleme
  9   |  */
  10  | 
  11  | import { test, expect } from "@playwright/test";
  12  | import { loginAsDemoUser } from "./helpers/auth";
  13  | import { goToProducts } from "./helpers/navigation";
  14  | 
  15  | test.describe("Products (Ürün Yönetimi)", () => {
  16  |   test.beforeEach(async ({ page }) => {
  17  |     await loginAsDemoUser(page);
  18  |     await goToProducts(page);
  19  |   });
  20  | 
  21  |   // ── 1. Liste sayfası ─────────────────────────────────────────────────────
  22  | 
  23  |   test("ürünler sayfası doğru başlıkla yüklenir", async ({ page }) => {
  24  |     await expect(page.locator("h1, h2").first()).toContainText(
  25  |       /products|ürün/i,
  26  |       { timeout: 8_000 }
  27  |     );
  28  |   });
  29  | 
  30  |   test("ürünler tablosu veya kart listesi görünür", async ({ page }) => {
  31  |     const list = page.locator("table, [class*=list], [class*=grid], ul");
  32  |     await expect(list.first()).toBeVisible({ timeout: 8_000 });
  33  |   });
  34  | 
  35  |   test("demo ürünleri listelenir", async ({ page }) => {
  36  |     // Demo modunda en az 1 ürün olmalı
  37  |     const rows = page.locator("table tbody tr, [class*=product-row], li");
  38  |     await expect(rows.first()).toBeVisible({ timeout: 8_000 });
  39  |   });
  40  | 
  41  |   // ── 2. Yeni ürün ekleme ──────────────────────────────────────────────────
  42  | 
  43  |   test("'Add' / 'Ekle' butonu veya linki görünür", async ({ page }) => {
  44  |     const addBtn = page.locator(
  45  |       'a[href*="new"], button:has-text("Add"), button:has-text("Ekle"), button:has-text("New"), a:has-text("Add"), a:has-text("Ekle")'
  46  |     );
  47  |     await expect(addBtn.first()).toBeVisible({ timeout: 8_000 });
  48  |   });
  49  | 
  50  |   test("'Add' butonuna tıklayınca form açılır veya /products/new'e gidilir", async ({
  51  |     page,
  52  |   }) => {
  53  |     const addBtn = page.locator(
  54  |       'a[href*="new"], button:has-text("Add"), button:has-text("Ekle"), button:has-text("New"), a:has-text("Add"), a:has-text("Ekle")'
  55  |     );
  56  | 
  57  |     if (await addBtn.first().isVisible()) {
  58  |       await addBtn.first().click();
  59  | 
  60  |       // Sonrasında form ya da yeni URL bekliyoruz
  61  |       await Promise.race([
  62  |         page.waitForURL(/\/products\/new/, { timeout: 5_000 }),
  63  |         expect(page.locator("form")).toBeVisible({ timeout: 5_000 }),
  64  |       ]).catch(() => {
  65  |         // En azından hata sayfasında değil mi?
  66  |         expect(page.url()).not.toMatch(/error|500/);
  67  |       });
  68  |     }
  69  |   });
  70  | 
  71  |   test("ürün oluşturma formunda 'name' alanı var", async ({ page }) => {
  72  |     await page.goto("/products/new");
  73  |     const nameInput = page.locator(
  74  |       'input[name="name"], input[name="productName"], input[placeholder*="name" i], input[placeholder*="isim" i]'
  75  |     );
> 76  |     await expect(nameInput.first()).toBeVisible({ timeout: 8_000 });
      |                                     ^ Error: expect(locator).toBeVisible() failed
  77  |   });
  78  | 
  79  |   test("ürün oluşturma formunda 'sku' alanı var", async ({ page }) => {
  80  |     await page.goto("/products/new");
  81  |     const skuInput = page.locator(
  82  |       'input[name="sku"], input[placeholder*="sku" i], input[placeholder*="SKU" i]'
  83  |     );
  84  |     await expect(skuInput.first()).toBeVisible({ timeout: 8_000 });
  85  |   });
  86  | 
  87  |   // ── 3. Arama ────────────────────────────────────────────────────────────
  88  | 
  89  |   test("arama input'u varsa arama yapılabilir", async ({ page }) => {
  90  |     const searchInput = page.locator(
  91  |       'input[type="search"], input[placeholder*="search" i], input[placeholder*="ara" i]'
  92  |     );
  93  | 
  94  |     if (await searchInput.first().isVisible()) {
  95  |       await searchInput.first().fill("test");
  96  |       await page.keyboard.press("Enter");
  97  |       await page.waitForTimeout(500);
  98  |       // Sayfa crash olmamış olmalı
  99  |       expect(page.url()).not.toMatch(/error|500/);
  100 |     }
  101 |   });
  102 | 
  103 |   // ── 4. Ürün detayı ──────────────────────────────────────────────────────
  104 | 
  105 |   test("bir ürüne tıklayınca detay sayfasına gidilir", async ({ page }) => {
  106 |     const productLink = page
  107 |       .locator(
  108 |         'table tbody tr a, [class*=product-row] a, [class*=product-item] a'
  109 |       )
  110 |       .first();
  111 | 
  112 |     if (await productLink.isVisible()) {
  113 |       await productLink.click();
  114 |       // Ürün detay URL'i: /products/:id
  115 |       await expect(page).toHaveURL(/\/products\/[^/]+/, { timeout: 5_000 });
  116 |     }
  117 |   });
  118 | });
  119 | 
```