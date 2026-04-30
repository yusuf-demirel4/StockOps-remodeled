# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: critical-paths.spec.ts >> Critical Paths — Smoke Tests >> Authenticated flows >> products sayfası yüklenir
- Location: e2e\critical-paths.spec.ts:56:9

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1, h2').first()
Expected pattern: /products|ürün/i
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
          - heading "Ürünler" [level=2] [ref=e104]
          - paragraph [ref=e105]: SKU, barkod, kategori ve minimum stok seviyeleri.
      - generic [ref=e107]:
        - generic [ref=e108]:
          - heading "Yeni ürün" [level=3] [ref=e110]
          - generic [ref=e112]:
            - generic [ref=e113]:
              - text: SKU
              - textbox "SKU" [ref=e114]
            - generic [ref=e115]:
              - text: Ürün adı
              - textbox "Ürün adı" [ref=e116]
            - generic [ref=e117]:
              - generic [ref=e118]:
                - text: Barkod
                - textbox "Barkod" [ref=e119]
              - generic [ref=e120]:
                - button "Kamera" [ref=e121]:
                  - img [ref=e122]
                  - text: Kamera
                - button "Durdur" [disabled] [ref=e125]:
                  - img [ref=e126]
                  - text: Durdur
            - generic [ref=e128]:
              - text: Kategori
              - textbox "Kategori" [ref=e129]
            - generic [ref=e130]:
              - text: Minimum stok
              - spinbutton "Minimum stok" [ref=e131]
            - button "Ürün ekle" [ref=e132]:
              - img [ref=e133]
              - text: Ürün ekle
        - generic [ref=e134]:
          - heading "Ürün listesi" [level=3] [ref=e136]
          - table [ref=e139]:
            - rowgroup [ref=e140]:
              - row "SKU Ürün Kategori Barkod Minimum Durum Aksiyon" [ref=e141]:
                - columnheader "SKU" [ref=e142]
                - columnheader "Ürün" [ref=e143]
                - columnheader "Kategori" [ref=e144]
                - columnheader "Barkod" [ref=e145]
                - columnheader "Minimum" [ref=e146]
                - columnheader "Durum" [ref=e147]
                - columnheader "Aksiyon" [ref=e148]
            - rowgroup [ref=e149]:
              - row "KBD-MX-001 Mekanik Klavye MX Aksesuar 8690000000011 12 Aktif Pasif yap" [ref=e150]:
                - cell "KBD-MX-001" [ref=e151]
                - cell "Mekanik Klavye MX" [ref=e152]
                - cell "Aksesuar" [ref=e153]
                - cell "8690000000011" [ref=e154]
                - cell "12" [ref=e155]
                - cell "Aktif" [ref=e156]:
                  - generic [ref=e157]: Aktif
                - cell "Pasif yap" [ref=e158]:
                  - generic [ref=e159]:
                    - group [ref=e160]:
                      - generic "Düzenle" [ref=e161] [cursor=pointer]:
                        - img [ref=e162]
                        - text: Düzenle
                    - button "Pasif yap" [ref=e166]:
                      - img [ref=e167]
                      - text: Pasif yap
                    - group [ref=e169]:
                      - generic "Varyantlar (0)" [ref=e170] [cursor=pointer]:
                        - img [ref=e171]
                        - text: Varyantlar (0)
              - row "MOU-WL-002 Kablosuz Mouse Aksesuar 8690000000028 20 Aktif Pasif yap" [ref=e175]:
                - cell "MOU-WL-002" [ref=e176]
                - cell "Kablosuz Mouse" [ref=e177]
                - cell "Aksesuar" [ref=e178]
                - cell "8690000000028" [ref=e179]
                - cell "20" [ref=e180]
                - cell "Aktif" [ref=e181]:
                  - generic [ref=e182]: Aktif
                - cell "Pasif yap" [ref=e183]:
                  - generic [ref=e184]:
                    - group [ref=e185]:
                      - generic "Düzenle" [ref=e186] [cursor=pointer]:
                        - img [ref=e187]
                        - text: Düzenle
                    - button "Pasif yap" [ref=e191]:
                      - img [ref=e192]
                      - text: Pasif yap
                    - group [ref=e194]:
                      - generic "Varyantlar (0)" [ref=e195] [cursor=pointer]:
                        - img [ref=e196]
                        - text: Varyantlar (0)
              - row "MON-27-4K 27 inç 4K Monitör Ekran 8690000000035 8 Aktif Pasif yap" [ref=e200]:
                - cell "MON-27-4K" [ref=e201]
                - cell "27 inç 4K Monitör" [ref=e202]
                - cell "Ekran" [ref=e203]
                - cell "8690000000035" [ref=e204]
                - cell "8" [ref=e205]
                - cell "Aktif" [ref=e206]:
                  - generic [ref=e207]: Aktif
                - cell "Pasif yap" [ref=e208]:
                  - generic [ref=e209]:
                    - group [ref=e210]:
                      - generic "Düzenle" [ref=e211] [cursor=pointer]:
                        - img [ref=e212]
                        - text: Düzenle
                    - button "Pasif yap" [ref=e216]:
                      - img [ref=e217]
                      - text: Pasif yap
                    - group [ref=e219]:
                      - generic "Varyantlar (0)" [ref=e220] [cursor=pointer]:
                        - img [ref=e221]
                        - text: Varyantlar (0)
  - button "Open Next.js Dev Tools" [ref=e230] [cursor=pointer]:
    - img [ref=e231]
  - alert [ref=e234]
```

# Test source

```ts
  1   | /**
  2   |  * E2E Test: Critical Paths — Hızlı Smoke Test
  3   |  *
  4   |  * Bu dosya orijinal critical-paths testini kapsamlı şekilde yeniden yazar.
  5   |  * Tüm kritik sayfaların erişilebilir ve doğru render ettiğini hızlıca doğrular.
  6   |  *
  7   |  * Daha derin testler için ayrı spec dosyalarına bakın:
  8   |  *   - auth.spec.ts
  9   |  *   - dashboard.spec.ts
  10  |  *   - products.spec.ts
  11  |  *   - orders.spec.ts
  12  |  *   - invoices.spec.ts
  13  |  *   - inventory.spec.ts
  14  |  *   - customers.spec.ts
  15  |  *   - critical-flow.spec.ts (tam uçtan uca senaryo)
  16  |  */
  17  | 
  18  | import { test, expect } from "@playwright/test";
  19  | import { loginAsDemoUser } from "./helpers/auth";
  20  | 
  21  | test.describe("Critical Paths — Smoke Tests", () => {
  22  |   // ── Public sayfalar (auth gerekmez) ──────────────────────────────────────
  23  | 
  24  |   test("ana sayfa (/) yüklenir", async ({ page }) => {
  25  |     // Oturumsuz - /sign-in'e yönlendirir
  26  |     await page.goto("/");
  27  |     await page.waitForLoadState("domcontentloaded");
  28  |     // Crash olmamalı
  29  |     expect(page.url()).not.toMatch(/error|500/);
  30  |   });
  31  | 
  32  |   test("sign-in sayfası yüklenir", async ({ page }) => {
  33  |     await page.goto("/sign-in");
  34  |     await expect(page.locator("form")).toBeVisible({ timeout: 8_000 });
  35  |   });
  36  | 
  37  |   test("status sayfası hizmet durumunu gösterir", async ({ page }) => {
  38  |     await page.goto("/status");
  39  |     await expect(page.locator("h1")).toContainText(/StockOps Status/i, {
  40  |       timeout: 8_000,
  41  |     });
  42  |   });
  43  | 
  44  |   // ── Authenticated flows ────────────────────────────────────────────────────
  45  | 
  46  |   test.describe("Authenticated flows", () => {
  47  |     test.beforeEach(async ({ page }) => {
  48  |       await loginAsDemoUser(page);
  49  |     });
  50  | 
  51  |     test("giriş sonrası dashboard (/) yüklenir", async ({ page }) => {
  52  |       await page.goto("/");
  53  |       await expect(page.locator("nav")).toBeVisible({ timeout: 8_000 });
  54  |     });
  55  | 
  56  |     test("products sayfası yüklenir", async ({ page }) => {
  57  |       await page.goto("/products");
> 58  |       await expect(page.locator("h1, h2").first()).toContainText(
      |                                                    ^ Error: expect(locator).toContainText(expected) failed
  59  |         /products|ürün/i,
  60  |         { timeout: 8_000 }
  61  |       );
  62  |     });
  63  | 
  64  |     test("products/new formu erişilebilir", async ({ page }) => {
  65  |       await page.goto("/products/new");
  66  |       await page.waitForLoadState("domcontentloaded");
  67  |       // 500 hatası olmamalı
  68  |       const is500 = await page
  69  |         .locator("text=Internal Server Error")
  70  |         .isVisible({ timeout: 1_000 })
  71  |         .catch(() => false);
  72  |       expect(is500).toBeFalsy();
  73  |     });
  74  | 
  75  |     test("orders sayfası yüklenir", async ({ page }) => {
  76  |       await page.goto("/orders");
  77  |       await expect(page.locator("h1, h2").first()).toContainText(
  78  |         /orders|sipariş/i,
  79  |         { timeout: 8_000 }
  80  |       );
  81  |     });
  82  | 
  83  |     test("inventory sayfası yüklenir", async ({ page }) => {
  84  |       await page.goto("/inventory");
  85  |       await expect(page.locator("h1, h2").first()).toContainText(
  86  |         /inventory|stok|envanter/i,
  87  |         { timeout: 8_000 }
  88  |       );
  89  |     });
  90  | 
  91  |     test("customers sayfası yüklenir", async ({ page }) => {
  92  |       await page.goto("/customers");
  93  |       await expect(page.locator("h1, h2").first()).toContainText(
  94  |         /customers|müşteri/i,
  95  |         { timeout: 8_000 }
  96  |       );
  97  |     });
  98  | 
  99  |     test("invoices sayfası yüklenir", async ({ page }) => {
  100 |       await page.goto("/invoices");
  101 |       await expect(page.locator("h1, h2").first()).toContainText(
  102 |         /invoices|fatura/i,
  103 |         { timeout: 8_000 }
  104 |       );
  105 |     });
  106 | 
  107 |     test("suppliers sayfası yüklenir", async ({ page }) => {
  108 |       await page.goto("/suppliers");
  109 |       await page.waitForLoadState("domcontentloaded");
  110 |       const is500 = await page
  111 |         .locator("text=Internal Server Error")
  112 |         .isVisible({ timeout: 1_000 })
  113 |         .catch(() => false);
  114 |       expect(is500).toBeFalsy();
  115 |     });
  116 | 
  117 |     test("settings sayfası yüklenir", async ({ page }) => {
  118 |       await page.goto("/settings");
  119 |       await expect(page.locator("h1, h2").first()).toContainText(
  120 |         /settings|ayar/i,
  121 |         { timeout: 8_000 }
  122 |       );
  123 |     });
  124 | 
  125 |     // ── Navigation bar linkleri ───────────────────────────────────────────────
  126 | 
  127 |     test("nav bar tüm ana linklere sahip", async ({ page }) => {
  128 |       await page.goto("/");
  129 | 
  130 |       const nav = page.locator("nav");
  131 |       await expect(nav).toBeVisible({ timeout: 8_000 });
  132 | 
  133 |       // En az 3 link olmalı (Products, Orders, Inventory gibi)
  134 |       const links = nav.locator("a");
  135 |       const count = await links.count();
  136 |       expect(count).toBeGreaterThanOrEqual(3);
  137 |     });
  138 |   });
  139 | });
  140 | 
```