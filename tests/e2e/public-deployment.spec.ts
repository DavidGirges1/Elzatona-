import { test, expect } from "@playwright/test";
const remote = process.env.TEST_APP_URL?.startsWith("https://");
test.describe("Published official domain contract", () => {
  test.skip(!remote, "Requires the real deployed hostname.");
  test("root presents the Arabic platform", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveText(
      /كل ماتريالزك\s*في مكان واحد\./,
    );
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator('a[href^="/test"]')).toHaveCount(0);
  });
  test("legacy landing redirects to the official root", async ({ request }) => {
    const response = await request.get("/test", { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(
      new URL(response.headers().location, "https://elzatona.tech").pathname,
    ).toBe("/");
  });
  test("course discovery is exposed at the public root", async ({ page }) => {
    const response = await page.goto("/courses");
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveText("اكتشف المواد");
    await expect(page.locator("a.course-tile").first()).toBeVisible();
  });
});
