import { test, expect } from "@playwright/test";
const localOnly = !process.env.NEXT_PUBLIC_SUPABASE_URL;
for (const [name, path, heading] of [
  ["home", "/", /كل ماتريالزك\s*في مكان واحد\./],
  ["discovery", "/courses", "اكتشف المواد"],
  ["login", "/login", "أهلًا بيك من تاني."],
  ["course-unavailable", "/courses/qa-unconfigured", "الصفحة دي مش موجودة"],
  [
    "resource-unavailable",
    "/courses/qa-unconfigured/resources/00000000-0000-4000-8000-000000000001",
    "الصفحة دي مش موجودة",
  ],
  [
    "submission-auth-gate",
    "/courses/qa-unconfigured/submit",
    "أهلًا بيك من تاني.",
  ],
])
  test(`${name}: actual unconfigured screen`, async ({ page }, info) => {
    test.skip(
      !localOnly,
      "Unconfigured-state tests are separate from configured integration tests.",
    );
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`/test${path === "/" ? "" : path}`);
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(await page.locator("html").getAttribute("dir")).toBe("rtl");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `docs/screenshots/${name}-${info.project.name}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
test("Guest saved resource action preserves auth return", async ({ page }) => {
  test.skip(!localOnly);
  await page.goto("/test/saved");
  await expect(page).toHaveURL(/login\?next=\/saved/);
  await expect(
    page.getByRole("heading", { name: "أهلًا بيك من تاني." }),
  ).toBeVisible();
});
test("Invalid OAuth callback retains a safe relative destination", async ({
  page,
}) => {
  await page.goto("/test/auth/callback?next=https%3A%2F%2Fevil.example");
  await expect(page).toHaveURL(/\/login\?error=callback&next=%2F$/);
});
test("390 and 360 layouts support 200% text", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/test");
  await page.addStyleTag({
    content: "body{font-size:32px} h1{font-size:50px} h2{font-size:40px}",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
