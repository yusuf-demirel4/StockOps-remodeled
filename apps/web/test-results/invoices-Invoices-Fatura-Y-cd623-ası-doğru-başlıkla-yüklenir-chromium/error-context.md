# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: invoices.spec.ts >> Invoices (Fatura Yönetimi) >> faturalar sayfası doğru başlıkla yüklenir
- Location: e2e\invoices.spec.ts:24:7

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1, h2').first()
Expected pattern: /invoices|fatura/i
Received string:  "KernelGuard StockOps"
Timeout: 8000ms

Call log:
  - Expect "toContainText" with timeout 8000ms
  - waiting for locator('h1, h2').first()
    12 × locator resolved to <h1 class="mt-2 text-lg font-semibold">KernelGuard StockOps</h1>
       - unexpected value "KernelGuard StockOps"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]:
          - paragraph [ref=e7]: StockOps
          - heading "KernelGuard StockOps" [level=1] [ref=e8]
          - paragraph [ref=e9]: Eren Admin
        - generic [ref=e10]:
          - generic [ref=e11]: Owner
          - button "Çıkış yap" [ref=e13]:
            - img [ref=e14]
      - navigation [ref=e17]:
        - link "Dashboard" [ref=e18] [cursor=pointer]:
          - /url: /
          - img [ref=e19]
          - text: Dashboard
        - link "Ürünler" [ref=e21] [cursor=pointer]:
          - /url: /products
          - img [ref=e22]
          - text: Ürünler
        - link "Stok" [ref=e26] [cursor=pointer]:
          - /url: /inventory
          - img [ref=e27]
          - text: Stok
        - link "Üretim" [ref=e37] [cursor=pointer]:
          - /url: /manufacturing
          - img [ref=e38]
          - text: Üretim
        - link "Müşteriler" [ref=e40] [cursor=pointer]:
          - /url: /customers
          - img [ref=e41]
          - text: Müşteriler
        - link "Siparişler" [ref=e46] [cursor=pointer]:
          - /url: /orders
          - img [ref=e47]
          - text: Siparişler
        - link "Faturalar" [ref=e50] [cursor=pointer]:
          - /url: /invoices
          - img [ref=e51]
          - text: Faturalar
        - link "Tedarikçiler" [ref=e54] [cursor=pointer]:
          - /url: /suppliers
          - img [ref=e55]
          - text: Tedarikçiler
        - link "Analitik" [ref=e60] [cursor=pointer]:
          - /url: /analytics
          - img [ref=e61]
          - text: Analitik
        - link "Tahmin" [ref=e64] [cursor=pointer]:
          - /url: /forecasting
          - img [ref=e65]
          - text: Tahmin
        - link "Raporlar" [ref=e73] [cursor=pointer]:
          - /url: /reports
          - img [ref=e74]
          - text: Raporlar
        - link "Kullanıcılar" [ref=e77] [cursor=pointer]:
          - /url: /users
          - img [ref=e78]
          - text: Kullanıcılar
        - link "Ayarlar" [ref=e80] [cursor=pointer]:
          - /url: /settings
          - img [ref=e81]
          - text: Ayarlar
      - generic [ref=e85]:
        - button "Açık" [ref=e86]:
          - img [ref=e87]
        - button "Koyu" [ref=e93]:
          - img [ref=e94]
        - button "Sistem" [ref=e96]:
          - img [ref=e97]
    - main [ref=e99]:
      - generic [ref=e100]:
        - paragraph [ref=e101]: Operasyon Paneli
        - generic [ref=e103]:
          - heading "Faturalar" [level=2] [ref=e104]
          - paragraph [ref=e105]: Kesilen faturalar ve finansal kayıtlar.
      - generic [ref=e108]:
        - heading "Fatura listesi" [level=3] [ref=e110]
        - table [ref=e113]:
          - rowgroup [ref=e114]:
            - row "Fatura No Tarih Durum Toplam Para Birimi" [ref=e115]:
              - columnheader "Fatura No" [ref=e116]
              - columnheader "Tarih" [ref=e117]
              - columnheader "Durum" [ref=e118]
              - columnheader "Toplam" [ref=e119]
              - columnheader "Para Birimi" [ref=e120]
          - rowgroup [ref=e121]:
            - row "Henüz kesilmiş fatura bulunmuyor." [ref=e122]:
              - cell "Henüz kesilmiş fatura bulunmuyor." [ref=e123]
  - button "Open Next.js Dev Tools" [ref=e129] [cursor=pointer]:
    - img [ref=e130]
  - alert [ref=e133]
```

# Test source

```ts
  1   | /**
  2   |  * E2E Test: Invoices (Fatura Yönetimi)
  3   |  *
  4   |  * Kapsadığı senaryolar:
  5   |  *  - Fatura listesi
  6   |  *  - Fatura durum etiketleri (DRAFT, ISSUED, PAID, OVERDUE)
  7   |  *  - Fatura detayı
  8   |  *  - Fatura yayınlama (DRAFT → ISSUED)
  9   |  *  - Ödeme kaydetme
  10  |  */
  11  | 
  12  | import { test, expect } from "@playwright/test";
  13  | import { loginAsDemoUser } from "./helpers/auth";
  14  | import { goToInvoices } from "./helpers/navigation";
  15  | 
  16  | test.describe("Invoices (Fatura Yönetimi)", () => {
  17  |   test.beforeEach(async ({ page }) => {
  18  |     await loginAsDemoUser(page);
  19  |     await goToInvoices(page);
  20  |   });
  21  | 
  22  |   // ── 1. Liste sayfası ─────────────────────────────────────────────────────
  23  | 
  24  |   test("faturalar sayfası doğru başlıkla yüklenir", async ({ page }) => {
> 25  |     await expect(page.locator("h1, h2").first()).toContainText(
      |                                                  ^ Error: expect(locator).toContainText(expected) failed
  26  |       /invoices|fatura/i,
  27  |       { timeout: 8_000 }
  28  |     );
  29  |   });
  30  | 
  31  |   test("faturalar tablosu görünür", async ({ page }) => {
  32  |     const table = page.locator("table, [class*=list]");
  33  |     await expect(table.first()).toBeVisible({ timeout: 8_000 });
  34  |   });
  35  | 
  36  |   test("demo faturaları listelenir", async ({ page }) => {
  37  |     const rows = page.locator("table tbody tr, li");
  38  |     await expect(rows.first()).toBeVisible({ timeout: 8_000 });
  39  |   });
  40  | 
  41  |   // ── 2. Durum etiketleri ───────────────────────────────────────────────────
  42  | 
  43  |   test("fatura durum etiketleri görünür", async ({ page }) => {
  44  |     // DRAFT, ISSUED, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED
  45  |     const badge = page.locator(
  46  |       '[class*=badge], [class*=status], [class*=tag]'
  47  |     );
  48  |     const count = await badge.count();
  49  |     expect(count).toBeGreaterThanOrEqual(0);
  50  |   });
  51  | 
  52  |   // ── 3. Fatura detayı ────────────────────────────────────────────────────
  53  | 
  54  |   test("bir faturaya tıklayınca detay sayfasına gidilir", async ({ page }) => {
  55  |     const invoiceLink = page
  56  |       .locator('table tbody tr a, [class*=invoice-row] a')
  57  |       .first();
  58  | 
  59  |     if (await invoiceLink.isVisible()) {
  60  |       await invoiceLink.click();
  61  |       await expect(page).toHaveURL(/\/invoices\/[^/]+/, { timeout: 5_000 });
  62  |     }
  63  |   });
  64  | 
  65  |   test("fatura detayında müşteri bilgisi görünür", async ({ page }) => {
  66  |     const invoiceLink = page
  67  |       .locator('table tbody tr a, [class*=invoice-row] a')
  68  |       .first();
  69  | 
  70  |     if (await invoiceLink.isVisible()) {
  71  |       await invoiceLink.click();
  72  |       await page.waitForURL(/\/invoices\/[^/]+/, { timeout: 5_000 });
  73  | 
  74  |       // Müşteri adı veya bölümü görünmeli
  75  |       const customerSection = page.locator(
  76  |         '[class*=customer], text=/Customer|Müşteri/i'
  77  |       );
  78  |       await expect(customerSection.first()).toBeVisible({ timeout: 5_000 });
  79  |     }
  80  |   });
  81  | 
  82  |   test("fatura detayında tutar bilgisi görünür", async ({ page }) => {
  83  |     const invoiceLink = page
  84  |       .locator('table tbody tr a, [class*=invoice-row] a')
  85  |       .first();
  86  | 
  87  |     if (await invoiceLink.isVisible()) {
  88  |       await invoiceLink.click();
  89  |       await page.waitForURL(/\/invoices\/[^/]+/, { timeout: 5_000 });
  90  | 
  91  |       // Para birimi veya tutar göstergesi
  92  |       const amountEl = page.locator(
  93  |         'text=/₺|TRY|total|toplam|subtotal/i, [class*=amount], [class*=total]'
  94  |       );
  95  |       await expect(amountEl.first()).toBeVisible({ timeout: 5_000 });
  96  |     }
  97  |   });
  98  | 
  99  |   // ── 4. Fatura yayınlama ───────────────────────────────────────────────────
  100 | 
  101 |   test("DRAFT faturada 'Issue' / 'Yayınla' butonu görünür", async ({
  102 |     page,
  103 |   }) => {
  104 |     const draftInvoice = page
  105 |       .locator('tr:has-text("DRAFT"), [class*=invoice]:has-text("DRAFT")')
  106 |       .first();
  107 | 
  108 |     if (await draftInvoice.isVisible()) {
  109 |       const link = draftInvoice.locator("a").first();
  110 |       if (await link.isVisible()) {
  111 |         await link.click();
  112 |         await page.waitForURL(/\/invoices\/[^/]+/, { timeout: 5_000 });
  113 | 
  114 |         const issueBtn = page.locator(
  115 |           'button:has-text("Issue"), button:has-text("Yayınla"), button:has-text("Publish")'
  116 |         );
  117 |         const visible = await issueBtn.isVisible();
  118 |         expect(typeof visible).toBe("boolean");
  119 |       }
  120 |     }
  121 |   });
  122 | 
  123 |   // ── 5. Yeni fatura ────────────────────────────────────────────────────────
  124 | 
  125 |   test("'New Invoice' / 'Yeni Fatura' butonu görünür", async ({ page }) => {
```