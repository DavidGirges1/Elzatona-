import { test, expect, type BrowserContext } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { fixtures, apiUrl, publishable, minimalPdf } from "../support/live.mjs";
const connected = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SECRET_KEY &&
  process.env.TEST_ALLOW_WRITES === "1",
);
const at = (path: string) =>
  (process.env.NEXT_PUBLIC_BASE_PATH ?? "/") + (path === "/" ? "" : path);
type Fixture = Awaited<ReturnType<typeof fixtures>>;
let f: Fixture;
async function login(
  context: BrowserContext,
  person: Fixture["people"][number],
) {
  const cookieValues: Array<{ name: string; value: string }> = [];
  const serverUrl = process.env.APP_SUPABASE_URL || apiUrl!;
  const db = createServerClient(apiUrl!, publishable!, {
    cookieOptions: {
      name: `sb-${new URL(serverUrl).hostname.split(".")[0]}-auth-token`,
    },
    cookies: {
      getAll: () => [],
      setAll: (values) => {
        cookieValues.push(...values);
      },
    },
  });
  const result = await db.auth.signInWithPassword({
    email: person.email,
    password: person.password,
  });
  expect(result.error).toBeNull();
  await context.addCookies(
    cookieValues.map((c) => ({
      ...c,
      url: process.env.TEST_APP_URL || "http://localhost:3000",
      sameSite: "Lax" as const,
    })),
  );
}
test.describe("Connected real Supabase journeys", () => {
  test.skip(
    !connected,
    "Requires an isolated Supabase project, secret key, and TEST_ALLOW_WRITES=1. No mocks used.",
  );
  test.beforeAll(async () => {
    f = await fixtures();
    const result = await f.people[0].db.rpc("follow_course", {
      p_course: f.course,
    });
    expect(result.error).toBeNull();
  });
  for (const [name, route, authenticated] of [
    ["home", () => "/dashboard", true],
    ["discovery", () => "/courses", false],
    ["course", () => `/courses/${f.slug}`, false],
    ["resource", () => `/courses/${f.slug}/resources/${f.resource}`, false],
    ["submission", () => `/courses/${f.slug}/submit`, true],
    ["login", () => "/login", false],
  ] as const)
    test(`screenshot ${name}`, async ({ page, context }, info) => {
      if (authenticated) await login(context, f.people[0]);
      await page.goto(at(route().trim()));
      await expect(page.locator("h1")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(await page.locator("html").getAttribute("dir")).toBe("rtl");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `docs/screenshots/connected-${name}-${info.project.name}.png`,
        fullPage: true,
      });
    });
  test("Guest WhatsApp deep link opens exact source without authentication", async ({
    page,
    request,
  }) => {
    const path = `/courses/${f.slug}/resources/${f.resource}`;
    await page.goto(at(path));
    await expect(
      page.getByRole("heading", {
        name: "شرح Binary Trees — مصدر تجريبي للمراجعة",
      }),
    ).toBeVisible();
    const response = await request.get(
      at(`/api/resources/${f.resource}/open`),
      {
        maxRedirects: 0,
      },
    );
    expect(response.status()).toBe(302);
    expect(response.headers().location).toContain("developer.mozilla.org");
    await expect(
      page.getByRole("link", { name: "افتح المصدر", exact: true }),
    ).toBeVisible();
  });
  test("Student follows course, submits link, another student reads it", async ({
    page,
    context,
    browser,
  }) => {
    await login(context, f.people[1]);
    await page.goto(at(`/courses/${f.slug}`));
    await page.getByRole("button", { name: "ضيف لموادي", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "ضمن موادي · إزالة" }),
    ).toBeVisible();
    await page.goto(at("/dashboard"));
    await expect(
      page.getByRole("heading", { name: "موادي", exact: true }),
    ).toBeVisible();
    await page.goto(at(`/courses/${f.slug}/submit`));
    await page
      .getByLabel("عنوان المصدر")
      .fill("شرح من طالبة التجربة · browser");
    await page
      .getByLabel("لينك المصدر", { exact: true })
      .fill(`https://example.org/elzatona-${f.run}-${Date.now()}`);
    await page
      .getByLabel("عندي حق مشاركة المصدر، ومفيهوش بيانات خاصة.")
      .check();
    await page.getByRole("button", { name: "ضيف المصدر", exact: true }).click();
    await expect(page).toHaveURL(/\/resources\/[0-9a-f-]+$/);
    const url = page.url();
    const other = await browser.newContext();
    await login(other, f.people[0]);
    const p = await other.newPage();
    await p.goto(url);
    await expect(
      p.getByRole("heading", { name: "شرح من طالبة التجربة · browser" }),
    ).toBeVisible();
    await other.close();
  });
  test("Voting, question, reply and moderator report review", async ({
    page,
    context,
    browser,
  }) => {
    await login(context, f.people[1]);
    await page.goto(at(`/courses/${f.slug}/resources/${f.resource}`));
    await page.getByRole("button", { name: "↑ مفيد", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "↑ مفيد · إلغاء" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "اسأل دفعتك" }).click();
    await page.getByLabel("سؤالك في سطر").fill("سؤال من رحلة المتصفح");
    await page
      .getByLabel("وضح اللي محتاج تفهمه")
      .fill("إزاي نفهم الترتيب في المثال ده؟");
    await page.getByRole("button", { name: "انشر السؤال" }).click();
    await expect(page).toHaveURL(/\/discussions\/[0-9a-f-]+$/);
    const questionUrl = page.url();
    const a = await browser.newContext();
    await login(a, f.people[0]);
    const p = await a.newPage();
    await p.goto(questionUrl);
    await p
      .getByLabel("رد على السؤال")
      .fill("رد حقيقي محفوظ من الطالب التاني.");
    await p.getByRole("button", { name: "ضيف ردك" }).click();
    await expect(
      p.getByText("رد حقيقي محفوظ من الطالب التاني.", { exact: true }),
    ).toBeVisible();
    await a.close();
    await page.goto(at(`/courses/${f.slug}/resources/${f.resource}/report`));
    await page
      .getByLabel("تفاصيل تساعدنا نراجع")
      .fill("بلاغ تجريبي لمراجعة رحلة المشرف.");
    await page.getByRole("button", { name: "ابعت البلاغ" }).click();
    await expect(page.getByRole("status")).toContainText("وصل البلاغ");
    const mod = await browser.newContext();
    await login(mod, f.people[2]);
    const mp = await mod.newPage();
    await mp.goto(at("/admin/reports"));
    const card = mp
      .locator("article")
      .filter({ hasText: "بلاغ تجريبي لمراجعة رحلة المشرف." });
    await expect(card).toContainText("شرح Binary Trees");
    await card.getByLabel("سبب القرار").fill("تمت المراجعة في اختبار المتصفح");
    await card.getByLabel("راجعت المحتوى وأؤكد القرار").check();
    await card.getByRole("button", { name: "نفّذ القرار" }).click();
    await expect(card).toHaveCount(0);
    await mod.close();
    const guest = await browser.newContext();
    const gp = await guest.newPage();
    await gp.goto(at(`/courses/${f.slug}/resources/${f.resource}`));
    await expect(
      gp.getByRole("heading", { name: "الصفحة دي مش موجودة" }),
    ).toBeVisible();
    await guest.close();
  });
  test("Real PDF submission and anonymous signed download", async ({
    page,
    context,
    request,
  }) => {
    await login(context, f.people[1]);
    await page.goto(at(`/courses/${f.slug}/submit`));
    await page.getByLabel("عنوان المصدر").fill("ملف PDF من رحلة المتصفح");
    await page.locator("input[name=file]").setInputFiles({
      name: "elzatona-qa.pdf",
      mimeType: "application/pdf",
      buffer: minimalPdf(),
    });
    await page
      .getByLabel("عندي حق مشاركة المصدر، ومفيهوش بيانات خاصة.")
      .check();
    await page.getByRole("button", { name: "ضيف المصدر", exact: true }).click();
    await expect(page).toHaveURL(/\/resources\/[0-9a-f-]+$/);
    const id = page.url().split("/").at(-1);
    const result = await request.get(at(`/api/resources/${id}/open`), {
      maxRedirects: 0,
    });
    expect(result.status()).toBe(302);
    expect(result.headers().location).toContain("/storage/v1/object/sign/");
  });
});
