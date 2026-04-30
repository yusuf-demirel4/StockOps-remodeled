# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products.spec.ts >> Products (Ürün Yönetimi) >> ürünler sayfası doğru başlıkla yüklenir
- Location: e2e\products.spec.ts:23:7

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
> 24  |     await expect(page.locator("h1, h2").first()).toContainText(
      |                                                  ^ Error: expect(locator).toContainText(expected) failed
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
  76  |     await expect(nameInput.first()).toBeVisible({ timeout: 8_000 });
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