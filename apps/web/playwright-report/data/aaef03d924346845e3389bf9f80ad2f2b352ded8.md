# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: critical-paths.spec.ts >> Critical Paths — Smoke Tests >> Authenticated flows >> inventory sayfası yüklenir
- Location: e2e\critical-paths.spec.ts:83:9

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1, h2').first()
Expected pattern: /inventory|stok|envanter/i
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
          - heading "Stok" [level=2] [ref=e104]
          - paragraph [ref=e105]: Giriş, çıkış, transfer, düzeltme ve hareket geçmişi.
      - generic [ref=e107]:
        - generic [ref=e108]:
          - generic [ref=e109]:
            - heading "Stok hareketi" [level=3] [ref=e111]
            - generic [ref=e113]:
              - generic [ref=e114]:
                - text: Barkod / hızlı giriş
                - textbox "Barkod / hızlı giriş" [ref=e115]:
                  - /placeholder: USB okuyucu ile okut
              - generic [ref=e116]:
                - generic [ref=e117]:
                  - text: Ürün
                  - combobox "Ürün" [ref=e118]:
                    - option "KBD-MX-001 - Mekanik Klavye MX" [selected]
                    - option "MOU-WL-002 - Kablosuz Mouse"
                    - option "MON-27-4K - 27 inç 4K Monitör"
                - generic [ref=e119]:
                  - text: Barkod / QR
                  - textbox "Barkod / QR" [ref=e120]:
                    - /placeholder: "8690000000011"
                - generic [ref=e121]:
                  - button "Kamera" [ref=e122]:
                    - img [ref=e123]
                    - text: Kamera
                  - button "Durdur" [disabled] [ref=e126]:
                    - img [ref=e127]
                    - text: Durdur
                - img [ref=e131]
              - generic [ref=e136]:
                - text: Depo
                - combobox "Depo" [ref=e137]:
                  - option "Ana Depo" [selected]
                  - option "Showroom"
              - generic [ref=e138]:
                - text: Hareket tipi
                - combobox "Hareket tipi" [ref=e139]:
                  - option "Giriş" [selected]
                  - option "Çıkış"
                  - option "Düzeltme"
              - generic [ref=e140]:
                - text: Miktar
                - spinbutton "Miktar" [ref=e141]
              - generic [ref=e142]:
                - text: Not
                - textbox "Not" [ref=e143]
              - button "Hareket kaydet" [ref=e144]:
                - img [ref=e145]
                - text: Hareket kaydet
          - generic [ref=e146]:
            - heading "Depolar arası transfer" [level=3] [ref=e148]
            - generic [ref=e150]:
              - generic [ref=e151]:
                - generic [ref=e152]:
                  - text: Ürün
                  - combobox "Ürün" [ref=e153]:
                    - option "KBD-MX-001 - Mekanik Klavye MX" [selected]
                    - option "MOU-WL-002 - Kablosuz Mouse"
                    - option "MON-27-4K - 27 inç 4K Monitör"
                - generic [ref=e154]:
                  - text: Barkod / QR
                  - textbox "Barkod / QR" [ref=e155]:
                    - /placeholder: "8690000000011"
                - generic [ref=e156]:
                  - button "Kamera" [ref=e157]:
                    - img [ref=e158]
                    - text: Kamera
                  - button "Durdur" [disabled] [ref=e161]:
                    - img [ref=e162]
                    - text: Durdur
                - img [ref=e166]
              - generic [ref=e171]:
                - text: Kaynak depo
                - combobox "Kaynak depo" [ref=e172]:
                  - option "Ana Depo" [selected]
                  - option "Showroom"
              - generic [ref=e173]:
                - text: Hedef depo
                - combobox "Hedef depo" [ref=e174]:
                  - option "Ana Depo"
                  - option "Showroom" [selected]
              - generic [ref=e175]:
                - text: Miktar
                - spinbutton "Miktar" [ref=e176]
              - generic [ref=e177]:
                - text: Not
                - textbox "Not" [ref=e178]
              - button "Transfer oluştur" [ref=e179]:
                - img [ref=e180]
                - text: Transfer oluştur
        - generic [ref=e181]:
          - generic [ref=e182]:
            - heading "Mevcut stok" [level=3] [ref=e184]
            - table [ref=e187]:
              - rowgroup [ref=e188]:
                - row "SKU Ürün Depo Eldeki stok Minimum" [ref=e189]:
                  - columnheader "SKU" [ref=e190]
                  - columnheader "Ürün" [ref=e191]
                  - columnheader "Depo" [ref=e192]
                  - columnheader "Eldeki stok" [ref=e193]
                  - columnheader "Minimum" [ref=e194]
              - rowgroup [ref=e195]:
                - row "KBD-MX-001 Mekanik Klavye MX Ana Depo 30 12" [ref=e196]:
                  - cell "KBD-MX-001" [ref=e197]
                  - cell "Mekanik Klavye MX" [ref=e198]
                  - cell "Ana Depo" [ref=e199]
                  - cell "30" [ref=e200]:
                    - generic [ref=e201]: "30"
                  - cell "12" [ref=e202]
                - row "KBD-MX-001 Mekanik Klavye MX Showroom 4 12" [ref=e203]:
                  - cell "KBD-MX-001" [ref=e204]
                  - cell "Mekanik Klavye MX" [ref=e205]
                  - cell "Showroom" [ref=e206]
                  - cell "4" [ref=e207]:
                    - generic [ref=e208]: "4"
                  - cell "12" [ref=e209]
                - row "MOU-WL-002 Kablosuz Mouse Ana Depo 16 20" [ref=e210]:
                  - cell "MOU-WL-002" [ref=e211]
                  - cell "Kablosuz Mouse" [ref=e212]
                  - cell "Ana Depo" [ref=e213]
                  - cell "16" [ref=e214]:
                    - generic [ref=e215]: "16"
                  - cell "20" [ref=e216]
                - row "MOU-WL-002 Kablosuz Mouse Showroom 0 20" [ref=e217]:
                  - cell "MOU-WL-002" [ref=e218]
                  - cell "Kablosuz Mouse" [ref=e219]
                  - cell "Showroom" [ref=e220]
                  - cell "0" [ref=e221]:
                    - generic [ref=e222]: "0"
                  - cell "20" [ref=e223]
                - row "MON-27-4K 27 inç 4K Monitör Ana Depo 6 8" [ref=e224]:
                  - cell "MON-27-4K" [ref=e225]
                  - cell "27 inç 4K Monitör" [ref=e226]
                  - cell "Ana Depo" [ref=e227]
                  - cell "6" [ref=e228]:
                    - generic [ref=e229]: "6"
                  - cell "8" [ref=e230]
                - row "MON-27-4K 27 inç 4K Monitör Showroom 0 8" [ref=e231]:
                  - cell "MON-27-4K" [ref=e232]
                  - cell "27 inç 4K Monitör" [ref=e233]
                  - cell "Showroom" [ref=e234]
                  - cell "0" [ref=e235]:
                    - generic [ref=e236]: "0"
                  - cell "8" [ref=e237]
          - generic [ref=e238]:
            - heading "Hareket geçmişi" [level=3] [ref=e240]
            - table [ref=e243]:
              - rowgroup [ref=e244]:
                - row "Tarih Tip SKU Ürün Depo Miktar" [ref=e245]:
                  - columnheader "Tarih" [ref=e246]
                  - columnheader "Tip" [ref=e247]
                  - columnheader "SKU" [ref=e248]
                  - columnheader "Ürün" [ref=e249]
                  - columnheader "Depo" [ref=e250]
                  - columnheader "Miktar" [ref=e251]
              - rowgroup [ref=e252]:
                - row "25 Nis 12:00 Giriş KBD-MX-001 Mekanik Klavye MX Ana Depo +30" [ref=e253]:
                  - cell "25 Nis 12:00" [ref=e254]
                  - cell "Giriş" [ref=e255]
                  - cell "KBD-MX-001" [ref=e256]
                  - cell "Mekanik Klavye MX" [ref=e257]
                  - cell "Ana Depo" [ref=e258]
                  - cell "+30" [ref=e259]
                - row "25 Nis 12:00 Giriş MOU-WL-002 Kablosuz Mouse Ana Depo +16" [ref=e260]:
                  - cell "25 Nis 12:00" [ref=e261]
                  - cell "Giriş" [ref=e262]
                  - cell "MOU-WL-002" [ref=e263]
                  - cell "Kablosuz Mouse" [ref=e264]
                  - cell "Ana Depo" [ref=e265]
                  - cell "+16" [ref=e266]
                - row "25 Nis 12:00 Giriş MON-27-4K 27 inç 4K Monitör Ana Depo +6" [ref=e267]:
                  - cell "25 Nis 12:00" [ref=e268]
                  - cell "Giriş" [ref=e269]
                  - cell "MON-27-4K" [ref=e270]
                  - cell "27 inç 4K Monitör" [ref=e271]
                  - cell "Ana Depo" [ref=e272]
                  - cell "+6" [ref=e273]
                - row "25 Nis 12:00 Giriş KBD-MX-001 Mekanik Klavye MX Showroom +4" [ref=e274]:
                  - cell "25 Nis 12:00" [ref=e275]
                  - cell "Giriş" [ref=e276]
                  - cell "KBD-MX-001" [ref=e277]
                  - cell "Mekanik Klavye MX" [ref=e278]
                  - cell "Showroom" [ref=e279]
                  - cell "+4" [ref=e280]
  - button "Open Next.js Dev Tools" [ref=e286] [cursor=pointer]:
    - img [ref=e287]
  - alert [ref=e290]
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
  58  |       await expect(page.locator("h1, h2").first()).toContainText(
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
> 85  |       await expect(page.locator("h1, h2").first()).toContainText(
      |                                                    ^ Error: expect(locator).toContainText(expected) failed
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