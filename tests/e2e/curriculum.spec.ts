import { test, expect, type BrowserContext } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { minimalPdf } from "../support/live.mjs";
const enabled =
  !!process.env.TEST_AUTH_ACCOUNTS_FILE &&
  !!process.env.TEST_CURRICULUM_STATE_FILE;
const people = enabled
  ? JSON.parse(readFileSync(process.env.TEST_AUTH_ACCOUNTS_FILE!, "utf8"))
  : [];
const state = enabled
  ? JSON.parse(readFileSync(process.env.TEST_CURRICULUM_STATE_FILE!, "utf8"))
  : {};
async function session(context: BrowserContext, index = 1) {
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
  const p = people[index];
  expect(
    (await db.auth.signInWithPassword({ email: p.email, password: p.password }))
      .error,
  ).toBeNull();
  await context.addCookies(
    cookies.map((c) => ({
      ...c,
      url: process.env.TEST_APP_URL || "http://localhost:3000",
      sameSite: "Lax" as const,
    })),
  );
  return db;
}
test.use({ trace: "off" });
test.setTimeout(60000);
test.describe("Capital curriculum with real Supabase", () => {
  test.skip(
    !enabled,
    "Requires explicit temporary QA accounts and curriculum state.",
  );
  test("guest opens an imported hub, its source details and the public shared resource", async ({
    page,
    request,
  }, info) => {
    await page.goto("/courses/" + state.first.slug);
    await expect(
      page.getByRole("heading", { name: "مقدمة في الحاسبات", exact: true }),
    ).toBeVisible();
    await page.getByText("المادة في اللائحة", { exact: true }).click();
    await expect(page.locator(".curriculum-details")).toContainText(
      "متطلب كلية · إجباري",
    );
    await expect(page.locator(".curriculum-details")).toContainText("١٥");
    await page.screenshot({
      path: `docs/screenshots/curriculum-course-${info.project.name}.png`,
      fullPage: true,
    });
    const response = await page.goto(
      `/courses/${state.first.slug}/resources/${state.resource}`,
    );
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("link", { name: "افتح المصدر", exact: true }),
    ).toBeVisible();
    const open = await request.get(`/api/resources/${state.resource}/open`, {
      maxRedirects: 0,
    });
    expect(open.status()).toBe(302);
    expect(open.headers().location).toContain(
      "https://example.org/curriculum-qa/",
    );
  });
  test("third-year suggestions lead discovery while all 122 courses remain discoverable", async ({
    page,
    context,
  }, info) => {
    await session(context, 0);
    await page.goto("/courses");
    await expect(page.locator(".course-choice")).toHaveCount(20);
    for (const row of await page.locator(".course-choice").all())
      await expect(row).toContainText("المستوى ٣");
    await expect(page.locator(".section-head")).toContainText("١٢٢ مادة");
    await expect(page.locator(".course-selection-footer")).toBeInViewport({
      ratio: 1,
    });
    await page.evaluate(() => document.fonts.ready);
    expect(await page.locator("html").getAttribute("dir")).toBe("rtl");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `docs/screenshots/curriculum-discovery-${info.project.name}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page
      .getByRole("link", { name: "الصفحة التالية", exact: true })
      .click();
    await expect(page.locator(".catalog-pagination")).toContainText(
      "صفحة ٢ من ٧",
    );
    await expect(page.locator(".course-choice")).toHaveCount(20);
    for (const row of await page.locator(".course-choice").all())
      await expect(row).toContainText("المستوى ٣");
    await page
      .getByRole("link", { name: "الصفحة التالية", exact: true })
      .click();
    await expect(page.locator(".catalog-pagination")).toContainText(
      "صفحة ٣ من ٧",
    );
    await expect(page.locator(".course-choice").first()).not.toContainText(
      "المستوى ٣",
    );
  });
  test("filters retain shared courses and find another-year subject by its code", async ({
    page,
    context,
  }) => {
    await session(context, 0);
    await page.goto("/courses");
    await page.getByText("السنة والتخصص", { exact: true }).click();
    await page.getByLabel("التخصص (اختياري)").selectOption("cs");
    await page
      .getByRole("button", { name: "اعرض المواد", exact: true })
      .click();
    await expect(page.locator(".section-head")).toContainText("٦٧ مادة");
    await page.getByLabel("السنة الدراسية").selectOption("1");
    await page
      .getByRole("button", { name: "اعرض المواد", exact: true })
      .click();
    await expect(page.locator(".course-choice")).toHaveCount(13);
    await page
      .getByRole("textbox", {
        name: "دوّر باسم المادة أو كودها، بالعربي أو بالإنجليزي",
      })
      .fill("cs111");
    await page
      .getByRole("button", { name: "اعرض المواد", exact: true })
      .click();
    await expect(page.locator(".course-choice")).toHaveCount(1);
    await expect(page.locator(".course-choice")).toContainText(
      "مقدمة في الحاسبات",
    );
    await expect(page.getByLabel("التخصص (اختياري)")).toHaveValue("cs");
    await expect(page.getByLabel("السنة الدراسية")).toHaveValue("1");
  });
  test("student explicitly adds a mixed-year group, keeps it on refresh and removes one normally", async ({
    page,
    context,
  }, info) => {
    const db = await session(context);
    const { data } = await db.from("user_courses").select("course_id");
    for (const r of data || [])
      expect(
        (await db.rpc("follow_course", { p_course: r.course_id })).error,
      ).toBeNull();
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "لسه مضفتش موادك", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "مقترحة لسنتك", exact: true }),
    ).toBeVisible();
    expect(
      (await db.from("user_courses").select("course_id")).data,
    ).toHaveLength(0);
    await page.goto("/courses?q=Programming&program=cs");
    await expect(page.locator(".course-choice")).toHaveCount(5);
    await expect(
      page.getByRole("button", { name: "ضيف المواد المحددة", exact: true }),
    ).toBeDisabled();
    await page
      .getByRole("checkbox", { name: "تحديد كل المواد المعروضة", exact: true })
      .check();
    await page
      .getByRole("button", { name: "ضيف المحدد لموادي · ٥", exact: true })
      .click();
    await expect(
      page.getByText("اتضافت المواد لموادي · ٥", { exact: true }),
    ).toBeVisible();
    for (const checkbox of await page
      .locator(".course-choice input[type=checkbox]")
      .all())
      await expect(checkbox).toBeDisabled();
    await page.reload();
    expect(
      (await db.from("user_courses").select("course_id")).data,
    ).toHaveLength(5);
    await page.getByRole("link", { name: "افتح موادي", exact: true }).click();
    await expect(
      page.locator(".course-grid").first().locator(".course-tile"),
    ).toHaveCount(5);
    await expect(page.locator(".course-grid").first()).toContainText(
      "Programming 1",
    );
    await expect(page.locator(".course-grid").first()).toContainText(
      "Concepts of Programming Languages",
    );
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `docs/screenshots/curriculum-my-courses-${info.project.name}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page.goto("/courses/capital-cs-112");
    await page
      .getByRole("button", { name: "ضمن موادي · إزالة", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "ضيف لموادي", exact: true }),
    ).toBeVisible();
    await page.goto("/dashboard");
    await expect(
      page.locator(".course-grid").first().locator(".course-tile"),
    ).toHaveCount(4);
  });
  test("another-year group supports actual link submission and guest visibility", async ({
    page,
    context,
    browser,
  }) => {
    await session(context, 0);
    const title = "اختبار واجهة المنهج " + randomUUID().slice(0, 8);
    await page.goto(`/courses/${state.fourth.slug}/submit`);
    await page.getByLabel("عنوان المصدر", { exact: true }).fill(title);
    await page
      .locator("input[name=external_url]")
      .fill("https://example.org/ui-curriculum/" + randomUUID());
    await page.locator("select[name=type]").selectOption("reference");
    await page.locator("input[name=rights_confirmed]").check();
    await page.getByRole("button", { name: "ضيف المصدر", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible({ timeout: 20000 });
    const guest = await browser.newContext();
    const p = await guest.newPage();
    await p.goto(page.url());
    await expect(
      p.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await guest.close();
  });
  test("another-year group supports real file submission and a guest download", async ({
    page,
    context,
    request,
  }) => {
    await session(context, 0);
    const title = "اختبار PDF للمنهج " + randomUUID().slice(0, 8);
    await page.goto(`/courses/${state.first.slug}/submit`);
    await page.getByLabel("عنوان المصدر", { exact: true }).fill(title);
    await page.locator("input[name=file]").setInputFiles({
      name: "curriculum-qa.pdf",
      mimeType: "application/pdf",
      buffer: minimalPdf(),
    });
    await page.locator("input[name=rights_confirmed]").check();
    await page.getByRole("button", { name: "ضيف المصدر", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible({ timeout: 20000 });
    const id = new URL(page.url()).pathname.split("/").at(-1);
    const open = await request.get(`/api/resources/${id}/open`, {
      maxRedirects: 0,
    });
    expect(open.status()).toBe(302);
    expect(open.headers().location).toContain(
      "/storage/v1/object/sign/course-pdfs/",
    );
    const download = await fetch(open.headers().location);
    expect(download.status).toBe(200);
    expect((await download.text()).startsWith("%PDF-")).toBe(true);
  });
  test("Arabic search, empty results and 360px large text remain usable", async ({
    page,
    context,
  }) => {
    await session(context, 0);
    await page.goto("/courses?q=" + encodeURIComponent("إشارات ونُظُم"));
    await expect(page.locator(".course-choice")).toHaveCount(1);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.addStyleTag({
      content: "body{font-size:32px} h1{font-size:48px}",
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.goto("/courses?q=no-such-subject");
    await expect(
      page.getByRole("heading", {
        name: "مفيش مواد مطابقة للاختيارات دي",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "اعرض كل المواد", exact: true }),
    ).toBeVisible();
  });
});
