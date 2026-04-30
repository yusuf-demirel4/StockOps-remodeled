# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication >> sign-in sayfasında StockOps logosu/başlığı görünür
- Location: e2e\auth.spec.ts:26:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=StockOps, h1, p:has-text(\'StockOps\')').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=StockOps, h1, p:has-text(\'StockOps\')').first()

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - img [ref=e6]
        - generic [ref=e16]:
          - paragraph [ref=e17]: StockOps
          - heading "Giriş yap" [level=1] [ref=e18]
      - generic [ref=e19]:
        - generic [ref=e20]:
          - text: E-posta
          - textbox "E-posta" [ref=e21]: eren@example.com
        - generic [ref=e22]:
          - text: Şifre
          - textbox "Şifre" [ref=e23]: stockops123
        - button "Giriş yap" [ref=e24]
      - paragraph [ref=e25]: Demo hesap hazır gelir. Database modunda aynı kullanıcıyı seed komutu oluşturur.
  - button "Open Next.js Dev Tools" [ref=e31] [cursor=pointer]:
    - img [ref=e32]
  - alert [ref=e35]
```

# Test source

```ts
  1   | /**
  2   |  * E2E Test: Authentication (Kimlik Doğrulama)
  3   |  *
  4   |  * Kapsadığı senaryolar:
  5   |  *  - Login sayfası render
  6   |  *  - Hatalı kimlik bilgileriyle giriş reddi
  7   |  *  - Başarılı giriş → dashboard yönlendirme
  8   |  *  - Oturum açıkken /sign-in'e gitme → / yönlendirme
  9   |  *  - Oturum açık değilken korumalı sayfalara gitme → /sign-in yönlendirme
  10  |  */
  11  | 
  12  | import { test, expect } from "@playwright/test";
  13  | import { loginAsDemoUser, DEMO_CREDENTIALS } from "./helpers/auth";
  14  | 
  15  | test.describe("Authentication", () => {
  16  |   // ── 1. Login sayfası ────────────────────────────────────────────────────
  17  | 
  18  |   test("sign-in sayfası render olur", async ({ page }) => {
  19  |     await page.goto("/sign-in");
  20  |     await expect(page.locator("form")).toBeVisible();
  21  |     await expect(page.locator('input[name="email"]')).toBeVisible();
  22  |     await expect(page.locator('input[name="password"]')).toBeVisible();
  23  |     await expect(page.locator('button[type="submit"]')).toBeVisible();
  24  |   });
  25  | 
  26  |   test("sign-in sayfasında StockOps logosu/başlığı görünür", async ({
  27  |     page,
  28  |   }) => {
  29  |     await page.goto("/sign-in");
  30  |     // Logo metni veya başlık
  31  |     await expect(
  32  |       page.locator("text=StockOps, h1, p:has-text('StockOps')").first()
> 33  |     ).toBeVisible();
      |       ^ Error: expect(locator).toBeVisible() failed
  34  |   });
  35  | 
  36  |   // ── 2. Hatalı giriş ─────────────────────────────────────────────────────
  37  | 
  38  |   test("yanlış şifreyle giriş hata mesajı gösterir", async ({ page }) => {
  39  |     await page.goto("/sign-in");
  40  |     await page.fill('input[name="email"]', DEMO_CREDENTIALS.email);
  41  |     await page.fill('input[name="password"]', "yanlis_sifre_123");
  42  |     await page.click('button[type="submit"]');
  43  | 
  44  |     // Hata mesajı ya sayfada inline ya da ?error query param ile gelir
  45  |     await page.waitForTimeout(1000);
  46  |     const hasErrorText =
  47  |       (await page
  48  |         .locator(
  49  |           "text=hatalı, text=incorrect, text=geçersiz, text=invalid, [class*=error], [role=alert]"
  50  |         )
  51  |         .count()) > 0;
  52  |     const hasErrorParam = page.url().includes("error");
  53  | 
  54  |     expect(hasErrorText || hasErrorParam).toBeTruthy();
  55  |   });
  56  | 
  57  |   test("boş form submit edilirse sayfa /sign-in'de kalır", async ({ page }) => {
  58  |     await page.goto("/sign-in");
  59  |     // Email boş bırak - HTML5 validation devreye girer
  60  |     await page.click('button[type="submit"]');
  61  |     await expect(page).toHaveURL(/\/sign-in/);
  62  |   });
  63  | 
  64  |   // ── 3. Başarılı giriş ───────────────────────────────────────────────────
  65  | 
  66  |   test("geçerli demo kimlik bilgileriyle giriş başarılı olur", async ({
  67  |     page,
  68  |   }) => {
  69  |     await loginAsDemoUser(page);
  70  |     // Dashboard'da ya da uygulama içinde bir sayfada olmalı
  71  |     expect(page.url()).not.toMatch(/\/sign-in/);
  72  |   });
  73  | 
  74  |   test("giriş sonrası nav bar görünür", async ({ page }) => {
  75  |     await loginAsDemoUser(page);
  76  |     await expect(page.locator("nav")).toBeVisible();
  77  |   });
  78  | 
  79  |   // ── 4. Oturum yönetimi ──────────────────────────────────────────────────
  80  | 
  81  |   test("oturum açıkken /sign-in'e gidince / yönlendirilir", async ({
  82  |     page,
  83  |   }) => {
  84  |     await loginAsDemoUser(page);
  85  |     await page.goto("/sign-in");
  86  |     // / ya da başka korumalı sayfaya yönlendirilmeli
  87  |     await expect(page).not.toHaveURL(/\/sign-in/);
  88  |   });
  89  | 
  90  |   test.describe("Korumalı rotalar - oturumsuz erişim", () => {
  91  |     const protectedRoutes = [
  92  |       "/products",
  93  |       "/orders",
  94  |       "/inventory",
  95  |       "/customers",
  96  |       "/invoices",
  97  |       "/settings",
  98  |     ];
  99  | 
  100 |     for (const route of protectedRoutes) {
  101 |       test(`${route} sayfasına oturumsuz erişim /sign-in'e yönlendirir`, async ({
  102 |         page,
  103 |       }) => {
  104 |         await page.goto(route);
  105 |         await expect(page).toHaveURL(/\/sign-in/, { timeout: 8_000 });
  106 |       });
  107 |     }
  108 |   });
  109 | });
  110 | 
```