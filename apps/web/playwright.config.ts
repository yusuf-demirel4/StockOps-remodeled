import { defineConfig, devices } from "@playwright/test";

const port = process.env.PORT ?? "3000";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;

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
    baseURL,
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
          url: baseURL,
          timeout: 60_000,
          env: {
            APP_DATA_SOURCE: "demo",
            PORT: port,
          },
        }
      : {
          command: "npm run build && npm run start",
          url: baseURL,
          reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
          timeout: 180_000,
          env: {
            APP_DATA_SOURCE: "demo",
            NEXT_TELEMETRY_DISABLED: "1",
            PORT: port,
          },
        },
});
