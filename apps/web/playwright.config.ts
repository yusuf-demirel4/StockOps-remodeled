import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // Auth state paylaşımı için sequential daha güvenli
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI
    ? [["github"], ["html", { outputFolder: "playwright-report" }]]
    : [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    // Demo modunda cookie bazlı auth kullanılıyor
    // Her test kendi cookie'sini yönetir (storageState kullanmıyoruz)
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Local geliştirmede dev server'ı otomatik başlat
  // CI'da uygulama ayrıca build + start edilir
  webServer:
    process.env.CI
      ? {
          // CI'da build edilmiş uygulamayı başlat (demo mode)
          command: "npm run start",
          url: "http://localhost:3000",
          timeout: 60_000,
          env: {
            APP_DATA_SOURCE: "demo",
            PORT: "3000",
          },
        }
      : {
          command: "npm run dev",
          url: "http://localhost:3000",
          reuseExistingServer: true,
          timeout: 30_000,
        },
});
