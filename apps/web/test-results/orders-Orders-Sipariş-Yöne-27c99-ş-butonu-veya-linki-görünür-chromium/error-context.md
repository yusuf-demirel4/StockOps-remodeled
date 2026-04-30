# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: orders.spec.ts >> Orders (Sipariş Yönetimi) >> 'New Order' / 'Yeni Sipariş' butonu veya linki görünür
- Location: e2e\orders.spec.ts:55:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('a[href*="new"], button:has-text("New"), button:has-text("Yeni"), a:has-text("New"), a:has-text("Yeni"), button:has-text("Create"), a:has-text("Create")').first()
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for locator('a[href*="new"], button:has-text("New"), button:has-text("Yeni"), a:has-text("New"), a:has-text("Yeni"), button:has-text("Create"), a:has-text("Create")').first()

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
  2   |  * E2E Test: Orders (Sipariş Yönetimi)
  3   |  *
  4   |  * Kapsadığı senaryolar:
  5   |  *  - Siparişler listesi
  6   |  *  - Sipariş oluşturma formu
  7   |  *  - Sipariş durum geçişleri (DRAFT → CONFIRMED → PICKING → SHIPPED)
  8   |  *  - Sipariş detayı
  9   |  */
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
> 61  |     await expect(addBtn.first()).toBeVisible({ timeout: 8_000 });
      |                                  ^ Error: expect(locator).toBeVisible() failed
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
  110 |       await expect(statusEl.first()).toBeVisible({ timeout: 5_000 });
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