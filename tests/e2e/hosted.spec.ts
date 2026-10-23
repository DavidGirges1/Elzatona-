import { test, expect, type BrowserContext } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { readFileSync } from "node:fs";
import { minimalPdf } from "../support/live.mjs";

type Person = { id: string; email: string; password: string };
const enabled = Boolean(
  process.env.TEST_AUTH_ACCOUNTS_FILE && process.env.TEST_PILOT_STATE_FILE,
);
const people: Person[] = enabled
  ? JSON.parse(readFileSync(process.env.TEST_AUTH_ACCOUNTS_FILE!, "utf8"))
  : [];
const state = enabled
  ? JSON.parse(readFileSync(process.env.TEST_PILOT_STATE_FILE!, "utf8"))
  : {};
const base = process.env.TEST_APP_URL || "http://localhost:3000";
const mount = process.env.NEXT_PUBLIC_BASE_PATH ?? "/test";
const at = (path: string) => mount + (path === "/" ? "" : path);
async function login(context: BrowserContext, person: Person) {
  const cookies: Array<{ name: string; value: string }> = [];
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
  const { error } = await db.auth.signInWithPassword({
    email: person.email,
    password: person.password,
  });
  expect(error).toBeNull();
  await context.addCookies(
    cookies.map((c) => ({ ...c, url: base, sameSite: "Lax" as const })),
  );
}

test.use({ trace: "off" });
test.setTimeout(60000);
test.describe("Hosted Supabase through actual Next.js app", () => {
  test.skip(
    !enabled,
    "Requires temporary QA accounts and recorded hosted state; no mock backend.",
  );
  for (const [name, path, auth] of [
    ["home", "/dashboard", true],
    ["discovery", "/courses", false],
    ["course", "/courses/data-structures", false],
    ["resource", `/courses/data-structures/resources/${state.resource}`, false],
    ["submission", "/courses/data-structures/submit", true],
    ["login", "/login", false],
  ] as const)
    test(`actual populated screenshot ${name}`, async ({
      page,
      context,
    }, info) => {
      if (auth) await login(context, people[0]);
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(at(path));
      await expect(page.locator("h1")).toBeVisible();
      if (name === "home")
        await expect(
          page.getByRole("heading", { name: "موادي", exact: true }),
        ).toBeVisible();
      if (name === "submission")
        await expect(page.locator("input[name=file]")).toBeVisible();
      if (name === "resource")
        await expect(page.locator("h1")).toHaveText("اختبار ربط مؤقت · لينك");
      if (name === "login") {
        await expect(
          page.getByText("Google مش متاح حاليًا", { exact: false }),
        ).toBeVisible();
        await expect(
          page.getByRole("link", { name: "كمّل بحساب Google" }),
        ).toHaveCount(0);
      }
      await page.evaluate(() => document.fonts.ready);
      expect(await page.locator("html").getAttribute("dir")).toBe("rtl");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `docs/screenshots/hosted-${name}-${info.project.name}.png`,
        fullPage: true,
      });
      expect(errors).toEqual([]);
    });
  test("guest deep link and disabled Google preserve context", async ({
    page,
    request,
  }) => {
    await page.goto(at(`/courses/data-structures/resources/${state.resource}`));
    await expect(
      page.getByRole("link", { name: "افتح المصدر", exact: true }),
    ).toBeVisible();
    const open = await request.get(
      at(`/api/resources/${state.resource}/open`),
      {
        maxRedirects: 0,
      },
    );
    expect(open.status()).toBe(302);
    expect(open.headers().location).toContain(
      "example.org/elzatona-connection-",
    );
    const login = await request.get(at("/auth/login?next=%2Fsaved"), {
      maxRedirects: 0,
    });
    expect(login.status()).toBe(307);
    expect(login.headers().location).toContain(
      "/login?error=provider&next=%2Fsaved",
    );
  });
  test("first-use course choice, link submission, another student vote, discussion and moderator review", async ({
    page,
    context,
    browser,
  }, info) => {
    await login(context, people[1]);
    await page.goto(at("/courses/data-structures"));
    const follow = page.getByRole("button", {
      name: "ضيف لموادي",
      exact: true,
    });
    if (await follow.count()) await follow.click();
    await expect(
      page.getByRole("button", { name: "ضمن موادي · إزالة" }),
    ).toBeVisible({ timeout: 15000 });
    await page.goto(at("/dashboard"));
    await expect(
      page.getByRole("heading", { name: "موادي", exact: true }),
    ).toBeVisible();
    await page.goto(at("/courses/data-structures/submit"));
    const title = `اختبار متصفح مؤقت · ${info.project.name}`;
    await page.getByLabel("عنوان المصدر").fill(title);
    await page
      .locator("input[name=external_url]")
      .fill(
        `https://example.org/elzatona-browser-${info.project.name}-${Date.now()}`,
      );
    await page
      .getByLabel("عندي حق مشاركة المصدر، ومفيهوش بيانات خاصة.")
      .check();
    await page.getByRole("button", { name: "ضيف المصدر", exact: true }).click();
    await expect(page).toHaveURL(/\/resources\/[0-9a-f-]+$/, {
      timeout: 20000,
    });
    const url = page.url();
    const a = await browser.newContext();
    await login(a, people[0]);
    const p = await a.newPage();
    await p.goto(url);
    await expect(p.locator("h1")).toHaveText(title);
    await p.getByRole("button", { name: "↑ مفيد", exact: true }).click();
    await expect(
      p.getByRole("button", { name: "↑ مفيد · إلغاء" }),
    ).toBeVisible();
    await p.getByRole("link", { name: "اسأل دفعتك" }).click();
    await p.getByLabel("سؤالك في سطر").fill("سؤال اختبار متصفح مؤقت");
    await p
      .getByLabel("وضح اللي محتاج تفهمه")
      .fill("إزاي نرتب خطوات المثال ده؟");
    await p.getByRole("button", { name: "انشر السؤال" }).click();
    await expect(p).toHaveURL(/\/discussions\/[0-9a-f-]+$/);
    await page.goto(p.url());
    await page
      .getByLabel("رد على السؤال")
      .fill("رد اختبار مؤقت محفوظ من المتصفح.");
    await page.getByRole("button", { name: "ضيف ردك" }).click();
    await expect(
      page.getByText("رد اختبار مؤقت محفوظ من المتصفح.", { exact: true }),
    ).toBeVisible();
    await p.goto(url + "/report");
    const details = `بلاغ اختبار متصفح مؤقت ${info.project.name}`;
    await p.getByLabel("تفاصيل تساعدنا نراجع").fill(details);
    await p.getByRole("button", { name: "ابعت البلاغ" }).click();
    await expect(p.getByRole("status")).toContainText("وصل البلاغ");
    await a.close();
    const mod = await browser.newContext();
    await login(mod, people[2]);
    const mp = await mod.newPage();
    await mp.goto(at("/admin/reports"));
    const card = mp.locator("article").filter({ hasText: details });
    await expect(card).toContainText(title);
    await card.getByLabel("سبب القرار").fill("إخفاء سجل اختبار المتصفح المؤقت");
    await card.getByLabel("راجعت المحتوى وأؤكد القرار").check();
    await card.getByRole("button", { name: "نفّذ القرار" }).click();
    await expect(card).toHaveCount(0);
    await mod.close();
    const guest = await browser.newContext();
    const gp = await guest.newPage();
    await gp.goto(url);
    await expect(
      gp.getByRole("heading", { name: "الصفحة دي مش موجودة" }),
    ).toBeVisible();
    await guest.close();
  });
  test("PDF form uploads real bytes, publishes and opens for a guest", async ({
    page,
    context,
    request,
  }, info) => {
    await login(context, people[1]);
    await page.goto(at("/courses/data-structures/submit"));
    await page
      .getByLabel("عنوان المصدر")
      .fill(`اختبار PDF متصفح مؤقت ${info.project.name}`);
    const bytes = minimalPdf();
    await page.locator("input[name=file]").setInputFiles({
      name: "elzatona-qa.pdf",
      mimeType: "application/pdf",
      buffer: bytes,
    });
    await page
      .getByLabel("عندي حق مشاركة المصدر، ومفيهوش بيانات خاصة.")
      .check();
    await page.getByRole("button", { name: "ضيف المصدر", exact: true }).click();
    await expect(page).toHaveURL(/\/resources\/[0-9a-f-]+$/, {
      timeout: 20000,
    });
    const id = page.url().split("/").at(-1);
    const r = await request.get(at(`/api/resources/${id}/open`), {
      maxRedirects: 0,
    });
    expect(r.status()).toBe(302);
    expect(r.headers().location).toContain(
      "/storage/v1/object/sign/course-pdfs/",
    );
    const download = await fetch(r.headers().location);
    expect(download.status).toBe(200);
    expect(Buffer.from(await download.arrayBuffer())).toEqual(bytes);
  });
});
