import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
const remote = process.env.TEST_APP_URL?.startsWith("https://");
test.describe("Published domain contract", () => {
  test.skip(!remote, "Requires the real deployed hostname.");
  test("root keeps exact Coming Soon HTML and does not advertise /test", async ({
    page,
    request,
  }) => {
    const response = await request.get("/");
    expect(response.status()).toBe(200);
    const bytes = await response.body();
    expect(
      createHash("sha1")
        .update(`blob ${bytes.length}\0`)
        .update(bytes)
        .digest("hex"),
    ).toBe("992a73d57e087f5c84c716225bd6f6a23b37c57a");
    await page.goto("/");
    await expect(page).toHaveTitle(
      "Elzatona — Coming Soon | Gamified Learning Platform",
    );
    await expect(page.locator('a[href^="/test"]')).toHaveCount(0);
  });
  test("unlisted platform loads real courses, noindex and correct asset/navigation paths", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const response = await page.goto("/test");
    expect(response?.status()).toBe(200);
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");
    await expect(page.locator("h1")).toHaveText("موادك، من غير دوشة.");
    await expect(
      page.getByRole("heading", { name: "هياكل البيانات", exact: true }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("meta[name=robots]")).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("heading", { name: "هياكل البيانات", exact: true })
      .click();
    await expect(page).toHaveURL(/\/test\/courses\/data-structures$/);
    await expect(page.locator("h1")).toHaveText("هياكل البيانات");
    expect(errors).toEqual([]);
  });
  test("bare platform routes are not exposed at the public root", async ({
    request,
  }) => {
    const response = await request.get("/courses", { maxRedirects: 0 });
    expect(response.status()).toBe(404);
  });
});
