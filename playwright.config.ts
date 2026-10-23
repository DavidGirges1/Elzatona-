import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.TEST_APP_URL || "http://localhost:3000",
    locale: "ar-EG",
    proxy:
      process.env.TEST_APP_URL?.startsWith("https://") &&
      process.env.HTTPS_PROXY
        ? { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" }
        : undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      proxy:
        process.env.TEST_APP_URL?.startsWith("https://") &&
        process.env.HTTPS_PROXY
          ? { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" }
          : undefined,
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
        (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    },
  },
  projects: [
    { name: "mobile-390", use: { viewport: { width: 390, height: 844 } } },
    { name: "tablet-768", use: { viewport: { width: 768, height: 1024 } } },
    { name: "desktop-1440", use: { viewport: { width: 1440, height: 1000 } } },
  ],
});
