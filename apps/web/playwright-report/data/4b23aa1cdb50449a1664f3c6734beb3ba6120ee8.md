# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: critical-paths.spec.ts >> Critical Paths — Smoke Tests >> Authenticated flows >> orders sayfası yüklenir
- Location: e2e\critical-paths.spec.ts:75:9

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1, h2').first()
Expected pattern: /orders|sipariş/i
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
          - heading "Siparişler" [level=2] [ref=e104]
          - paragraph [ref=e105]: Satış siparişi stok düşer, satın alma teslimi stok artırır.
      - generic [ref=e106]:
        - generic [ref=e107]:
          - generic [ref=e108]:
            - heading "Satış siparişi" [level=3] [ref=e110]
            - generic [ref=e112]:
              - generic [ref=e113]:
                - text: Müşteri
                - textbox "Müşteri" [ref=e114]
              - generic [ref=e115]:
                - generic [ref=e116]:
                  - text: Ürün
                  - combobox "Ürün" [ref=e117]:
                    - option "KBD-MX-001 - Mekanik Klavye MX" [selected]
                    - option "MOU-WL-002 - Kablosuz Mouse"
                    - option "MON-27-4K - 27 inç 4K Monitör"
                - generic [ref=e118]:
                  - text: Barkod / QR
                  - textbox "Barkod / QR" [ref=e119]:
                    - /placeholder: "8690000000011"
                - generic [ref=e120]:
                  - button "Kamera" [ref=e121]:
                    - img [ref=e122]
                    - text: Kamera
                  - button "Durdur" [disabled] [ref=e125]:
                    - img [ref=e126]
                    - text: Durdur
                - img [ref=e130]
              - generic [ref=e135]:
                - text: Miktar
                - spinbutton "Miktar" [ref=e136]
              - button "Satış oluştur" [ref=e137]:
                - img [ref=e138]
                - text: Satış oluştur
          - generic [ref=e139]:
            - heading "Satın alma siparişi" [level=3] [ref=e141]
            - generic [ref=e143]:
              - generic [ref=e144]:
                - text: Tedarikçi
                - combobox "Tedarikçi" [ref=e145]:
                  - option "TechLine Tedarik" [selected]
                  - option "DisplayHub"
              - generic [ref=e146]:
                - generic [ref=e147]:
                  - text: Ürün
                  - combobox "Ürün" [ref=e148]:
                    - option "KBD-MX-001 - Mekanik Klavye MX" [selected]
                    - option "MOU-WL-002 - Kablosuz Mouse"
                    - option "MON-27-4K - 27 inç 4K Monitör"
                - generic [ref=e149]:
                  - text: Barkod / QR
                  - textbox "Barkod / QR" [ref=e150]:
                    - /placeholder: "8690000000011"
                - generic [ref=e151]:
                  - button "Kamera" [ref=e152]:
                    - img [ref=e153]
                    - text: Kamera
                  - button "Durdur" [disabled] [ref=e156]:
                    - img [ref=e157]
                    - text: Durdur
                - img [ref=e161]
              - generic [ref=e166]:
                - generic [ref=e167]:
                  - text: Miktar
                  - spinbutton "Miktar" [ref=e168]
                - generic [ref=e169]:
                  - text: Beklenen tarih
                  - textbox "Beklenen tarih" [ref=e170]
              - button "Satın alma oluştur" [ref=e171]:
                - img [ref=e172]
                - text: Satın alma oluştur
        - generic [ref=e178]:
          - heading "Satın alma önerileri" [level=3] [ref=e180]
          - table [ref=e183]:
            - rowgroup [ref=e184]:
              - row "SKU Ürün Tedarikçi Eldeki Açık satış Bekleyen teslim Projeksiyon Öneri" [ref=e185]:
                - columnheader "SKU" [ref=e186]
                - columnheader "Ürün" [ref=e187]
                - columnheader "Tedarikçi" [ref=e188]
                - columnheader "Eldeki" [ref=e189]
                - columnheader "Açık satış" [ref=e190]
                - columnheader "Bekleyen teslim" [ref=e191]
                - columnheader "Projeksiyon" [ref=e192]
                - columnheader "Öneri" [ref=e193]
            - rowgroup [ref=e194]:
              - row "MOU-WL-002 Kablosuz Mouse TechLine Tedarik 16 0 0 16 24" [ref=e195]:
                - cell "MOU-WL-002" [ref=e196]
                - cell "Kablosuz Mouse" [ref=e197]
                - cell "TechLine Tedarik" [ref=e198]
                - cell "16" [ref=e199]
                - cell "0" [ref=e200]
                - cell "0" [ref=e201]
                - cell "16" [ref=e202]
                - cell "24" [ref=e203]:
                  - generic [ref=e204]: "24"
        - generic [ref=e205]:
          - generic [ref=e206]:
            - heading "Satış siparişleri" [level=3] [ref=e208]
            - table [ref=e211]:
              - rowgroup [ref=e212]:
                - row "Kod Müşteri Satırlar Durum Aksiyon" [ref=e213]:
                  - columnheader "Kod" [ref=e214]
                  - columnheader "Müşteri" [ref=e215]
                  - columnheader "Satırlar" [ref=e216]
                  - columnheader "Durum" [ref=e217]
                  - columnheader "Aksiyon" [ref=e218]
              - rowgroup [ref=e219]:
                - row "SO-1001 Nova Bilişim KBD-MX-001 x 3 Taslak Onayla" [ref=e220]:
                  - cell "SO-1001" [ref=e221]:
                    - link "SO-1001" [ref=e222] [cursor=pointer]:
                      - /url: /orders/so_1001
                  - cell "Nova Bilişim" [ref=e223]
                  - cell "KBD-MX-001 x 3" [ref=e224]
                  - cell "Taslak" [ref=e225]:
                    - generic [ref=e226]: Taslak
                  - cell "Onayla" [ref=e227]:
                    - button "Onayla" [ref=e230]:
                      - img [ref=e231]
                      - text: Onayla
                - row "SO-1002 Mavi Ofis MOU-WL-002 x 4 Onaylandı" [ref=e233]:
                  - cell "SO-1002" [ref=e234]:
                    - link "SO-1002" [ref=e235] [cursor=pointer]:
                      - /url: /orders/so_1002
                  - cell "Mavi Ofis" [ref=e236]
                  - cell "MOU-WL-002 x 4" [ref=e237]
                  - cell "Onaylandı" [ref=e238]:
                    - generic [ref=e239]: Onaylandı
                  - cell [ref=e240]:
                    - group [ref=e242]:
                      - generic "İade oluştur" [ref=e243] [cursor=pointer]:
                        - img [ref=e244]
                        - text: İade oluştur
          - generic [ref=e247]:
            - heading "Satın alma siparişleri" [level=3] [ref=e249]
            - table [ref=e252]:
              - rowgroup [ref=e253]:
                - row "Kod Tedarikçi Satırlar Durum Aksiyon" [ref=e254]:
                  - columnheader "Kod" [ref=e255]
                  - columnheader "Tedarikçi" [ref=e256]
                  - columnheader "Satırlar" [ref=e257]
                  - columnheader "Durum" [ref=e258]
                  - columnheader "Aksiyon" [ref=e259]
              - rowgroup [ref=e260]:
                - row "PO-2001 DisplayHub MON-27-4K x 0/10 Gönderildi Teslim al" [ref=e261]:
                  - cell "PO-2001" [ref=e262]
                  - cell "DisplayHub" [ref=e263]
                  - cell "MON-27-4K x 0/10" [ref=e264]
                  - cell "Gönderildi" [ref=e265]:
                    - generic [ref=e266]: Gönderildi
                  - cell "Teslim al" [ref=e267]:
                    - button "Teslim al" [ref=e269]:
                      - img [ref=e270]
                      - text: Teslim al
        - generic [ref=e273]:
          - heading "İadeler" [level=3] [ref=e275]
          - generic [ref=e277]: Henüz iade talebi yok. Onaylanmış siparişlerden iade oluşturabilirsiniz.
  - button "Open Next.js Dev Tools" [ref=e283] [cursor=pointer]:
    - img [ref=e284]
  - alert [ref=e287]
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
> 77  |       await expect(page.locator("h1, h2").first()).toContainText(
      |                                                    ^ Error: expect(locator).toContainText(expected) failed
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