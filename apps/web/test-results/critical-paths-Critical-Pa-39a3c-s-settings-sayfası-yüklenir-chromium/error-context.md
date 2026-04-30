# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: critical-paths.spec.ts >> Critical Paths — Smoke Tests >> Authenticated flows >> settings sayfası yüklenir
- Location: e2e\critical-paths.spec.ts:117:9

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1, h2').first()
Expected pattern: /settings|ayar/i
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
          - heading "Ayarlar" [level=2] [ref=e104]
          - paragraph [ref=e105]: Rol bazlı erişim, depo yapısı ve işletme bağlamı.
      - generic [ref=e107]:
        - generic [ref=e108]:
          - generic [ref=e109]:
            - heading "Depolar" [level=3] [ref=e111]
            - table [ref=e114]:
              - rowgroup [ref=e115]:
                - row "Kod Depo Durum Aksiyon" [ref=e116]:
                  - columnheader "Kod" [ref=e117]
                  - columnheader "Depo" [ref=e118]
                  - columnheader "Durum" [ref=e119]
                  - columnheader "Aksiyon" [ref=e120]
              - rowgroup [ref=e121]:
                - row "MAIN Ana Depo Varsayılan" [ref=e122]:
                  - cell "MAIN" [ref=e123]
                  - cell "Ana Depo" [ref=e124]
                  - cell "Varsayılan" [ref=e125]:
                    - generic [ref=e126]: Varsayılan
                  - cell [ref=e127]:
                    - group [ref=e129]:
                      - generic "Düzenle" [ref=e130] [cursor=pointer]:
                        - img [ref=e131]
                        - text: Düzenle
                - row "SHOW Showroom Aktif Varsayılan yap" [ref=e134]:
                  - cell "SHOW" [ref=e135]
                  - cell "Showroom" [ref=e136]
                  - cell "Aktif" [ref=e137]:
                    - generic [ref=e138]: Aktif
                  - cell "Varsayılan yap" [ref=e139]:
                    - generic [ref=e140]:
                      - group [ref=e141]:
                        - generic "Düzenle" [ref=e142] [cursor=pointer]:
                          - img [ref=e143]
                          - text: Düzenle
                      - button "Varsayılan yap" [ref=e147]:
                        - img [ref=e148]
                        - text: Varsayılan yap
          - generic [ref=e150]:
            - heading "Depo ekle" [level=3] [ref=e152]
            - generic [ref=e154]:
              - generic [ref=e155]:
                - generic [ref=e156]:
                  - text: Kod
                  - textbox "Kod" [ref=e157]
                - generic [ref=e158]:
                  - text: Depo adı
                  - textbox "Depo adı" [ref=e159]
              - generic [ref=e160]:
                - checkbox "Varsayılan depo" [ref=e161]
                - text: Varsayılan depo
              - button "Depo ekle" [ref=e162]:
                - img [ref=e163]
                - text: Depo ekle
          - generic [ref=e164]:
            - 'heading "Faz 6.3: Dil ve para birimi" [level=3] [ref=e166]'
            - generic [ref=e168]:
              - generic [ref=e169]:
                - generic [ref=e170]: Varsayilan para birimi
                - combobox "Varsayilan para birimi" [ref=e171]:
                  - option "TRY" [selected]
                  - option "USD"
                  - option "EUR"
                  - option "GBP"
                  - option "CHF"
                  - option "CAD"
                  - option "AUD"
                  - option "JPY"
              - generic [ref=e172]:
                - generic [ref=e173]: Dil
                - combobox "Dil" [ref=e174]:
                  - option "Turkce" [selected]
                  - option "English"
              - button "Kaydet" [ref=e175]
          - generic [ref=e176]:
            - 'heading "Faz 6.3: Kur servisi" [level=3] [ref=e178]'
            - generic [ref=e180]:
              - generic [ref=e181]:
                - generic [ref=e182]:
                  - generic [ref=e183]:
                    - generic [ref=e184]: Baz
                    - combobox "Baz" [ref=e185]:
                      - option "TRY"
                      - option "USD"
                      - option "EUR" [selected]
                      - option "GBP"
                      - option "CHF"
                      - option "CAD"
                      - option "AUD"
                      - option "JPY"
                  - generic [ref=e186]:
                    - generic [ref=e187]: Karsilik
                    - combobox "Karsilik" [ref=e188]:
                      - option "TRY" [selected]
                      - option "USD"
                      - option "EUR"
                      - option "GBP"
                      - option "CHF"
                      - option "CAD"
                      - option "AUD"
                      - option "JPY"
                  - generic [ref=e189]:
                    - generic [ref=e190]: Kaynak
                    - combobox "Kaynak" [ref=e191]:
                      - option "ECB" [selected]
                      - option "TCMB"
                - button "Kuru guncelle" [ref=e192]:
                  - img [ref=e193]
                  - text: Kuru guncelle
              - paragraph [ref=e198]: Henuz kur kaydi yok.
          - generic [ref=e199]:
            - 'heading "Faz 6.4: Extension API" [level=3] [ref=e201]'
            - generic [ref=e203]:
              - generic [ref=e204]:
                - generic [ref=e205]:
                  - generic [ref=e206]: Webhook URL
                  - textbox "Webhook URL" [ref=e207]:
                    - /placeholder: https://example.com/stockops/webhook
                - generic [ref=e208]:
                  - generic [ref=e209]: Secret
                  - textbox "Secret" [ref=e210]:
                    - /placeholder: Minimum 12 karakter
                - generic [ref=e211]:
                  - generic [ref=e212]:
                    - checkbox "order.created" [ref=e213]
                    - generic [ref=e214]: order.created
                  - generic [ref=e215]:
                    - checkbox "order.updated" [ref=e216]
                    - generic [ref=e217]: order.updated
                  - generic [ref=e218]:
                    - checkbox "stock.changed" [ref=e219]
                    - generic [ref=e220]: stock.changed
                  - generic [ref=e221]:
                    - checkbox "invoice.issued" [ref=e222]
                    - generic [ref=e223]: invoice.issued
                  - generic [ref=e224]:
                    - checkbox "product.updated" [ref=e225]
                    - generic [ref=e226]: product.updated
                  - generic [ref=e227]:
                    - checkbox "purchase.received" [ref=e228]
                    - generic [ref=e229]: purchase.received
                - button "Abonelik olustur" [ref=e230]:
                  - img [ref=e231]
                  - text: Abonelik olustur
              - generic [ref=e235]:
                - heading "Ozel alan ornegi" [level=4] [ref=e236]:
                  - img [ref=e237]
                  - text: Ozel alan ornegi
                - generic [ref=e240]:
                  - generic [ref=e241]:
                    - generic [ref=e242]: Urun
                    - combobox "Urun" [ref=e243]:
                      - option "KBD-MX-001 - Mekanik Klavye MX" [selected]
                      - option "MOU-WL-002 - Kablosuz Mouse"
                      - option "MON-27-4K - 27 inç 4K Monitör"
                  - generic [ref=e244]:
                    - generic [ref=e245]:
                      - generic [ref=e246]: Anahtar
                      - textbox "Anahtar" [ref=e247]:
                        - /placeholder: warranty.months
                    - generic [ref=e248]:
                      - generic [ref=e249]: Deger
                      - textbox "Deger" [ref=e250]:
                        - /placeholder: "24"
                  - button "Ozel alan kaydet" [ref=e251]
          - generic [ref=e252]:
            - heading "P2 entegrasyon inbox" [level=3] [ref=e254]
            - generic [ref=e256]: Webhook kaydi bulunmuyor.
          - generic [ref=e257]:
            - heading "Bildirim teslimatlari" [level=3] [ref=e259]
            - generic [ref=e261]: Bildirim teslimat kaydi bulunmuyor.
          - generic [ref=e262]:
            - heading "Rol matrisi" [level=3] [ref=e264]
            - table [ref=e267]:
              - rowgroup [ref=e268]:
                - row "Rol Kullanıcı Ürün Stok Satış Satın alma Dashboard" [ref=e269]:
                  - columnheader "Rol" [ref=e270]
                  - columnheader "Kullanıcı" [ref=e271]
                  - columnheader "Ürün" [ref=e272]
                  - columnheader "Stok" [ref=e273]
                  - columnheader "Satış" [ref=e274]
                  - columnheader "Satın alma" [ref=e275]
                  - columnheader "Dashboard" [ref=e276]
              - rowgroup [ref=e277]:
                - row "Sahip Var Var Var Var Var Var" [ref=e278]:
                  - cell "Sahip" [ref=e279]
                  - cell "Var" [ref=e280]:
                    - generic [ref=e281]: Var
                  - cell "Var" [ref=e282]:
                    - generic [ref=e283]: Var
                  - cell "Var" [ref=e284]:
                    - generic [ref=e285]: Var
                  - cell "Var" [ref=e286]:
                    - generic [ref=e287]: Var
                  - cell "Var" [ref=e288]:
                    - generic [ref=e289]: Var
                  - cell "Var" [ref=e290]:
                    - generic [ref=e291]: Var
                - row "Admin Var Var Var Var Var Var" [ref=e292]:
                  - cell "Admin" [ref=e293]
                  - cell "Var" [ref=e294]:
                    - generic [ref=e295]: Var
                  - cell "Var" [ref=e296]:
                    - generic [ref=e297]: Var
                  - cell "Var" [ref=e298]:
                    - generic [ref=e299]: Var
                  - cell "Var" [ref=e300]:
                    - generic [ref=e301]: Var
                  - cell "Var" [ref=e302]:
                    - generic [ref=e303]: Var
                  - cell "Var" [ref=e304]:
                    - generic [ref=e305]: Var
                - row "Depo Yok Yok Var Yok Yok Var" [ref=e306]:
                  - cell "Depo" [ref=e307]
                  - cell "Yok" [ref=e308]:
                    - generic [ref=e309]: Yok
                  - cell "Yok" [ref=e310]:
                    - generic [ref=e311]: Yok
                  - cell "Var" [ref=e312]:
                    - generic [ref=e313]: Var
                  - cell "Yok" [ref=e314]:
                    - generic [ref=e315]: Yok
                  - cell "Yok" [ref=e316]:
                    - generic [ref=e317]: Yok
                  - cell "Var" [ref=e318]:
                    - generic [ref=e319]: Var
                - row "Satış Yok Yok Yok Var Yok Var" [ref=e320]:
                  - cell "Satış" [ref=e321]
                  - cell "Yok" [ref=e322]:
                    - generic [ref=e323]: Yok
                  - cell "Yok" [ref=e324]:
                    - generic [ref=e325]: Yok
                  - cell "Yok" [ref=e326]:
                    - generic [ref=e327]: Yok
                  - cell "Var" [ref=e328]:
                    - generic [ref=e329]: Var
                  - cell "Yok" [ref=e330]:
                    - generic [ref=e331]: Yok
                  - cell "Var" [ref=e332]:
                    - generic [ref=e333]: Var
                - row "Satın alma Yok Yok Yok Yok Var Var" [ref=e334]:
                  - cell "Satın alma" [ref=e335]
                  - cell "Yok" [ref=e336]:
                    - generic [ref=e337]: Yok
                  - cell "Yok" [ref=e338]:
                    - generic [ref=e339]: Yok
                  - cell "Yok" [ref=e340]:
                    - generic [ref=e341]: Yok
                  - cell "Yok" [ref=e342]:
                    - generic [ref=e343]: Yok
                  - cell "Var" [ref=e344]:
                    - generic [ref=e345]: Var
                  - cell "Var" [ref=e346]:
                    - generic [ref=e347]: Var
                - row "Görüntüleme Yok Yok Yok Yok Yok Var" [ref=e348]:
                  - cell "Görüntüleme" [ref=e349]
                  - cell "Yok" [ref=e350]:
                    - generic [ref=e351]: Yok
                  - cell "Yok" [ref=e352]:
                    - generic [ref=e353]: Yok
                  - cell "Yok" [ref=e354]:
                    - generic [ref=e355]: Yok
                  - cell "Yok" [ref=e356]:
                    - generic [ref=e357]: Yok
                  - cell "Yok" [ref=e358]:
                    - generic [ref=e359]: Yok
                  - cell "Var" [ref=e360]:
                    - generic [ref=e361]: Var
        - generic [ref=e362]:
          - heading "İşletme" [level=3] [ref=e364]
          - generic [ref=e366]:
            - generic [ref=e367]:
              - term [ref=e368]: İşletme
              - definition [ref=e369]: KernelGuard StockOps
            - generic [ref=e370]:
              - term [ref=e371]: Slug
              - definition [ref=e372]: kernelguard
            - generic [ref=e373]:
              - term [ref=e374]: Aktif kullanıcı
              - definition [ref=e375]: Eren Admin
            - generic [ref=e376]:
              - term [ref=e377]: Rol
              - definition [ref=e378]:
                - generic [ref=e379]: Sahip
            - generic [ref=e380]:
              - term [ref=e381]: Varsayılan depo
              - definition [ref=e382]: Ana Depo
  - button "Open Next.js Dev Tools" [ref=e388] [cursor=pointer]:
    - img [ref=e389]
  - alert [ref=e392]
```

# Test source

```ts
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
> 119 |       await expect(page.locator("h1, h2").first()).toContainText(
      |                                                    ^ Error: expect(locator).toContainText(expected) failed
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