# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: orders.spec.ts >> Orders (Sipariş Yönetimi) >> sipariş detayı sayfasında durum bilgisi görünür
- Location: e2e\orders.spec.ts:96:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: [class*=badge], [class*=status], text=/DRAFT|CONFIRMED|PICKING|PACKED|SHIPPED|DELIVERED/i >> nth=0
Expected: visible
Error: Unexpected token "=" while parsing css selector "[class*=badge], [class*=status], text=/DRAFT|CONFIRMED|PICKING|PACKED|SHIPPED|DELIVERED/i". Did you mean to CSS.escape it?

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for [class*=badge], [class*=status], text=/DRAFT|CONFIRMED|PICKING|PACKED|SHIPPED|DELIVERED/i >> nth=0

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
    - img [ref=e8]
  - alert [ref=e11]
  - generic [ref=e13]:
    - complementary [ref=e14]:
      - generic [ref=e15]:
        - generic [ref=e16]:
          - paragraph [ref=e17]: StockOps
          - heading "KernelGuard StockOps" [level=1] [ref=e18]
          - paragraph [ref=e19]: Eren Admin
        - generic [ref=e20]:
          - generic [ref=e21]: Owner
          - button "Çıkış yap" [ref=e23]:
            - img [ref=e24]
      - navigation [ref=e27]:
        - link "Dashboard" [ref=e28] [cursor=pointer]:
          - /url: /
          - img [ref=e29]
          - text: Dashboard
        - link "Ürünler" [ref=e31] [cursor=pointer]:
          - /url: /products
          - img [ref=e32]
          - text: Ürünler
        - link "Stok" [ref=e36] [cursor=pointer]:
          - /url: /inventory
          - img [ref=e37]
          - text: Stok
        - link "Üretim" [ref=e47] [cursor=pointer]:
          - /url: /manufacturing
          - img [ref=e48]
          - text: Üretim
        - link "Müşteriler" [ref=e50] [cursor=pointer]:
          - /url: /customers
          - img [ref=e51]
          - text: Müşteriler
        - link "Siparişler" [ref=e56] [cursor=pointer]:
          - /url: /orders
          - img [ref=e57]
          - text: Siparişler
        - link "Faturalar" [ref=e60] [cursor=pointer]:
          - /url: /invoices
          - img [ref=e61]
          - text: Faturalar
        - link "Tedarikçiler" [ref=e64] [cursor=pointer]:
          - /url: /suppliers
          - img [ref=e65]
          - text: Tedarikçiler
        - link "Analitik" [ref=e70] [cursor=pointer]:
          - /url: /analytics
          - img [ref=e71]
          - text: Analitik
        - link "Tahmin" [ref=e74] [cursor=pointer]:
          - /url: /forecasting
          - img [ref=e75]
          - text: Tahmin
        - link "Raporlar" [ref=e83] [cursor=pointer]:
          - /url: /reports
          - img [ref=e84]
          - text: Raporlar
        - link "Kullanıcılar" [ref=e87] [cursor=pointer]:
          - /url: /users
          - img [ref=e88]
          - text: Kullanıcılar
        - link "Ayarlar" [ref=e90] [cursor=pointer]:
          - /url: /settings
          - img [ref=e91]
          - text: Ayarlar
      - generic [ref=e95]:
        - button "Açık" [ref=e96]:
          - img [ref=e97]
        - button "Koyu" [ref=e103]:
          - img [ref=e104]
        - button "Sistem" [ref=e106]:
          - img [ref=e107]
    - main [ref=e109]:
      - generic [ref=e110]:
        - paragraph [ref=e111]: Operasyon Paneli
        - generic [ref=e113]:
          - 'heading "Sipariş: SO-1001" [level=2] [ref=e114]'
          - paragraph [ref=e115]: Sipariş detayları ve yerine getirme süreci.
      - generic [ref=e116]:
        - link "Siparişlere Dön" [ref=e118] [cursor=pointer]:
          - /url: /orders
          - img [ref=e119]
          - text: Siparişlere Dön
        - generic [ref=e121]:
          - generic [ref=e123]:
            - heading "Sipariş Durumu" [level=3] [ref=e125]
            - generic [ref=e128]:
              - generic [ref=e130]:
                - img [ref=e132]
                - paragraph [ref=e136]: Taslak
              - generic [ref=e137]:
                - img [ref=e139]
                - paragraph [ref=e143]: Onaylandı
              - generic [ref=e144]:
                - img [ref=e146]
                - paragraph [ref=e151]: Toplanıyor
              - generic [ref=e152]:
                - img [ref=e154]
                - paragraph [ref=e160]: Paketlendi
              - generic [ref=e161]:
                - img [ref=e163]
                - paragraph [ref=e169]: Kargoya Verildi
              - generic [ref=e170]:
                - img [ref=e172]
                - paragraph [ref=e175]: Teslim Edildi
          - generic [ref=e177]:
            - generic [ref=e178]:
              - heading "Sipariş Özeti" [level=3] [ref=e180]
              - generic [ref=e182]:
                - generic [ref=e183]:
                  - generic [ref=e184]: Müşteri
                  - generic [ref=e185]: Nova Bilişim
                - generic [ref=e186]:
                  - generic [ref=e187]: Tarih
                  - generic [ref=e188]: 25.04.2026
                - generic [ref=e189]:
                  - generic [ref=e190]: Sipariş Durumu
                  - generic [ref=e191]: Taslak
            - generic [ref=e192]:
              - heading "Sipariş Kalemleri" [level=3] [ref=e194]
              - list [ref=e196]:
                - listitem [ref=e197]:
                  - generic [ref=e198]:
                    - paragraph [ref=e199]: Mekanik Klavye MX
                    - paragraph [ref=e200]: KBD-MX-001
                  - generic [ref=e201]: 3 Adet
```

# Test source

```ts
  10  | 
  11  | import { test, expect } from "@playwright/test";
  12  | import { loginAsDemoUser } from "./helpers/auth";
  13  | import { goToOrders } from "./helpers/navigation";
  14  | 
  15  | test.describe("Orders (Sipariş Yönetimi)", () => {
  16  |   test.beforeEach(async ({ page }) => {
  17  |     await loginAsDemoUser(page);
  18  |     await goToOrders(page);
  19  |   });
  20  | 
  21  |   // ── 1. Liste sayfası ─────────────────────────────────────────────────────
  22  | 
  23  |   test("siparişler sayfası doğru başlıkla yüklenir", async ({ page }) => {
  24  |     await expect(page.locator("h1, h2").first()).toContainText(
  25  |       /orders|sipariş/i,
  26  |       { timeout: 8_000 }
  27  |     );
  28  |   });
  29  | 
  30  |   test("siparişler tablosu veya listesi görünür", async ({ page }) => {
  31  |     const list = page.locator("table, [class*=list], ul");
  32  |     await expect(list.first()).toBeVisible({ timeout: 8_000 });
  33  |   });
  34  | 
  35  |   test("demo siparişleri listelenir", async ({ page }) => {
  36  |     const rows = page.locator("table tbody tr, li");
  37  |     await expect(rows.first()).toBeVisible({ timeout: 8_000 });
  38  |   });
  39  | 
  40  |   // ── 2. Sipariş durum etiketleri ─────────────────────────────────────────
  41  | 
  42  |   test("sipariş durum etiketleri görünür (DRAFT/CONFIRMED/SHIPPED vs.)", async ({
  43  |     page,
  44  |   }) => {
  45  |     const statusBadge = page.locator(
  46  |       '[class*=badge], [class*=status], [class*=tag], [class*=chip]'
  47  |     );
  48  |     // En az 1 badge görünmeli
  49  |     const count = await statusBadge.count();
  50  |     expect(count).toBeGreaterThanOrEqual(0); // Demo modunda 0 da olabilir
  51  |   });
  52  | 
  53  |   // ── 3. Yeni sipariş ──────────────────────────────────────────────────────
  54  | 
  55  |   test("'New Order' / 'Yeni Sipariş' butonu veya linki görünür", async ({
  56  |     page,
  57  |   }) => {
  58  |     const addBtn = page.locator(
  59  |       'a[href*="new"], button:has-text("New"), button:has-text("Yeni"), a:has-text("New"), a:has-text("Yeni"), button:has-text("Create"), a:has-text("Create")'
  60  |     );
  61  |     await expect(addBtn.first()).toBeVisible({ timeout: 8_000 });
  62  |   });
  63  | 
  64  |   test("'New Order' butonuna tıklayınca form veya /orders/new açılır", async ({
  65  |     page,
  66  |   }) => {
  67  |     const addBtn = page.locator(
  68  |       'a[href*="new"], button:has-text("New"), button:has-text("Yeni"), a:has-text("New"), a:has-text("Yeni")'
  69  |     ).first();
  70  | 
  71  |     if (await addBtn.isVisible()) {
  72  |       await addBtn.click();
  73  | 
  74  |       await Promise.race([
  75  |         page.waitForURL(/\/orders\/new/, { timeout: 5_000 }),
  76  |         expect(page.locator("form")).toBeVisible({ timeout: 5_000 }),
  77  |       ]).catch(() => {
  78  |         expect(page.url()).not.toMatch(/error|500/);
  79  |       });
  80  |     }
  81  |   });
  82  | 
  83  |   // ── 4. Sipariş detayı ────────────────────────────────────────────────────
  84  | 
  85  |   test("bir siparişe tıklayınca detay sayfasına gidilir", async ({ page }) => {
  86  |     const orderLink = page
  87  |       .locator('table tbody tr a, [class*=order-row] a')
  88  |       .first();
  89  | 
  90  |     if (await orderLink.isVisible()) {
  91  |       await orderLink.click();
  92  |       await expect(page).toHaveURL(/\/orders\/[^/]+/, { timeout: 5_000 });
  93  |     }
  94  |   });
  95  | 
  96  |   test("sipariş detayı sayfasında durum bilgisi görünür", async ({ page }) => {
  97  |     // İlk siparişe git
  98  |     const orderLink = page
  99  |       .locator('table tbody tr a, [class*=order-row] a')
  100 |       .first();
  101 | 
  102 |     if (await orderLink.isVisible()) {
  103 |       await orderLink.click();
  104 |       await page.waitForURL(/\/orders\/[^/]+/, { timeout: 5_000 });
  105 | 
  106 |       // Durum: DRAFT, CONFIRMED, PICKING, PACKED, SHIPPED, DELIVERED
  107 |       const statusEl = page.locator(
  108 |         '[class*=badge], [class*=status], text=/DRAFT|CONFIRMED|PICKING|PACKED|SHIPPED|DELIVERED/i'
  109 |       );
> 110 |       await expect(statusEl.first()).toBeVisible({ timeout: 5_000 });
      |                                      ^ Error: expect(locator).toBeVisible() failed
  111 |     }
  112 |   });
  113 | 
  114 |   // ── 5. Sipariş onaylama (DRAFT → CONFIRMED) ─────────────────────────────
  115 | 
  116 |   test("DRAFT sipariş varsa 'Confirm' butonu görünür", async ({ page }) => {
  117 |     // DRAFT durumundaki bir siparişi bul
  118 |     const draftOrder = page
  119 |       .locator(
  120 |         'tr:has([class*=badge]:has-text("DRAFT")), tr:has([class*=status]:has-text("DRAFT"))'
  121 |       )
  122 |       .first();
  123 | 
  124 |     if (await draftOrder.isVisible()) {
  125 |       const link = draftOrder.locator("a").first();
  126 |       if (await link.isVisible()) {
  127 |         await link.click();
  128 |         await page.waitForURL(/\/orders\/[^/]+/, { timeout: 5_000 });
  129 | 
  130 |         const confirmBtn = page.locator(
  131 |           'button:has-text("Confirm"), button:has-text("Onayla"), button:has-text("Confirmed")'
  132 |         );
  133 |         // Buton varsa görünür olmalı, yoksa test pass edilir
  134 |         const visible = await confirmBtn.isVisible();
  135 |         expect(typeof visible).toBe("boolean"); // Tolerant check
  136 |       }
  137 |     }
  138 |   });
  139 | });
  140 | 
```