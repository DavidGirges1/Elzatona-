import { test, expect, type BrowserContext } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { quizPdf } from "../support/quiz-pdf.mjs";
const enabled =
  !!process.env.CATEGORY_QA_ACCOUNT && !!process.env.CATEGORY_QA_STATE;
const account = enabled
  ? JSON.parse(readFileSync(process.env.CATEGORY_QA_ACCOUNT!, "utf8"))
  : {};
const statePath = process.env.CATEGORY_QA_STATE || "";
const changes = JSON.parse(
  readFileSync(
    "docs/imports/2026-10-24-materials/category-updates.json",
    "utf8",
  ),
).changes as { id: string; to: string; title: string; course_id: string }[];
async function login(context: BrowserContext) {
  const cookies: { name: string; value: string }[] = [];
  const db = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: (v) => {
          cookies.push(...v);
        },
      },
    },
  );
  expect(
    (
      await db.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      })
    ).error,
  ).toBeNull();
  await context.addCookies(
    cookies.map((c) => ({
      ...c,
      url: process.env.TEST_APP_URL || "http://localhost:3001",
      sameSite: "Lax" as const,
    })),
  );
  return db;
}
test.use({ trace: "off" });
test.setTimeout(120000);
test.beforeEach(({ page }) => {
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(30000);
});
test("ordinary students submit section and sheet PDFs for review without gaining publication rights", async ({
  page,
  context,
  browser,
}, info) => {
  test.skip(
    !enabled,
    "Requires an isolated ordinary QA account and output ledger.",
  );
  const db = await login(context);
  const guestContext = await browser.newContext({
    viewport: page.viewportSize()!,
  });
  const guest = await guestContext.newPage();
  try {
    for (const type of ["sections", "sheets"] as const) {
      await page.goto(
        `/courses/capital-ai-310/submit?purpose=${type === "sections" ? "study" : "solve"}`,
      );
      await page
        .getByRole("button", {
          name: type === "sections" ? "سكاشن" : "شيتات",
          exact: true,
        })
        .click();
      if (type === "sheets")
        await expect(
          page.getByRole("button", { name: /مجموعة تفاعلية/ }),
        ).toHaveCount(0);
      await page
        .getByRole("button", {
          name: type === "sections" ? /^ملف PDF$/ : /^شيت PDF/,
          exact: true,
        })
        .click();
      await expect(page.locator("input[name=type]")).toHaveValue(type);
      const phase = process.env.TEST_APP_URL?.startsWith("https:")
        ? "live"
        : "local";
      const title = `QA categories ${phase} ${info.project.name} ${type} ${randomUUID().slice(0, 8)}`;
      await page.getByLabel("عنوان المصدر", { exact: true }).fill(title);
      await page.locator("input[name=file]").setInputFiles({
        name: type + ".pdf",
        mimeType: "application/pdf",
        buffer: quizPdf(),
      });
      await page.locator("input[name=rights_confirmed]").check();
      await page
        .getByRole("button", { name: "ابعت للمراجعة", exact: true })
        .click();
      await expect(page).toHaveURL(/\/my-contributions\?submitted=/, {
        timeout: 30000,
      });
      const id = new URL(page.url()).searchParams.get("submitted")!;
      const state = existsSync(statePath)
        ? JSON.parse(readFileSync(statePath, "utf8"))
        : { resources: [] };
      state.resources.push({
        id,
        type,
        title,
        phase,
        project: info.project.name,
      });
      writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
      const r = await db
        .from("resources")
        .select("type,status,review_state,file_verified_at")
        .eq("id", id)
        .single();
      expect(r.error).toBeNull();
      expect(r.data).toMatchObject({
        type,
        status: "pending",
        review_state: "submitted",
      });
      expect(r.data?.file_verified_at).toBeTruthy();
      await guest.goto(`/courses/capital-ai-310/resources/${id}`);
      await expect(
        guest.getByRole("heading", { name: "الصفحة دي مش موجودة" }),
      ).toBeVisible();
      expect(
        (
          await guest.request.get(`/api/resources/${id}/open`, {
            maxRedirects: 0,
          })
        ).status(),
      ).toBe(404);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  } finally {
    await guestContext.close();
  }
});
test("guests find the newly organized sections and professor sheets and read their PDFs", async ({
  page,
}, info) => {
  test.skip(
    process.env.CATEGORY_READ_VERIFIED !== "1",
    "Run after the checked classification operation.",
  );
  for (const type of ["sections", "sheets"]) {
    const label = type === "sections" ? "سكاشن" : "شيتات";
    const f = changes.find(
      (c) =>
        c.to === type && c.course_id === "90058900-bf71-4866-8bac-a6b7d9cf7b97",
    )!;
    await page.goto(
      `/courses/capital-ai-310?purpose=${type === "sections" ? "study" : "solve"}&type=${type}`,
    );
    await expect(page.locator("select[name=type]")).toHaveValue(type);
    await expect(page.locator("select[name=type] option:checked")).toHaveText(
      label,
    );
    const row = page.locator(
      `a.resource-row[href="/courses/capital-ai-310/resources/${f.id}"]`,
    );
    await expect(row).toContainText(label);
    await expect(row).toContainText(f.title);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `docs/screenshots/material-${type}-${info.project.name}.png`,
    });
    await row.click();
    await expect(page.locator("main article .type-chip")).toContainText(label);
    await page
      .getByRole("button", { name: "اعرض الـ PDF هنا", exact: true })
      .click();
    await expect(page.locator(".pdf-viewport")).toHaveAttribute(
      "aria-busy",
      "false",
      { timeout: 30000 },
    );
    await expect(page.locator("canvas")).toBeVisible();
  }
});
