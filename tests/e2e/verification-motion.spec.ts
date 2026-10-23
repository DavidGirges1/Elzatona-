import { test, expect } from "@playwright/test";
const base = process.env.TEST_APP_URL || "http://localhost:3000";
test("dedicated verification page handles a pending address without putting it in the URL", async ({
  page,
  context,
}, info) => {
  await context.addCookies([
    {
      name: "ez-pending-email",
      value: "student@example.org",
      url: base + "/",
      httpOnly: true,
      sameSite: "Lax",
      secure: base.startsWith("https:"),
    },
  ]);
  await page.goto("/verify-email");
  await expect(page.locator("h1")).toContainText("بصّة على بريدك");
  await expect(
    page.getByText("student@example.org", { exact: true }),
  ).toBeVisible();
  expect(page.url()).not.toContain("example.org");
  await expect(
    page.getByRole("link", { name: "أكدت بريدي · تسجيل الدخول" }),
  ).toHaveAttribute("href", "/login");
  await expect(page.locator(".verification-card .notice")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `docs/screenshots/verification-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
});
test("verification page is useful without a pending cookie", async ({
  page,
}) => {
  await page.goto("/verify-email");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator(".verification-address")).toHaveCount(0);
  await page
    .getByRole("link", { name: "كتبت البريد غلط؟ ارجع للتسجيل" })
    .click();
  await expect(page).toHaveURL(/\/signup$/);
});
test("landing background pauses and sections reveal on scroll", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const shape = page.locator(".landing-atmosphere span").first();
  await expect(shape).toHaveCSS("animation-play-state", "running");
  await page.getByRole("button", { name: "إيقاف حركة الخلفية" }).click();
  await expect(shape).toHaveCSS("animation-play-state", "paused");
  await page.getByRole("button", { name: "تشغيل حركة الخلفية" }).click();
  await expect(shape).toHaveCSS("animation-play-state", "running");
  for (const section of await page.locator("[data-reveal]").all()) {
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveCSS("opacity", "1");
  }
  await expect(page.locator(".how-step").nth(2)).toHaveCSS(
    "transition-delay",
    "0.2s",
  );
  await page.evaluate(() => scrollTo(0, 0));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `docs/screenshots/landing-motion-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
});
test("reduced motion stops decoration and keeps every section visible", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".landing-atmosphere span").first()).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(
    page.getByRole("button", { name: "إيقاف حركة الخلفية" }),
  ).not.toBeVisible();
  for (const section of await page.locator("[data-reveal]").all())
    await expect(section).toHaveCSS("opacity", "1");
});

test("keyboard focus reveals sections immediately", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  for (let i = 0; i < 24; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() => {
        const active = document.activeElement;
        return Array.from(document.querySelectorAll("[data-reveal]"))
          .filter((node) => active && node.contains(active))
          .every((node) => getComputedStyle(node).opacity === "1");
      }),
    ).toBe(true);
  }
});

test("landing content remains visible without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto(base + "/");
    expect(
      await page
        .locator("[data-reveal]")
        .evaluateAll((nodes) =>
          nodes.every((node) => getComputedStyle(node).opacity === "1"),
        ),
    ).toBe(true);
  } finally {
    await context.close();
  }
});
