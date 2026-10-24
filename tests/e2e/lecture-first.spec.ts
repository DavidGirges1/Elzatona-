import { test, expect, type BrowserContext } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { quizPdf } from "../support/quiz-pdf.mjs";
const enabled =
  !!process.env.LECTURE_QA_STATE && !!process.env.LECTURE_QA_ACCOUNTS;
const state = enabled
  ? JSON.parse(readFileSync(process.env.LECTURE_QA_STATE!, "utf8"))
  : {};
const accounts = enabled
  ? JSON.parse(readFileSync(process.env.LECTURE_QA_ACCOUNTS!, "utf8"))
  : [];
const path = () => `/courses/${state.course.slug}`;
async function login(context: BrowserContext, role: string) {
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
  const a = accounts.find((a: { email: string }) =>
    a.email.includes(`-${role}@`),
  );
  expect((await db.auth.signInWithPassword(a)).error).toBeNull();
  await context.addCookies(
    cookies.map((c) => ({
      ...c,
      url: process.env.TEST_APP_URL || "http://localhost:3002",
      sameSite: "Lax" as const,
    })),
  );
  return db;
}
test.use({ trace: "off" });
test.setTimeout(120000);
test.beforeEach(({ page }) => {
  page.setDefaultTimeout(15000);
  test.skip(!enabled, "Requires isolated real-Supabase lecture QA fixtures.");
});
test("guest reaches auto-opened PDF in two taps; separate areas and forum stay easy to browse", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(path());
  await expect(
    page.getByRole("heading", { name: "المحاضرات", exact: true }),
  ).toBeVisible();
  await expect(page.locator("select")).toHaveCount(0);
  const first = page.locator(".lecture-row").first();
  await expect(first).toBeVisible();
  expect((await first.boundingBox())!.y).toBeLessThan(
    info.project.use.viewport!.height,
  );
  await page.screenshot({
    path: `docs/screenshots/lecture-course-${info.project.name}.png`,
    fullPage: true,
  });
  await first.click();
  await expect(page.getByText("ابدأ هنا", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "الشيتات والتدريب", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("QA · Separate lab reference", { exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: `docs/screenshots/lecture-study-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .locator(".resource-row")
    .filter({ hasText: "QA · Database lecture PDF" })
    .click();
  await expect(page.locator("canvas")).toBeVisible({ timeout: 20000 });
  expect(await page.locator("canvas").count()).toBe(1);
  await page.screenshot({
    path: `docs/screenshots/lecture-reader-${info.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto(`${path()}/general`);
  await expect(
    page.getByText("QA · Whole course reference", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("QA · Practice exam", { exact: true }),
  ).toHaveCount(0);
  await page.goto(`${path()}/revision`);
  await expect(
    page.getByText("QA · Practice exam", { exact: true }),
  ).toBeVisible();
  await page.goto(path());
  await page.getByText("المزيد", { exact: true }).click();
  await page
    .getByRole("link", { name: "السكاشن واللابات", exact: true })
    .click();
  await expect(
    page.getByText("QA · Separate lab reference", { exact: true }),
  ).toBeVisible();
  await page.goto(`${path()}?tab=discussions`);
  await expect(
    page.getByText("QA · General course question", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("QA · Understanding SQL joins", { exact: true }),
  ).toBeVisible();
  await page.goto(`${path()}?topic=old-topic&type=notes&sort=helpful`);
  await expect(
    page.getByRole("heading", { name: "المحاضرات", exact: true }),
  ).toBeVisible();
  await page.getByText("دور داخل المادة", { exact: true }).click();
  await page.getByPlaceholder("عنوان ملف، شرح، أو اسم محاضرة…").fill("SQL");
  await page
    .locator(".search-form")
    .evaluate((form: HTMLFormElement) => form.requestSubmit());
  await expect(
    page.getByRole("heading", { name: "نتائج البحث" }),
  ).toBeVisible();
  await expect(
    page.getByText("QA · SQL study reference", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("ordinary browser PDF submission retains placement; leader reviews and guest reads", async ({
  page,
  context,
  browser,
}, info) => {
  const author = await login(context, "author");
  const title = `QA · Browser PDF ${info.project.name} ${randomUUID().slice(0, 6)}`;
  await page.goto(`${path()}/submit?lecture=${state.lectures[0]}`);
  await expect(page.locator("select[name=area]")).toHaveValue("lecture");
  await expect(page.locator("select[name=lectures]")).toHaveValue(
    state.lectures[0],
  );
  await page.getByRole("button", { name: "مذاكرة", exact: true }).click();
  await page
    .getByRole("combobox", { name: "نوع المصدر", exact: true })
    .selectOption("slides");
  await page.getByRole("button", { name: "ملف PDF", exact: true }).click();
  await page.getByLabel("عنوان المصدر", { exact: true }).fill(title);
  await page.locator("input[type=file]").setInputFiles({
    name: "lecture.pdf",
    mimeType: "application/pdf",
    buffer: quizPdf(),
  });
  await page.getByLabel("عندي حق مشاركة المصدر، ومفيهوش بيانات خاصة.").check();
  await page.screenshot({
    path: `docs/screenshots/lecture-submit-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "ابعت للمراجعة", exact: true })
    .click();
  await expect(page).toHaveURL(/my-contributions\?submitted=/, {
    timeout: 30000,
  });
  const id = new URL(page.url()).searchParams.get("submitted")!;
  const resource = await author
    .from("resources")
    .select("area,status,submission_version")
    .eq("id", id)
    .single();
  expect(resource.error).toBeNull();
  expect(resource.data).toMatchObject({ area: "lecture", status: "pending" });
  const reviewerContext = await browser.newContext({
    viewport: page.viewportSize()!,
  });
  const leader = await login(reviewerContext, "leader");
  const review = await reviewerContext.newPage();
  await review.goto(`/review/${id}`);
  await expect(
    review.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await review.locator("select[name=lectures]").selectOption(state.lectures[1]);
  await review
    .getByRole("combobox", { name: "القرار", exact: true })
    .selectOption("approved");
  await review
    .getByLabel("سبب القرار أو ملاحظات لصاحب الإضافة")
    .fill("QA · Reviewed real browser upload and corrected placement");
  await review.getByLabel("فتحت المصدر وراجعت النسخة دي وبأكد القرار").check();
  await review.getByRole("button", { name: "احفظ قرار المراجعة" }).click();
  await expect(review).toHaveURL(/review\?decision=approved/, {
    timeout: 30000,
  });
  await reviewerContext.close();
  await leader.auth.signOut();
  const guestContext = await browser.newContext({
    viewport: page.viewportSize()!,
  });
  const guest = await guestContext.newPage();
  await guest.goto(`${path()}/resources/${id}`);
  await expect(guest.locator("canvas")).toBeVisible({ timeout: 20000 });
  expect(
    await guest.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await guestContext.close();
  await author.auth.signOut();
});
test("organizer edits map without changing URLs and ordinary signup never offers role selection", async ({
  page,
  context,
}, info) => {
  const db = await login(context, "leader");
  await page.goto(`${path()}/organize`);
  await expect(
    page.getByRole("heading", { name: "تنظيم المحاضرات", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/lecture-organize-${info.project.name}.png`,
    fullPage: true,
  });
  await page.goto(`${path()}/lectures/${state.lectures[1]}`);
  await expect(page.getByRole("heading", { name: /SQL Joins/ })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await db.auth.signOut();
  await context.clearCookies();
  await page.goto("/signup");
  await expect(page.locator("select[name=role]")).toHaveCount(0);
});
test("placement changes preserve an unsaved quiz across revision and multiple lectures", async ({
  page,
  context,
}, info) => {
  test.skip(
    info.project.name !== "mobile-390",
    "One targeted state-preservation journey; responsive study paths are covered separately.",
  );
  const db = await login(context, "author");
  await page.goto(`${path()}/submit?area=revision`);
  await page.getByRole("button", { name: "حل", exact: true }).click();
  await page
    .getByRole("combobox", { name: "نوع المصدر", exact: true })
    .selectOption("question_bank");
  await page
    .getByRole("button", { name: "مجموعة تفاعلية", exact: true })
    .click();
  const title = page.getByLabel("اسم المجموعة", { exact: true });
  await title.fill("QA · Unsaved English quiz title");
  await page.locator("select[name=area]").selectOption("lecture");
  await expect(title).toHaveValue("QA · Unsaved English quiz title");
  await expect(
    page.getByText("اختار محاضرة عشان تحفظ المصدر.", { exact: true }),
  ).toBeVisible();
  await page.locator("select[name=lectures]").selectOption(state.lectures[0]);
  await expect(title).toHaveValue("QA · Unsaved English quiz title");
  await page
    .getByText("نفس المصدر مفيد لمحاضرات تانية؟", { exact: true })
    .click();
  await page
    .locator(
      `input[type=checkbox][name=lectures][value="${state.lectures[1]}"]`,
    )
    .check();
  await expect(title).toHaveValue("QA · Unsaved English quiz title");
  await page.locator("select[name=area]").selectOption("revision");
  await expect(title).toHaveValue("QA · Unsaved English quiz title");
  await db.auth.signOut();
});
