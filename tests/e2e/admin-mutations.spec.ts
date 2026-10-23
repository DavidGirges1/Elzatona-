import { test, expect, type BrowserContext } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";
import { minimalPdf } from "../support/live.mjs";
const enabled = !!process.env.TEST_AUTH_ACCOUNTS_FILE;
const people = enabled
  ? JSON.parse(readFileSync(process.env.TEST_AUTH_ACCOUNTS_FILE!, "utf8"))
  : [];
const at = (p: string) => "/" + p;
async function session(context: BrowserContext, position: number) {
  const values: { name: string; value: string }[] = [];
  const db = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: (v) => {
          values.push(...v);
        },
      },
    },
  );
  const r = await db.auth.signInWithPassword({
    email: people[position].email,
    password: people[position].password,
  });
  expect(r.error).toBeNull();
  await context.addCookies(
    values.map((c) => ({
      ...c,
      url: process.env.TEST_APP_URL || "http://localhost:3000",
      sameSite: "Lax" as const,
    })),
  );
  return db;
}
test.use({ trace: "off" });
test("admin manages catalog; new options drive onboarding; student uploads and moderator reviews", async ({
  page,
  context,
  browser,
}, info) => {
  test.skip(
    !enabled || info.project.name !== "mobile-390",
    "Explicit temporary hosted fixtures, one write journey.",
  );
  test.setTimeout(180000);
  const admin = await session(context, 2);
  const suffix =
    people[2].username.split("_")[1] + "-" + Date.now().toString(36);
  const uniName = `جامعة اختبار الواجهة ${suffix}`,
    facultyName = `كلية اختبار الواجهة ${suffix}`,
    courseTitle = `مادة اختبار الواجهة ${suffix}`,
    slug = `qa-ui-course-${suffix}`;
  await page.goto(at("/admin/universities"));
  const form = page
    .locator("form")
    .filter({ has: page.locator("input[name=slug]") });
  await form.locator("input[name=name_ar]").fill(uniName);
  await form.locator("input[name=name]").fill("QA UI University");
  await form.locator("input[name=slug]").fill(`qa-ui-uni-${suffix}`);
  await form.getByRole("button", { name: "احفظ الجامعة" }).click();
  await expect(page.getByRole("status")).toContainText("اتحفظت");
  const u = await admin
    .from("universities")
    .select("id")
    .eq("slug", `qa-ui-uni-${suffix}`)
    .single();
  expect(u.error).toBeNull();
  const university = u.data!.id;
  writeFileSync(
    "/tmp/elzatona-qa-ui-catalog.json",
    JSON.stringify({ university }),
    { mode: 0o600 },
  );
  await page.goto(at("/admin/faculties"));
  const fform = page
    .locator("form")
    .filter({ has: page.locator("input[name=slug]") });
  await fform.locator("select[name=university_id]").selectOption(university);
  await fform.locator("input[name=name_ar]").fill(facultyName);
  await fform.locator("input[name=name]").fill("QA UI Faculty");
  await fform.locator("input[name=slug]").fill(`qa-ui-faculty-${suffix}`);
  await fform.locator("input[name=years]").fill("1,2,3,4,5,6,7");
  await fform.getByRole("button", { name: "احفظ الكلية والسنين" }).click();
  await expect(page.getByRole("status")).toContainText("اتحفظت");
  const f = await admin
    .from("faculties")
    .select("id")
    .eq("slug", `qa-ui-faculty-${suffix}`)
    .single();
  expect(f.error).toBeNull();
  const faculty = f.data!.id;
  writeFileSync(
    "/tmp/elzatona-qa-ui-catalog.json",
    JSON.stringify({ university, faculty }),
    { mode: 0o600 },
  );
  await page.goto(at("/admin/courses"));
  const cform = page
    .locator("form")
    .filter({ has: page.locator("input[name=slug]") });
  await cform.locator("select[name=university_id]").selectOption(university);
  await cform.locator("select[name=faculty_id]").selectOption(faculty);
  await cform.locator("select[name=academic_year]").selectOption("7");
  await cform.locator("select[name=semester]").selectOption("2");
  await cform.locator("input[name=title_ar]").fill(courseTitle);
  await cform.locator("input[name=title]").fill("QA UI Course");
  await cform.locator("input[name=code]").fill("QA-UI7");
  await cform.locator("input[name=slug]").fill(slug);
  await cform.getByRole("button", { name: "احفظ المادة" }).click();
  await expect(page.getByRole("status")).toContainText("اتحفظت");
  const studentContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const student = await session(studentContext, 3);
  const sp = await studentContext.newPage();
  await sp.goto(at("/onboarding?step=1"));
  await sp.getByRole("radio", { name: new RegExp(uniName) }).check();
  await sp.getByRole("button", { name: "كمّل", exact: true }).click();
  await sp.getByRole("radio", { name: facultyName, exact: true }).check();
  await sp.getByRole("button", { name: "كمّل", exact: true }).click();
  await expect(sp.getByRole("radio")).toHaveCount(7);
  await sp.locator('input[name=academic_year][value="7"]').check();
  await sp.getByRole("button", { name: "جاهز · افتح موادي" }).click();
  await expect(sp).toHaveURL(/\/dashboard$/, { timeout: 15000 });
  await expect(sp.locator(".course-tile")).toContainText(courseTitle);
  await sp.goto(at(`/courses/${slug}/submit`));
  await sp.locator("input[name=title]").fill(`ملف اختبار واجهة ${suffix}`);
  await sp.locator("input[name=file]").setInputFiles({
    name: "elzatona-ui-qa.pdf",
    mimeType: "application/pdf",
    buffer: minimalPdf(),
  });
  await sp.locator("input[name=rights_confirmed]").check();
  await sp.getByRole("button", { name: "ضيف المصدر" }).click();
  await expect(sp).toHaveURL(/\/resources\/[0-9a-f-]+$/, { timeout: 20000 });
  const resource = sp.url().split("/").at(-1)!;
  const detail = `/courses/${slug}/resources/${resource}`;
  await expect(sp.locator("h1")).toContainText("ملف اختبار واجهة");
  const guest = await browser.newContext();
  const gp = await guest.newPage();
  await gp.goto(at(detail));
  await expect(gp.locator("h1")).toContainText("ملف اختبار واجهة");
  const download = await guest.request.get(
    at(`/api/resources/${resource}/open`),
    { maxRedirects: 0 },
  );
  expect(download.status()).toBe(302);
  const bytes = await fetch(download.headers().location);
  expect(bytes.status).toBe(200);
  expect(Buffer.from(await bytes.arrayBuffer())).toEqual(minimalPdf());
  const other = await browser.newContext();
  const otherDb = await session(other, 1);
  expect(
    (
      await otherDb.rpc("edit_resource", {
        p_resource: resource,
        p_title: "forged title",
        p_description: "",
        p_topic: null,
      })
    ).error,
  ).not.toBeNull();
  const op = await other.newPage();
  await op.goto(at(detail));
  await op.getByRole("button", { name: "↑ مفيد", exact: true }).click();
  await expect(
    op.getByRole("button", { name: "↑ مفيد · إلغاء", exact: true }),
  ).toBeVisible();
  await op.goto(at(detail + "/report"));
  await op.locator("textarea[name=details]").fill("اختبار مراجعة بلاغ مؤقت");
  await op.getByRole("button", { name: "ابعت البلاغ" }).click();
  await expect(op.getByRole("status")).toContainText("وصل البلاغ");
  await page.goto(at("/admin/reports"));
  const report = page.locator("article").filter({ hasText: resource });
  await report.locator("textarea[name=reason]").fill("إخفاء محتوى اختبار مؤقت");
  await report.locator("input[name=confirm]").check();
  await report.getByRole("button", { name: "نفّذ القرار" }).click();
  await expect(report).toHaveCount(0);
  await gp.goto(at(detail));
  await expect(
    gp.getByRole("heading", { name: "الصفحة دي مش موجودة" }),
  ).toBeVisible();
  await page.goto(at(`/admin/users?q=${people[3].username}`));
  await page.getByRole("button", { name: "إيقاف الحساب", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("textarea[name=reason]").fill("إيقاف حساب اختبار مؤقت");
  await dialog.locator("input[name=confirm]").check();
  await dialog.getByRole("button", { name: "تأكيد القرار" }).click();
  await expect(dialog.getByRole("status")).toContainText("اتحفظ القرار");
  await sp.goto(at("/dashboard"));
  await expect(sp).toHaveURL(/\/suspended$/);
  expect(
    (await student.rpc("follow_course", { p_course: randomCourseId() })).error,
  ).not.toBeNull();
  await page.getByRole("button", { name: "إلغاء", exact: true }).click();
  await page
    .getByRole("button", { name: "إعادة التفعيل", exact: true })
    .click();
  await dialog.locator("textarea[name=reason]").fill("إعادة حساب الاختبار");
  await dialog.locator("input[name=confirm]").check();
  await dialog.getByRole("button", { name: "تأكيد القرار" }).click();
  await expect(dialog.getByRole("status")).toContainText("اتحفظ القرار");
  await studentContext.close();
  await other.close();
  await guest.close();
});
function randomCourseId() {
  return "00000000-0000-4000-8000-000000000001";
}
