import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { quizPdf } from "../support/quiz-pdf.mjs";
const enabled =
  !!process.env.TEST_COMMUNITY_ACCOUNTS && !!process.env.TEST_COMMUNITY_STATE;
const people = enabled
  ? JSON.parse(readFileSync(process.env.TEST_COMMUNITY_ACCOUNTS!, "utf8"))
  : [];
const state = enabled
  ? JSON.parse(readFileSync(process.env.TEST_COMMUNITY_STATE!, "utf8"))
  : {};
const quiz = JSON.parse(readFileSync("tests/fixtures/quiz.json", "utf8"));
async function login(context: BrowserContext, index: number) {
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
const bounds = async (page: Page) =>
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
async function startLink(page: Page, title: string, direct = false) {
  await page.goto(`/courses/${state.slug}/submit`);
  await page.getByRole("button", { name: /مذاكرة.*شرح/ }).click();
  await page.getByRole("button", { name: "مرجع", exact: true }).click();
  await page.getByRole("button", { name: "لينك", exact: true }).click();
  await page.getByLabel("عنوان المصدر", { exact: true }).fill(title);
  await page
    .locator("input[name=external_url]")
    .fill("https://example.org/browser-community-" + randomUUID());
  await page.locator("input[name=rights_confirmed]").check();
  await page
    .getByRole("button", {
      name: direct ? "ضيف المصدر" : "ابعت للمراجعة",
      exact: true,
    })
    .click();
}
async function decision(
  page: Page,
  value: "approved" | "rejected",
  reason: string,
) {
  await page.locator("select[name=decision]").selectOption(value);
  await page.locator("textarea[name=reason]").fill(reason);
  await page.locator("input[name=confirm]").check();
  await page
    .getByRole("button", { name: "احفظ قرار المراجعة", exact: true })
    .click();
  await expect(page).toHaveURL(/\/review\?decision=/);
  await expect(page.getByRole("status")).toContainText(
    value === "approved" ? "اتقبل المصدر" : "اترجع المصدر",
  );
}
test.use({ trace: "off" });
test.setTimeout(180000);
test.beforeEach(({ page }) => {
  test.skip(
    !enabled,
    "Requires isolated, explicitly provisioned community role QA accounts/state.",
  );
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(30000);
});
test("admin assigns roles; ordinary author receives feedback and a scoped leader approves the correction", async ({
  page,
  context,
  browser,
}, info) => {
  const admin = await login(context, 4);
  const studentContext = await browser.newContext({
      viewport: page.viewportSize()!,
      locale: "ar-EG",
    }),
    leaderContext = await browser.newContext({
      viewport: page.viewportSize()!,
      locale: "ar-EG",
    }),
    otherContext = await browser.newContext({
      viewport: page.viewportSize()!,
      locale: "ar-EG",
    }),
    guestContext = await browser.newContext({
      viewport: page.viewportSize()!,
      locale: "ar-EG",
    });
  try {
    const studentDb = await login(studentContext, 0);
    const leaderDb = await login(leaderContext, 2);
    await login(otherContext, 3);
    const student = await studentContext.newPage(),
      leader = await leaderContext.newPage(),
      other = await otherContext.newPage(),
      guest = await guestContext.newPage();
    for (const p of [student, leader, other, guest]) {
      p.setDefaultTimeout(15000);
      p.setDefaultNavigationTimeout(30000);
    }
    async function assign(index: number, role: string) {
      await page.goto(`/admin/users?q=${people[index].username}`);
      await page
        .getByRole("button", { name: "تعيين الدور", exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog.locator("select[name=role]").selectOption(role);
      if (role === "class_leader") {
        await dialog
          .getByLabel("دور على مادة للصلاحية", { exact: true })
          .fill("AI 310");
        await dialog.getByRole("checkbox", { name: /AI 310/ }).check();
      }
      await dialog
        .locator("textarea[name=reason]")
        .fill("قرار مؤقت لاختبار أدوار المتصفح");
      await dialog.locator("input[name=confirm]").check();
      await dialog
        .getByRole("button", { name: "احفظ الدور", exact: true })
        .click();
      await expect(dialog.getByRole("status")).toContainText("اتحفظ الدور");
      await dialog.getByRole("button", { name: "إلغاء", exact: true }).click();
    }
    await assign(0, "student");
    await assign(1, "trusted");
    await assign(2, "class_leader");
    await page.screenshot({
      path: `docs/screenshots/community-admin-${info.project.name}.png`,
      fullPage: true,
    });
    await bounds(page);
    const title = `QA student proposal ${info.project.name} ${randomUUID().slice(0, 8)}`;
    await startLink(student, title);
    await expect(student).toHaveURL(/\/my-contributions\?submitted=/);
    const id = new URL(student.url()).searchParams.get("submitted")!;
    const publicPath = `/courses/${state.slug}/resources/${id}`;
    const ownCard = student.locator("article").filter({
      has: student.getByRole("heading", { name: title, exact: true }),
    });
    await expect(ownCard).toContainText("في انتظار المراجعة");
    await guest.goto(publicPath);
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
    await other.goto(`/review/${id}`);
    await expect(
      other.getByRole("heading", { name: "الصفحة دي مش موجودة" }),
    ).toBeVisible();
    expect(
      (
        await other.request.get(`/api/review/resources/${id}/open`, {
          maxRedirects: 0,
        })
      ).status(),
    ).toBe(403);
    await leader.goto(`/review/${id}`);
    await expect(
      leader.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await leader.screenshot({
      path: `docs/screenshots/community-review-${info.project.name}.png`,
      fullPage: true,
    });
    await bounds(leader);
    await decision(
      leader,
      "rejected",
      "Please clarify the title and explain the source coverage.",
    );
    await student.goto("/my-contributions");
    const rejected = student.locator("article").filter({
      has: student.getByRole("heading", { name: title, exact: true }),
    });
    await expect(rejected).toContainText("Please clarify");
    await rejected.getByRole("link", { name: "عدّل وأعد الإرسال" }).click();
    await student.locator("input[name=title]").fill(title + " corrected");
    await student
      .getByRole("button", { name: "احفظ وأعد للمراجعة", exact: true })
      .click();
    await expect(student).toHaveURL(/\/my-contributions$/);
    await leader.goto(`/review/${id}`);
    await expect(
      leader.getByRole("heading", { name: title + " corrected", exact: true }),
    ).toBeVisible();
    await decision(
      leader,
      "approved",
      "Source opened and the corrected title is accurate.",
    );
    await guest.goto(publicPath);
    await expect(
      guest.getByRole("heading", { name: title + " corrected", exact: true }),
    ).toBeVisible();
    expect(
      (
        await studentDb.rpc("edit_resource", {
          p_resource: id,
          p_title: "Unreviewed edit attempt",
          p_description: "",
          p_topic: null,
        })
      ).error,
    ).not.toBeNull();
    await leader.goto(`/courses/${state.slug}`);
    await leader.locator(".topic-organizer > summary").click();
    const topic = `QA browser topic ${info.project.name} ${randomUUID().slice(0, 8)}`;
    const add = leader.locator(".topic-organizer > form");
    await add.locator("input[name=title]").fill(topic);
    await add.getByRole("button", { name: "ضيف الموضوع", exact: true }).click();
    await expect(add.getByRole("status")).toContainText("الموضوع موجود");
    const editor = leader
      .locator(".topic-management details")
      .filter({ has: leader.locator("summary").filter({ hasText: topic }) });
    await editor.locator("summary").click();
    await editor.locator("input[name=title]").fill(topic + " renamed");
    await editor.locator("input[name=order]").fill("4");
    await editor
      .getByRole("button", { name: "احفظ الموضوع", exact: true })
      .click();
    await expect(editor.getByRole("status")).toContainText("اتحفظ");
    await assign(2, "student");
    expect(
      (
        await leaderDb.rpc("add_material_topic", {
          p_course: state.course,
          p_title: "Denied after revocation",
        })
      ).error,
    ).not.toBeNull();
    await leader.goto("/review");
    await expect(leader).toHaveURL(/\/dashboard$/);
    await assign(2, "class_leader");
    await guest.goto("/signup");
    await expect(
      guest.locator("select[name=role],input[name=role]"),
    ).toHaveCount(0);
    await expect(guest.getByText("مساهم موثوق", { exact: true })).toHaveCount(
      0,
    );
    const access = await admin.rpc("material_access", {
      p_course: state.course,
    });
    expect(access.error).toBeNull();
    expect((access.data as { can_publish: boolean }).can_publish).toBe(true);
  } finally {
    await studentContext.close();
    await leaderContext.close();
    await otherContext.close();
    await guestContext.close();
  }
});
test("ordinary PDF and quiz need approval; trusted material publishes directly and students keep voting/discussion access", async ({
  page,
  context,
  browser,
}, info) => {
  const studentDb = await login(context, 0);
  const reviewerContext = await browser.newContext({
      viewport: page.viewportSize()!,
      locale: "ar-EG",
    }),
    trustedContext = await browser.newContext({
      viewport: page.viewportSize()!,
      locale: "ar-EG",
    }),
    guestContext = await browser.newContext({
      viewport: page.viewportSize()!,
      locale: "ar-EG",
    });
  try {
    await login(reviewerContext, 2);
    await login(trustedContext, 1);
    const reviewer = await reviewerContext.newPage(),
      trusted = await trustedContext.newPage(),
      guest = await guestContext.newPage();
    for (const p of [reviewer, trusted, guest]) {
      p.setDefaultTimeout(15000);
      p.setDefaultNavigationTimeout(30000);
    }
    await page.goto(`/courses/${state.slug}/submit?purpose=solve`);
    await page.getByRole("button", { name: /بنك أسئلة PDF/ }).click();
    const title = `QA student PDF ${info.project.name} ${randomUUID().slice(0, 8)}`;
    await page.getByLabel("عنوان المصدر", { exact: true }).fill(title);
    await page.locator("input[name=file]").setInputFiles({
      name: "permitted-questions.pdf",
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
    const card = page
      .locator("article")
      .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
    await expect(card).toContainText("في انتظار المراجعة");
    await page.screenshot({
      path: `docs/screenshots/community-contributions-${info.project.name}.png`,
      fullPage: false,
    });
    await bounds(page);
    await reviewer.goto(`/review/${id}`);
    const preview = await reviewer.request.get(
      `/api/review/resources/${id}/open`,
      { maxRedirects: 0 },
    );
    expect(preview.status()).toBe(302);
    const pdf = await fetch(preview.headers().location);
    expect(pdf.status).toBe(200);
    expect(
      Buffer.from(await pdf.arrayBuffer())
        .subarray(0, 5)
        .toString(),
    ).toBe("%PDF-");
    await decision(
      reviewer,
      "approved",
      "PDF bytes and the question-bank material were reviewed.",
    );
    await guest.goto(`/courses/${state.slug}/resources/${id}`);
    await guest
      .getByRole("button", { name: "اعرض الـ PDF هنا", exact: true })
      .click();
    await expect(guest.locator(".pdf-viewport")).toHaveAttribute(
      "aria-busy",
      "false",
      { timeout: 30000 },
    );
    await expect(guest.locator("canvas")).toBeVisible();
    await page.goto(`/courses/${state.slug}/submit?purpose=solve`);
    await page.getByRole("button", { name: /مجموعة تفاعلية/ }).click();
    await page.locator(".quiz-import summary").click();
    const doc = {
      ...quiz,
      title: `QA student quiz ${info.project.name} ${randomUUID().slice(0, 8)}`,
    };
    await page
      .getByLabel("أو الصق JSON", { exact: true })
      .fill(JSON.stringify(doc));
    await page
      .getByRole("button", { name: "راجع واستورد", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "استبدل واستورد" })
      .click();
    await page
      .getByRole("checkbox", { name: /عندي حق مشاركة الأسئلة/ })
      .check();
    await page
      .getByRole("button", { name: "ابعت للمراجعة", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "اتبعتت المجموعة للمراجعة",
    );
    await page
      .getByRole("link", { name: "تابع حالة المراجعة", exact: true })
      .click();
    const quizCard = page.locator("article").filter({
      has: page.getByRole("heading", { name: doc.title, exact: true }),
    });
    await expect(quizCard).toContainText("في انتظار المراجعة");
    const editLink = await quizCard
      .getByRole("link", { name: "راجع الأسئلة وعدّلها" })
      .getAttribute("href");
    const qid = editLink!.split("/")[4];
    await reviewer.goto(`/review/${qid}`);
    await reviewer
      .getByText("جرّب الأسئلة وراجع الإجابات", { exact: true })
      .click();
    await reviewer
      .getByRole("checkbox", { name: "Stack", exact: true })
      .check();
    await reviewer
      .getByRole("checkbox", { name: "Queue", exact: true })
      .check();
    await reviewer
      .getByRole("button", { name: "صحّح إجابتي", exact: true })
      .click();
    await expect(
      reviewer.getByText("إجابة صحيحة", { exact: true }),
    ).toBeVisible();
    await decision(
      reviewer,
      "approved",
      "Question text, correct keys and explanations checked.",
    );
    await guest.goto(`/courses/${state.slug}/resources/${qid}`);
    await expect(
      guest.getByRole("heading", { name: "حلّها بطريقتك" }),
    ).toBeVisible();
    const directTitle = `QA trusted browser material ${info.project.name} ${randomUUID().slice(0, 8)}`;
    await startLink(trusted, directTitle, true);
    await expect(trusted).toHaveURL(/\/resources\/[a-f0-9-]{36}$/);
    const directPath = new URL(trusted.url()).pathname;
    await page.goto(directPath);
    await page.getByRole("button", { name: /^↑ مفيد/ }).click();
    await expect(page.getByRole("button", { name: /^↑ مفيد/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.getByRole("link", { name: "اسأل دفعتك", exact: true }).click();
    await page
      .locator("input[name=title]")
      .fill("QA ordinary discussion " + randomUUID().slice(0, 8));
    await page
      .locator("textarea[name=body]")
      .fill("Can someone explain the content of this reviewed material?");
    await page
      .getByRole("button", { name: "انشر السؤال", exact: true })
      .click();
    await expect(page).toHaveURL(/\/discussions\//);
    expect(
      (await studentDb.rpc("material_access", { p_course: state.course }))
        .error,
    ).toBeNull();
  } finally {
    await reviewerContext.close();
    await trustedContext.close();
    await guestContext.close();
  }
});


test("class leader can explicitly approve their own queued material", async ({
  page,
  context,
  browser,
}, info) => {
  await login(context, 2);
  const guestContext = await browser.newContext({
    viewport: page.viewportSize()!,
    locale: "ar-EG",
  });
  try {
    const guest = await guestContext.newPage();
    const title = `QA self approval ${info.project.name} ${randomUUID().slice(0, 8)}`;
    await startLink(page, title);
    await expect(page).toHaveURL(/\/my-contributions\?submitted=/);
    const id = new URL(page.url()).searchParams.get("submitted")!;
    const card = page.locator("article").filter({
      has: page.getByRole("heading", { name: title, exact: true }),
    });
    await expect(
      card.getByRole("link", { name: "راجع الإضافة", exact: true }),
    ).toBeVisible();
    await bounds(page);
    await guest.goto(`/courses/${state.slug}/resources/${id}`);
    await expect(
      guest.getByRole("heading", { name: "الصفحة دي مش موجودة" }),
    ).toBeVisible();
    await page.goto(`/review?course=${state.course}`);
    await page
      .getByRole("link")
      .filter({ has: page.getByRole("heading", { name: title, exact: true }) })
      .click();
    await decision(page, "approved", "I checked my own source and confirm its quality.");
    await guest.goto(`/courses/${state.slug}/resources/${id}`);
    await expect(
      guest.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
  } finally {
    await guestContext.close();
  }
});
