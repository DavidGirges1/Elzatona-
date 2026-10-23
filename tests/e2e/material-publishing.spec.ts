import { test, expect, type BrowserContext } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
const enabled =
  !!process.env.TEST_PUBLISHING_ACCOUNTS && !!process.env.TEST_PUBLISHING_STATE;
const people = enabled
  ? JSON.parse(readFileSync(process.env.TEST_PUBLISHING_ACCOUNTS!, "utf8"))
  : [];
const state = enabled
  ? JSON.parse(readFileSync(process.env.TEST_PUBLISHING_STATE!, "utf8"))
  : {};
async function login(context: BrowserContext, index: number) {
  const cookies: { name: string; value: string }[] = [];
  const db = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: (values) => {
          cookies.push(...values);
        },
      },
    },
  );
  expect(
    (
      await db.auth.signInWithPassword({
        email: people[index].email,
        password: people[index].password,
      })
    ).error,
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
test.setTimeout(120000);
test("admin approves and revokes publisher/organizer; students remain locked by default", async ({
  page,
  browser,
  context,
}, info) => {
  test.skip(
    !enabled,
    "Requires explicitly provisioned temporary publishing QA accounts/state.",
  );
  const admin = await login(context, 2);
  for (const person of people.slice(0, 2))
    expect(
      (
        await admin.rpc("admin_set_material_permissions", {
          p_user: person.id,
          p_publish: false,
          p_organize: false,
          p_reason: "Reset isolated browser QA grants",
          p_confirm: true,
        })
      ).error,
    ).toBeNull();
  const studentContext = await browser.newContext({
    viewport: page.viewportSize()!,
    locale: "ar-EG",
  });
  const organizerContext = await browser.newContext({
    viewport: page.viewportSize()!,
    locale: "ar-EG",
  });
  try {
    const studentDb = await login(studentContext, 0);
    await login(organizerContext, 1);
    const student = await studentContext.newPage(),
      organizer = await organizerContext.newPage();
    for (const p of [page, student, organizer]) {
      p.setDefaultTimeout(15000);
      p.setDefaultNavigationTimeout(30000);
    }
    await student.goto(`/courses/${state.slug}/submit`);
    await expect(
      student.getByRole("heading", { name: "إضافة المصادر للمصرّح لهم" }),
    ).toBeVisible();
    await expect(student.locator('input[name="external_url"]')).toHaveCount(0);
    await page.goto(`/admin/users?q=${people[0].username}`);
    await expect(
      page.getByText("للمصرّح لهم فقط", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "فتح النشر للجميع", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText(
      "صلاحية تنظيم مصادر الآخرين مش هتتفتح تلقائيًا",
    );
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "إلغاء", exact: true })
      .click();
    async function change(publish: boolean, organize: boolean) {
      await page
        .getByRole("button", { name: "صلاحيات المصادر", exact: true })
        .click();
      const d = page.getByRole("dialog");
      await d.locator('input[name="publish"]').setChecked(publish);
      await d.locator('input[name="organize"]').setChecked(organize);
      await d
        .locator('textarea[name="reason"]')
        .fill("قرار اختبار متصفح مؤقت ومحدّد");
      await d.locator('input[name="confirm"]').check();
      await d
        .getByRole("button", { name: "احفظ الصلاحيات", exact: true })
        .click();
      await expect(d.getByRole("status")).toHaveText("اتحفظت صلاحيات المصادر.");
      await d.getByRole("button", { name: "إلغاء", exact: true }).click();
    }
    await change(true, false);
    await expect(page.getByText("ناشر", { exact: true })).toBeVisible();
    await page.screenshot({
      path: `docs/screenshots/publishing-admin-${info.project.name}.png`,
      fullPage: true,
    });
    await student.goto(`/courses/${state.slug}/submit`);
    const title = `اختبار نشر مصرح ${info.project.name} ${randomUUID().slice(0, 8)}`;
    await student.getByLabel("عنوان المصدر", { exact: true }).fill(title);
    await student
      .locator('input[name="external_url"]')
      .fill(`https://example.org/qa-publishing-${randomUUID()}`);
    await student.locator('select[name="type"]').selectOption("reference");
    await student.locator('input[name="rights_confirmed"]').check();
    await student
      .getByRole("button", { name: "ضيف المصدر", exact: true })
      .click();
    await expect(student).toHaveURL(/\/resources\/[0-9a-f-]{36}$/, {
      timeout: 20000,
    });
    const resourcePath = new URL(student.url()).pathname;
    await expect(
      student.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    const guest = await browser.newContext({ viewport: page.viewportSize()! });
    const guestPage = await guest.newPage();
    await guestPage.goto(resourcePath);
    await expect(
      guestPage.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await guest.close();
    await page.goto(`/admin/users?q=${people[1].username}`);
    await change(false, true);
    await organizer.goto(`/courses/${state.slug}`);
    await organizer.locator(".topic-organizer summary").click();
    const topic = `QA موضوع ${info.project.name} ${randomUUID().slice(0, 8)}`;
    await organizer
      .getByLabel("اسم الموضوع أو المحاضرة", { exact: true })
      .fill(topic);
    await organizer
      .getByRole("button", { name: "ضيف الموضوع", exact: true })
      .click();
    await expect(
      organizer.locator(".topic-organizer").getByRole("status"),
    ).toContainText("الموضوع موجود دلوقتي");
    await organizer.goto(resourcePath);
    await organizer
      .getByRole("link", { name: "تعديل المصدر", exact: true })
      .click();
    await expect(
      organizer
        .locator('select[name="topic_id"] option')
        .filter({ hasText: topic }),
    ).toHaveCount(1);
    await organizer
      .locator('select[name="topic_id"]')
      .selectOption({ label: topic });
    await organizer
      .getByRole("button", { name: "احفظ التعديل", exact: true })
      .click();
    await expect(organizer).toHaveURL(new RegExp(resourcePath + "$"));
    await expect(organizer.locator(".breadcrumb")).toContainText(topic);
    await page.goto(`/admin/users?q=${people[0].username}`);
    await change(false, false);
    await student.goto(`/courses/${state.slug}/submit`);
    await expect(
      student.getByRole("heading", { name: "إضافة المصادر للمصرّح لهم" }),
    ).toBeVisible();
    await student.screenshot({
      path: `docs/screenshots/publishing-locked-${info.project.name}.png`,
      fullPage: true,
    });
    expect(
      await student.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await studentDb.rpc("submit_resource", {
          p_course: state.course,
          p_topic: null,
          p_title: "Denied after UI revocation",
          p_description: "",
          p_type: "reference",
          p_url: "https://example.org/qa-denied",
          p_rights: true,
          p_ai: false,
        })
      ).error,
    ).not.toBeNull();
    await page.goto(`/admin/users?q=${people[1].username}`);
    await change(false, false);
    await organizer.goto(resourcePath + "/edit");
    await expect(
      organizer.getByRole("heading", { name: "تنظيم المصادر للمصرّح لهم" }),
    ).toBeVisible();
    const r = await admin.rpc("material_access");
    expect(r.error).toBeNull();
    expect((r.data as { open_to_all: boolean }).open_to_all).toBe(false);
  } finally {
    for (const person of people.slice(0, 2))
      await admin.rpc("admin_set_material_permissions", {
        p_user: person.id,
        p_publish: false,
        p_organize: false,
        p_reason: "End isolated browser QA grants",
        p_confirm: true,
      });
    await studentContext.close();
    await organizerContext.close();
  }
});
