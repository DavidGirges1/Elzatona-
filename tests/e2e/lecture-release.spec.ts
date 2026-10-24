import { test, expect } from "@playwright/test";
test.use({ trace: "off" });
test("clean lecture release has useful empty areas and removed links; no obsolete filters", async ({
  page,
}, info) => {
  test.skip(
    process.env.LECTURE_RELEASE_SMOKE !== "1",
    "Run after clearing the explicit release inventory and QA fixtures.",
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const path = "/courses/capital-cs-316";
  await page.goto(path);
  await expect(
    page.getByRole("heading", { name: "المحاضرات", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("المحاضرات لسه بتتجهّز", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".lecture-row")).toHaveCount(0);
  await expect(page.locator("select")).toHaveCount(0);
  expect(await page.locator("html").getAttribute("dir")).toBe("rtl");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `docs/screenshots/lecture-empty-${info.project.name}.png`,
    fullPage: true,
  });
  for (const area of ["general", "revision", "sections"]) {
    const response = await page.goto(`${path}/${area}`);
    expect(response?.status()).toBe(200);
    await expect(
      page.getByText("لسه مفيش مصادر هنا", { exact: true }),
    ).toBeVisible();
  }
  await page.goto(`${path}/resources/1658d733-d12b-4654-be29-96a5f4dae3c9`);
  await expect(
    page.getByRole("heading", { name: "الصفحة دي مش موجودة" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "اكتشف المواد", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
