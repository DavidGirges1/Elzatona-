import { test, expect } from "@playwright/test";

test("official landing and assets use the root without a noindex blanket", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  expect(response?.headers()["x-robots-tag"]).toBeUndefined();
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  await expect(page.locator("a.wordmark").first()).toHaveAttribute("href", "/");
  expect(
    await page
      .locator('a[href^="/test"],script[src^="/test"],link[href^="/test"]')
      .count(),
  ).toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  for (const section of await page.locator("[data-reveal]").all()) {
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveCSS("opacity", "1");
  }
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: `docs/screenshots/official-landing-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
  expect(errors).toEqual([]);
});

test("legacy links preserve paths and callback query parameters", async ({
  request,
}) => {
  for (const [from, to] of [
    ["/test", "/"],
    ["/test/courses?q=algebra", "/courses?q=algebra"],
    [
      "/test/auth/confirm?token_hash=invalid-test-token&type=email",
      "/auth/confirm?token_hash=invalid-test-token&type=email",
    ],
    [
      "/test/auth/callback?code=invalid-test-code&next=%2Fonboarding",
      "/auth/callback?code=invalid-test-code&next=%2Fonboarding",
    ],
  ]) {
    const response = await request.get(from, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    const location = new URL(
      response.headers().location,
      "https://elzatona.tech",
    );
    expect(location.pathname + location.search).toBe(to);
  }
});

test("hosted course discovery, native search and course navigation work at root", async ({
  page,
}) => {
  await page.goto("/courses");
  await expect(page.locator("h1")).toHaveText("اكتشف المواد");
  const course = page.locator("a.course-tile").first();
  await expect(course).toBeVisible();
  const href = await course.getAttribute("href");
  expect(href).toMatch(/^\/courses\/[^/]+$/);
  await course.click();
  await expect(page.locator(".course-hero h1")).toBeVisible();
  await expect(page.getByRole("link", { name: "كل المواد" })).toHaveAttribute(
    "href",
    "/courses",
  );
  await page.goto("/courses");
  await page
    .getByRole("textbox", { name: "بتدوّر على ملخص، امتحان، أو شرح؟" })
    .fill("هياكل");
  await page.getByRole("button", { name: "بحث", exact: true }).click();
  await expect(page).toHaveURL(/\/courses\?q=/);
});

test("auth and admin gates retain root routes and reject unsafe callbacks", async ({
  page,
  request,
}) => {
  await page.goto("/saved");
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  const login = await request.get("/login");
  expect(login.headers()["x-robots-tag"]).toContain("noindex");
  for (const path of [
    "/auth/callback?next=https%3A%2F%2Fevil.example",
    "/auth/confirm?token_hash=invalid&type=email",
  ]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(new URL(response.headers().location).pathname).toBe("/login");
  }
  const denied = await request.get(
    "/api/admin/resources/00000000-0000-4000-8000-000000000000/open",
  );
  expect(denied.status()).toBe(401);
});

test("public crawler configuration allows the platform and excludes account routes", async ({
  request,
}) => {
  const response = await request.get("/robots.txt");
  expect(response.status()).toBe(200);
  const text = await response.text();
  expect(text).toContain("Allow: /");
  expect(text).toContain("Disallow: /admin");
  expect(text).not.toContain("Disallow: /test");
});
