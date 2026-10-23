import { test, expect, type BrowserContext } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";
const enabled =
  !!process.env.TEST_AUTH_ACCOUNTS_FILE && !!process.env.TEST_HOSTED_STATE_FILE;
type Person = { id: string; email: string; password: string; username: string };
const people: Person[] = enabled
  ? JSON.parse(readFileSync(process.env.TEST_AUTH_ACCOUNTS_FILE!, "utf8"))
  : [];
const state: Record<string, string> = enabled
  ? JSON.parse(readFileSync(process.env.TEST_HOSTED_STATE_FILE!, "utf8"))
  : {};
const at = (p: string) => p;
async function session(context: BrowserContext, p: Person) {
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
  const r = await db.auth.signInWithPassword({
    email: p.email,
    password: p.password,
  });
  expect(r.error).toBeNull();
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
test.describe("Academic identity and admin — real hosted backend", () => {
  test.skip(
    !enabled,
    "Requires explicit temporary QA accounts and real hosted state.",
  );
  for (const [name, path, who] of [
    ["landing", "/", -1],
    ["login", "/login", -1],
    ["signup", "/signup", -1],
    ["onboarding", "/onboarding?step=1", 0],
    ["home", "/dashboard", 1],
    ["discovery", "/courses", 1],
    ["course", `/courses/${state.slug}`, -1],
    ["resource", `/courses/${state.slug}/resources/${state.resource}`, -1],
    ["submission", `/courses/${state.slug}/submit`, 1],
    ["admin", "/admin", 2],
  ] as const) {
    test(`responsive actual screenshot ${name}`, async ({
      page,
      context,
    }, info) => {
      if (who >= 0) await session(context, people[who]);
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const response = await page.goto(at(path));
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(await page.locator("html").getAttribute("dir")).toBe("rtl");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (name === "landing") {
        await page.getByRole("tab", { name: "فيديوهات" }).click();
        await expect(page.getByRole("tabpanel")).toContainText(
          "الشرح اللي يوصّل",
        );
        await page.getByRole("tab", { name: "ملخصات" }).click();
        for (const section of await page.locator("[data-reveal]").all()) {
          await section.scrollIntoViewIfNeeded();
          await expect(section).toHaveCSS("opacity", "1");
        }
        await page.evaluate(() => scrollTo(0, 0));
      }
      await page.screenshot({
        path: `docs/screenshots/academic-${name}-${info.project.name}.png`,
        fullPage: true,
        animations: "disabled",
      });
      expect(errors).toEqual([]);
    });
  }
  test("guest opens exact shared resource without signup", async ({
    page,
    request,
  }) => {
    await page.goto(at(`/courses/${state.slug}/resources/${state.resource}`));
    await expect(page.locator("h1")).toHaveText("مصدر ربط أكاديمي مؤقت");
    const response = await request.get(
      at(`/api/resources/${state.resource}/open`),
      { maxRedirects: 0 },
    );
    expect(response.status()).toBe(302);
    expect(response.headers().location).toContain("https://example.org/");
  });
  test("student cannot access admin pages or PDF review", async ({
    page,
    context,
  }) => {
    await session(context, people[1]);
    await page.goto(at("/admin/users"));
    await expect(page).toHaveURL(/\/admin\/login\?error=access/);
    await expect(
      page.getByRole("heading", { name: "إدارة الزتونة." }),
    ).toBeVisible();
    const denied = await page.goto(
      at(`/api/admin/resources/${state.pdf}/open`),
    );
    expect(denied?.status()).toBe(403);
  });
  test("signup live validation and password visibility", async ({ page }) => {
    await page.goto(at("/signup"));
    await page.locator("input[name=username]").fill(people[1].username);
    await expect(
      page.getByText("الاسم مستخدم. اختار اسم تاني.", { exact: true }),
    ).toBeVisible();
    await page.locator("input[name=username]").fill("1invalid");
    await expect(
      page.getByText("ابدأ بحرف إنجليزي، واستخدم حروف وأرقام و _", {
        exact: true,
      }),
    ).toBeVisible();
    await page.locator("input[name=password]").fill("weak");
    await page
      .getByRole("button", { name: "اظهر كلمة المرور" })
      .first()
      .click();
    await expect(page.locator("input[name=password]")).toHaveAttribute(
      "type",
      "text",
    );
    await page.locator("input[name=confirm_password]").fill("different");
    await expect(
      page.getByText("كلمتا المرور مش متطابقتين", { exact: true }),
    ).toBeVisible();
  });
  test("ordinary login uses email/password and returns to real dashboard", async ({
    page,
  }) => {
    await page.goto(at("/login"));
    await page.locator("input[name=email]").fill(people[1].email);
    await page.locator("input[name=password]").fill(people[1].password);
    await page
      .getByRole("button", { name: "تسجيل الدخول", exact: true })
      .click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "موادي", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".course-grid")).toContainText(
      "مادة اختبار مؤقت · هندسة",
    );
  });
  test("admin username login and real console pages", async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== "mobile-390",
      "One destructive/session journey; responsive read coverage runs for all widths.",
    );
    await page.goto(at("/admin/login"));
    await page.locator("input[name=username]").fill(people[2].username);
    await page.locator("input[name=password]").fill(people[2].password);
    await page.getByRole("button", { name: "دخول الإدارة" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await page.getByRole("button", { name: "الزيارات", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "الزيارات", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    for (const path of [
      "universities",
      "faculties",
      "users",
      "courses",
      "resources",
      "reports",
      "highlights",
      "audit",
    ]) {
      const r = await page.goto(at(`/admin/${path}`));
      expect(r?.status()).toBe(200);
      await expect(page.locator("h1")).toBeVisible();
    }
    await page.goto(at(`/admin/users?q=${people[1].username}`));
    await expect(
      page.getByRole("cell", { name: people[1].email, exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "إيقاف الحساب", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "إلغاء", exact: true }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
  test("persisted onboarding resumes at year; completes and can edit later", async ({
    page,
    context,
  }, info) => {
    test.skip(
      info.project.name !== "mobile-390",
      "Writes student context once.",
    );
    const db = await session(context, people[0]);
    expect(
      (
        await db.rpc("set_academic_context", {
          p_university: state.university,
          p_faculty: state.faculty,
          p_year: null,
        })
      ).error,
    ).toBeNull();
    await context.clearCookies();
    await page.goto(at("/login"));
    await page.locator("input[name=email]").fill(people[0].email);
    await page.locator("input[name=password]").fill(people[0].password);
    await page
      .getByRole("button", { name: "تسجيل الدخول", exact: true })
      .click();
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.locator("h1")).toHaveText("إنت في سنة كام؟");
    await page.locator('input[name=academic_year][value="2"]').check();
    await page.getByRole("button", { name: "جاهز · افتح موادي" }).click();
    await expect(
      page.getByRole("heading", { name: "موادك، على مقاسك." }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 12000 });
    await page.goto(at("/onboarding?edit=1"));
    await page.getByRole("radio", { name: /جامعة بني سويف/ }).check();
    await page.getByRole("button", { name: "كمّل", exact: true }).click();
    await expect(page.locator("h1")).toHaveText("اختار كليتك.");
    await page.getByRole("radio", { name: /الحاسبات والمعلومات/ }).check();
    await page.getByRole("button", { name: "كمّل", exact: true }).click();
    await expect(page.locator("input[name=academic_year]")).toHaveCount(4);
    await page.locator('input[name=academic_year][value="1"]').check();
    await page.getByRole("button", { name: "جاهز · افتح موادي" }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 12000 });
    await expect(
      page.getByRole("heading", { name: "مواد كليتك لسه بتتجهز" }),
    ).toBeVisible();
    await expect(page.locator(".course-tile")).toHaveCount(0);
  });
});
