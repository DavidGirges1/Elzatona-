import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const enabled = !!process.env.MATERIAL_IMPORT_PLAN;
type File = {
  id: string;
  course_slug: string;
  topic_id: string | null;
  title: string;
  type: string;
  purpose: string;
};
const plan: { files: File[] } = enabled
  ? JSON.parse(readFileSync(process.env.MATERIAL_IMPORT_PLAN!, "utf8"))
  : { files: [] };
async function bounds(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
test.beforeEach(() =>
  test.skip(
    !enabled,
    "Requires the explicit read-only, already-imported material manifest.",
  ),
);
test.setTimeout(180000);
test("guests find imported topics and read the original PDF in each of the six courses", async ({
  page,
}, info) => {
  const failures: string[] = [];
  page.on("pageerror", (e) => failures.push(e.message));
  const samples = [...new Set(plan.files.map((f) => f.course_slug))].map(
    (slug) => plan.files.find((f) => f.course_slug === slug && f.topic_id)!,
  );
  for (const [i, f] of samples.entries()) {
    await page.goto(
      `/courses/${f.course_slug}?topic=${f.topic_id}&type=${f.type}`,
    );
    await expect(page.locator("select[name=topic]")).toHaveValue(f.topic_id!);
    await expect(page.locator("select[name=type]")).toHaveValue(f.type);
    const row = page.locator(
      `a.resource-row[href="/courses/${f.course_slug}/resources/${f.id}"]`,
    );
    await expect(row).toContainText(f.title);
    await bounds(page);
    if (i === 0)
      await page.screenshot({
        path: `docs/screenshots/material-import-course-${info.project.name}.png`,
      });
    await row.click();
    await expect(
      page.getByRole("heading", { name: f.title, exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "اعرض الـ PDF هنا", exact: true })
      .click();
    await expect(page.locator(".pdf-viewport")).toHaveAttribute(
      "aria-busy",
      "false",
      { timeout: 30000 },
    );
    await expect(page.locator("canvas")).toBeVisible();
    await bounds(page);
    if (i === 0)
      await page.screenshot({
        path: `docs/screenshots/material-import-reader-${info.project.name}.png`,
      });
  }
  expect(failures).toEqual([]);
});
test("the larger AI course paginates without duplicates and preserves study/solve and search filters", async ({
  page,
}) => {
  const path = "/courses/capital-ai-310";
  await page.goto(path);
  await expect(page.locator("a.resource-row")).toHaveCount(20);
  const first = await page
    .locator("a.resource-row")
    .evaluateAll((es) => es.map((e) => e.getAttribute("href")));
  await page
    .getByRole("navigation", { name: "صفحات المصادر" })
    .getByRole("link", { name: "التالي", exact: true })
    .click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator("a.resource-row")).toHaveCount(8);
  const second = await page
    .locator("a.resource-row")
    .evaluateAll((es) => es.map((e) => e.getAttribute("href")));
  expect(new Set([...first, ...second]).size).toBe(28);
  for (const purpose of ["study", "solve"]) {
    await page.goto(path + "?purpose=" + purpose);
    const expected =
      plan.files.filter(
        (f) => f.course_slug === "capital-ai-310" && f.purpose === purpose,
      ).length + (purpose === "study" ? 1 : 0);
    await expect(page.locator("a.resource-row")).toHaveCount(
      Math.min(20, expected),
    );
    await bounds(page);
  }
  await page.goto(path);
  await page.locator(".search-form input[name=q]").fill("State Space Search");
  await page.getByRole("button", { name: "اعرض النتائج", exact: true }).click();
  await expect(page).toHaveURL(/q=State/);
  await expect(page.locator("a.resource-row")).toHaveCount(2);
  await bounds(page);
});
