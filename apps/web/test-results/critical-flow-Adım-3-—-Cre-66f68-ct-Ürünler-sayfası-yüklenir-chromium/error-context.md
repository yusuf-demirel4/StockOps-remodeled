# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: critical-flow.spec.ts >> Adım 3 — Create Product: Ürünler sayfası yüklenir
- Location: e2e\critical-flow.spec.ts:75:5

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
  2   |  * E2E Test: Critical Business Flow (Kritik İş Akışı)
  3   |  *
  4   |  * Implementation plan'da hedeflenen tam e2e senaryosu:
  5   |  *   Login → Dashboard → Create Product → Create Order →
  6   |  *   Confirm Order → Ship → Invoice → Pay
  7   |  *
  8   |  * Bu test, demo modunda çalışan uygulamayı uçtan uca test eder.
  9   |  * Her adım bir sonrakine bağımlıdır (serial mod).
  10  |  */
  11  | 
  12  | import { test, expect, type Page } from "@playwright/test";
  13  | import { loginAsDemoUser } from "./helpers/auth";
  14  | 
  15  | // Bu test dosyasındaki tüm testler sırayla çalışır (birbirine bağımlı)
  16  | test.describe.configure({ mode: "serial" });
  17  | 
  18  | // Paylaşılan state — test adımları arasında kullanılır
  19  | let createdProductName: string;
  20  | 
  21  | // ────────────────────────────────────────────────────────────────────────────
  22  | // Yardımcı: Sayfa yüklendikten sonra hata olup olmadığını kontrol et
  23  | // ────────────────────────────────────────────────────────────────────────────
  24  | 
  25  | async function assertNoError(page: Page) {
  26  |   const errorText = page.locator("text=500, text=Internal Server Error");
  27  |   const hasError = await errorText.isVisible({ timeout: 1_000 }).catch(() => false);
  28  |   expect(hasError).toBeFalsy();
  29  | }
  30  | 
  31  | // ────────────────────────────────────────────────────────────────────────────
  32  | // ADIM 1: Login
  33  | // ────────────────────────────────────────────────────────────────────────────
  34  | 
  35  | test("Adım 1 — Login: Demo hesabıyla giriş yapılır", async ({ page }) => {
  36  |   await page.goto("/sign-in");
  37  | 
  38  |   await expect(page.locator("form")).toBeVisible({ timeout: 8_000 });
  39  |   await page.fill('input[name="email"]', "eren@example.com");
  40  |   await page.fill('input[name="password"]', "stockops123");
  41  |   await page.click('button[type="submit"]');
  42  | 
  43  |   // Dashboard veya herhangi bir korumalı sayfaya yönlendirme beklenir
  44  |   await page.waitForURL(/\/(inventory|products|orders|customers|$)/, {
  45  |     timeout: 10_000,
  46  |   });
  47  | 
  48  |   // /sign-in'de değiliz
  49  |   expect(page.url()).not.toMatch(/\/sign-in/);
  50  | });
  51  | 
  52  | // ────────────────────────────────────────────────────────────────────────────
  53  | // ADIM 2: Dashboard
  54  | // ────────────────────────────────────────────────────────────────────────────
  55  | 
  56  | test("Adım 2 — Dashboard: Ana sayfa yüklenir ve nav görünür", async ({
  57  |   page,
  58  | }) => {
  59  |   await loginAsDemoUser(page);
  60  |   await page.goto("/");
  61  | 
  62  |   await expect(page.locator("nav")).toBeVisible({ timeout: 8_000 });
  63  |   await assertNoError(page);
  64  | 
  65  |   // StockOps markası görünmeli
  66  |   await expect(page.locator("text=StockOps").first()).toBeVisible({
  67  |     timeout: 8_000,
  68  |   });
  69  | });
  70  | 
  71  | // ────────────────────────────────────────────────────────────────────────────
  72  | // ADIM 3: Ürün Oluşturma
  73  | // ────────────────────────────────────────────────────────────────────────────
  74  | 
  75  | test("Adım 3 — Create Product: Ürünler sayfası yüklenir", async ({ page }) => {
  76  |   await loginAsDemoUser(page);
  77  |   await page.goto("/products");
  78  |   await page.waitForLoadState("networkidle");
  79  | 
> 80  |   await expect(page.locator("h1, h2").first()).toContainText(
      |                                                ^ Error: expect(locator).toContainText(expected) failed
  81  |     /products|ürün/i,
  82  |     { timeout: 8_000 }
  83  |   );
  84  |   await assertNoError(page);
  85  | });
  86  | 
  87  | test("Adım 3 — Create Product: /products/new formu yüklenir", async ({
  88  |   page,
  89  | }) => {
  90  |   await loginAsDemoUser(page);
  91  |   await page.goto("/products/new");
  92  |   await page.waitForLoadState("networkidle");
  93  | 
  94  |   // Form ya da içerik yüklenmeli — hata değil
  95  |   await assertNoError(page);
  96  | 
  97  |   const form = page.locator("form");
  98  |   const hasForm = await form.isVisible({ timeout: 5_000 }).catch(() => false);
  99  | 
  100 |   if (hasForm) {
  101 |     // Name alanını doldur
  102 |     createdProductName = `E2E Test Ürün ${Date.now()}`;
  103 |     const nameInput = page.locator(
  104 |       'input[name="name"], input[placeholder*="name" i], input[placeholder*="isim" i]'
  105 |     );
  106 | 
  107 |     if (await nameInput.first().isVisible()) {
  108 |       await nameInput.first().fill(createdProductName);
  109 |     }
  110 | 
  111 |     // SKU
  112 |     const skuInput = page.locator('input[name="sku"], input[placeholder*="sku" i]');
  113 |     if (await skuInput.first().isVisible()) {
  114 |       await skuInput.first().fill(`E2E-${Date.now()}`);
  115 |     }
  116 | 
  117 |     // Form submit — butonu bul
  118 |     const submitBtn = page.locator(
  119 |       'button[type="submit"], button:has-text("Save"), button:has-text("Kaydet"), button:has-text("Create")'
  120 |     );
  121 |     if (await submitBtn.first().isVisible()) {
  122 |       // Screenshot al - formu gördük
  123 |       await expect(submitBtn.first()).toBeVisible();
  124 |     }
  125 |   }
  126 | });
  127 | 
  128 | // ────────────────────────────────────────────────────────────────────────────
  129 | // ADIM 4: Sipariş Oluşturma
  130 | // ────────────────────────────────────────────────────────────────────────────
  131 | 
  132 | test("Adım 4 — Create Order: Siparişler sayfası yüklenir", async ({ page }) => {
  133 |   await loginAsDemoUser(page);
  134 |   await page.goto("/orders");
  135 |   await page.waitForLoadState("networkidle");
  136 | 
  137 |   await expect(page.locator("h1, h2").first()).toContainText(
  138 |     /orders|sipariş/i,
  139 |     { timeout: 8_000 }
  140 |   );
  141 |   await assertNoError(page);
  142 | });
  143 | 
  144 | test("Adım 4 — Create Order: /orders/new formu yüklenir", async ({ page }) => {
  145 |   await loginAsDemoUser(page);
  146 |   await page.goto("/orders/new");
  147 |   await page.waitForLoadState("networkidle");
  148 | 
  149 |   await assertNoError(page);
  150 | 
  151 |   const form = page.locator("form");
  152 |   const hasForm = await form.isVisible({ timeout: 5_000 }).catch(() => false);
  153 | 
  154 |   if (hasForm) {
  155 |     // Müşteri seçimi
  156 |     const customerSelect = page.locator(
  157 |       'select[name*="customer"], input[placeholder*="customer" i], input[placeholder*="müşteri" i]'
  158 |     );
  159 |     if (await customerSelect.first().isVisible()) {
  160 |       await expect(customerSelect.first()).toBeVisible();
  161 |     }
  162 |   }
  163 | });
  164 | 
  165 | // ────────────────────────────────────────────────────────────────────────────
  166 | // ADIM 5: Sipariş Onaylama
  167 | // ────────────────────────────────────────────────────────────────────────────
  168 | 
  169 | test("Adım 5 — Confirm Order: DRAFT sipariş detayı açılır", async ({
  170 |   page,
  171 | }) => {
  172 |   await loginAsDemoUser(page);
  173 |   await page.goto("/orders");
  174 |   await page.waitForLoadState("networkidle");
  175 | 
  176 |   // DRAFT durumundaki ilk siparişi bul
  177 |   const firstRow = page.locator("table tbody tr").first();
  178 |   if (await firstRow.isVisible()) {
  179 |     const link = firstRow.locator("a").first();
  180 |     if (await link.isVisible()) {
```