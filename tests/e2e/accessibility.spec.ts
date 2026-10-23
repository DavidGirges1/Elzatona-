import { test, expect } from "@playwright/test";
test("360px public screens, reduced motion and keyboard product preview", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "mobile-390",
    "Runs the narrower viewport once.",
  );
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const path of [
    "/test",
    "/test/login",
    "/test/signup",
    "/test/courses",
  ]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator('a[href*="/admin"]')).toHaveCount(0);
  }
  await page.goto("/test");
  const tab = page.getByRole("tab", { name: "ملخصات" });
  await tab.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("tab", { name: "فيديوهات" })).toBeFocused();
  await expect(page.getByRole("tabpanel")).toContainText("الشرح اللي يوصّل");
  await page.screenshot({
    path: "docs/screenshots/academic-landing-mobile-360.png",
    fullPage: true,
    animations: "disabled",
  });
});
