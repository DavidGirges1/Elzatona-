import { test, expect, type BrowserContext } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
const enabled =
  !!process.env.TEST_QUIZ_STATE && !!process.env.TEST_QUIZ_ACCOUNTS;
const state = enabled
  ? JSON.parse(readFileSync(process.env.TEST_QUIZ_STATE!, "utf8"))
  : {};
const people = enabled
  ? JSON.parse(readFileSync(process.env.TEST_QUIZ_ACCOUNTS!, "utf8"))
  : [];
const fixture = JSON.parse(readFileSync("tests/fixtures/quiz.json", "utf8"));
const path = () => `/courses/${state.slug}/resources/${state.quiz}`;
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
const noOverflow = async (page: import("@playwright/test").Page) =>
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
test.use({ trace: "off" });
test.beforeEach(async ({ page }) => {
  test.skip(
    !enabled,
    "Requires explicitly provisioned isolated quiz QA accounts/state.",
  );
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(30000);
});
test.setTimeout(120000);
test("guest practices all question kinds, grades and reviews without signing in", async ({
  page,
}, info) => {
  await page.goto(path());
  await expect(
    page.getByRole("heading", { name: "حلّها بطريقتك" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /تدرّب.*ابدأ التدريب/ }).click();
  await expect(page).toHaveURL(/mode=practice/);
  await noOverflow(page);
  await page.getByRole("checkbox", { name: "Stack", exact: true }).check();
  await page.getByRole("checkbox", { name: "Queue", exact: true }).check();
  await page.screenshot({
    path: `docs/screenshots/quiz-practice-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "صحّح إجابتي", exact: true }).click();
  await expect(page.getByText("إجابة صحيحة", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "التالي", exact: true }).click();
  await page.getByRole("radio", { name: "غلط", exact: true }).check();
  await page.getByRole("button", { name: "صحّح إجابتي", exact: true }).click();
  await expect(page.getByText("إجابة صحيحة", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "التالي", exact: true }).click();
  await page.getByLabel("إجابتك", { exact: true }).fill(" lifo ");
  await page.getByRole("button", { name: "صحّح إجابتي", exact: true }).click();
  await expect(page.getByText("إجابة صحيحة", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "التالي", exact: true }).click();
  await page
    .getByLabel("إجابتك", { exact: true })
    .fill("Stack: LIFO. Queue: FIFO.");
  await page.getByRole("button", { name: "صحّح إجابتي", exact: true }).click();
  await expect(page.getByText("قارن بإجابتك", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "إجابتي صحيحة", exact: true }).click();
  await page.getByRole("button", { name: "اعرض النتيجة", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "سلّم وشوف النتيجة" })
    .click();
  await expect(
    page.getByRole("heading", { name: "دي نتيجة محاولتك" }),
  ).toBeVisible();
  await expect(page.locator(".quiz-result-score")).toContainText("٥");
  await noOverflow(page);
  await page.screenshot({
    path: `docs/screenshots/quiz-results-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "المحتاج مراجعة", exact: true })
    .click();
  await expect(page.getByText("مفيش أسئلة في الاختيار ده.")).toBeVisible();
  await page.getByRole("button", { name: "حلّها تاني", exact: true }).click();
  await expect(page.locator("progress")).toHaveAttribute("value", "0");
});
test("exam retains answers across reload, flags review and withholds feedback until final submission", async ({
  page,
}, info) => {
  await page.goto(path() + "/quiz?mode=exam");
  await page.getByRole("checkbox", { name: "Stack", exact: true }).check();
  await page
    .getByRole("button", { name: "علّم للمراجعة", exact: true })
    .click();
  await page.getByRole("button", { name: "التالي", exact: true }).click();
  await page.getByRole("radio", { name: "غلط", exact: true }).check();
  await page.waitForTimeout(350);
  await page.reload();
  await page.getByRole("button", { name: "استكمل الحل", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "غلط", exact: true }),
  ).toBeChecked();
  await expect(page.locator("progress")).toHaveAttribute("value", "2");
  await page.locator(".quiz-map summary").click();
  await expect(
    page.getByRole("button", {
      name: "السؤال 1، له إجابة، للمراجعة",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "السؤال 2، له إجابة", exact: true })
    .click();
  await page.getByRole("button", { name: "التالي", exact: true }).click();
  await page.getByLabel("إجابتك", { exact: true }).fill("LIFO");
  await page.getByRole("button", { name: "التالي", exact: true }).click();
  await page.getByLabel("إجابتك", { exact: true }).fill("my own explanation");
  await expect(page.locator(".quiz-feedback")).toHaveCount(0);
  await expect(
    page.getByText(fixture.questions[3].modelAnswer, { exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: `docs/screenshots/quiz-exam-${info.project.name}.png`,
    fullPage: true,
  });
  await noOverflow(page);
  await page.getByRole("button", { name: "راجع وسلّم", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("جاوبت ٤ من ٤");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "سلّم وشوف النتيجة" })
    .click();
  await expect(
    page.getByRole("heading", { name: "باقي تقييم الإجابات الكتابية" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "أحتاج أراجع", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "دي نتيجة محاولتك" }),
  ).toBeVisible();
  await expect(page.locator(".quiz-result-score")).toContainText("٢");
  await page
    .getByRole("button", { name: "المحتاج مراجعة", exact: true })
    .click();
  await expect(page.locator(".quiz-review-question")).toHaveCount(2);
});
test("unapproved student creates and reopens a private manual draft, with publication locked", async ({
  page,
  context,
  browser,
}, info) => {
  await login(context, 1);
  await page.goto(`/courses/${state.slug}/submit`);
  await expect(
    page.getByRole("group", { name: "١. المصدر ده هيساعد في إيه؟" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /مذاكرة.*شرح/ }).click();
  await page.getByRole("button", { name: "لينك", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "إضافة المصادر للمصرّح لهم" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "غيّر نوع المصدر", exact: true })
    .click();
  await page.getByRole("button", { name: /^حل أسئلة/ }).click();
  await page.getByRole("button", { name: /مجموعة تفاعلية/ }).click();
  const title = `QA private ${info.project.name} ${randomUUID().slice(0, 8)}`;
  await page.getByLabel("اسم المجموعة", { exact: true }).fill(title);
  await page
    .getByLabel("نص السؤال", { exact: true })
    .fill("Choose the useful answer");
  await page
    .getByRole("textbox", { name: "اختيار 1", exact: true })
    .fill("Useful");
  await page
    .getByRole("textbox", { name: "اختيار 2", exact: true })
    .fill("Other");
  await page
    .getByRole("checkbox", { name: "الإجابة 1 صحيحة", exact: true })
    .check();
  await page.getByRole("button", { name: "ضيف سؤال", exact: true }).click();
  await page
    .getByRole("combobox", { name: "نوع السؤال", exact: true })
    .selectOption("true_false");
  await page.getByLabel("نص السؤال", { exact: true }).fill("Is this a stack?");
  await page
    .getByRole("combobox", { name: "الإجابة الصحيحة", exact: true })
    .selectOption("false");
  await page.getByRole("button", { name: "ضيف سؤال", exact: true }).click();
  await page
    .getByRole("combobox", { name: "نوع السؤال", exact: true })
    .selectOption("written");
  await page.getByLabel("نص السؤال", { exact: true }).fill("Write the acronym");
  await page
    .getByRole("combobox", { name: "طريقة التصحيح", exact: true })
    .selectOption("exact");
  await page.getByLabel("الإجابة النموذجية", { exact: true }).fill("LIFO");
  await page.getByLabel(/الإجابات المقبولة/).fill("LIFO\nlifo\n");
  await expect(
    page.getByRole("button", { name: "انشر لدفعتك", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "احفظ نسخة خاصة", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("اتحفظت نسخة خاصة");
  await page.screenshot({
    path: `docs/screenshots/quiz-editor-${info.project.name}.png`,
    fullPage: true,
  });
  await noOverflow(page);
  await page.getByRole("link", { name: "افتح المجموعة", exact: true }).click();
  const row = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  await row.getByRole("link", { name: "كمّل وجرّب" }).click();
  await expect(page.getByLabel("اسم المجموعة", { exact: true })).toHaveValue(
    title,
  );
  await page.getByRole("button", { name: "جرّب الأسئلة", exact: true }).click();
  await page.getByRole("radio", { name: "Useful", exact: true }).check();
  await page.getByRole("button", { name: "صحّح إجابتي", exact: true }).click();
  await expect(page.getByText("إجابة صحيحة", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "ارجع للتعديل" }).click();
  const rid = new URL(page.url()).pathname.split("/")[4];
  const guest = await browser.newContext();
  const gp = await guest.newPage();
  const response = await gp.goto(`/courses/${state.slug}/resources/${rid}`);
  expect(response?.ok()).toBe(true);
  await expect(
    gp.getByRole("heading", { name: "الصفحة دي مش موجودة" }),
  ).toBeVisible();
  expect(
    (await gp.request.get(`/api/resources/${rid}/quiz/export`)).status(),
  ).toBe(404);
  await guest.close();
});
test("approved author imports reviewed JSON, publishes, exports and guests discover it in حل", async ({
  page,
  context,
  browser,
}, info) => {
  await login(context, 0);
  await page.goto(`/courses/${state.slug}/submit?purpose=solve`);
  await page.getByRole("button", { name: /مجموعة تفاعلية/ }).click();
  await page.locator(".quiz-import summary").click();
  await page.getByLabel("أو الصق JSON", { exact: true }).fill("{bad");
  await page.getByRole("button", { name: "راجع واستورد", exact: true }).click();
  await expect(page.locator(".form-error[role=alert]")).toContainText(
    "صيغة JSON",
  );
  const doc = {
    ...fixture,
    title: `QA shared ${info.project.name} ${randomUUID().slice(0, 8)}`,
  };
  await page
    .getByLabel("أو الصق JSON", { exact: true })
    .fill(JSON.stringify(doc));
  await page.getByRole("button", { name: "راجع واستورد", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "استبدل واستورد" })
    .click();
  await expect(page.getByLabel("اسم المجموعة", { exact: true })).toHaveValue(
    doc.title,
  );
  await page.locator(".quiz-import input[type=file]").setInputFiles({
    name: "elzatona-quiz.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(doc)),
  });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "استبدل واستورد", exact: true })
    .click();

  await page.getByRole("checkbox", { name: /عندي حق مشاركة الأسئلة/ }).check();
  await page.getByRole("button", { name: "انشر لدفعتك", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("اتنشرت المجموعة");
  await page.getByRole("link", { name: "افتح المجموعة", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: doc.title, exact: true }),
  ).toBeVisible();
  const publicPath = new URL(page.url()).pathname;
  const guest = await browser.newContext({ viewport: page.viewportSize()! });
  const gp = await guest.newPage();
  await gp.goto(publicPath);
  await expect(
    gp.getByRole("heading", { name: "حلّها بطريقتك" }),
  ).toBeVisible();
  const rid = publicPath.split("/")[4];
  const exported = await gp.request.get(`/api/resources/${rid}/quiz/export`);
  expect(exported.status()).toBe(200);
  expect((await exported.json()).questions[1].answer).toBe(false);
  expect(exported.headers()["cache-control"]).toBe("private, no-store");
  await gp.goto(`/courses/${state.slug}?purpose=solve`);
  await expect(
    gp.getByRole("heading", { name: doc.title, exact: true }),
  ).toBeVisible();
  await noOverflow(gp);
  await gp.screenshot({
    path: `docs/screenshots/quiz-course-${info.project.name}.png`,
    fullPage: true,
  });
  await gp.goto(`/courses/${state.slug}?purpose=study`);
  await expect(
    gp.getByRole("heading", { name: doc.title, exact: true }),
  ).toHaveCount(0);
  await guest.close();
});
test("solve PDF and link retain their existing preview/open behavior", async ({
  page,
}) => {
  await page.goto(`/courses/${state.slug}/resources/${state.pdf}`);
  await page
    .getByRole("button", { name: "اعرض الـ PDF هنا", exact: true })
    .click();
  await expect(page.locator(".pdf-viewport")).toHaveAttribute(
    "aria-busy",
    "false",
    { timeout: 20000 },
  );
  await expect(page.locator(".pdf-viewport canvas")).toBeVisible();
  await page.goto(`/courses/${state.slug}/resources/${state.link}`);
  await expect(
    page.getByRole("heading", {
      name: "QA website question bank",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "افتح المصدر", exact: true }),
  ).toBeVisible();
});

test("grading connection failure preserves answers and allows a real retry", async ({
  page,
}) => {
  await page.goto(path() + "/quiz?mode=practice");
  await page.getByRole("checkbox", { name: "Stack", exact: true }).check();
  await page.getByRole("checkbox", { name: "Queue", exact: true }).check();
  await page.route("**/quiz?mode=practice", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({ status: 503, body: "Injected QA outage" })
      : route.continue(),
  );
  await page.getByRole("button", { name: "صحّح إجابتي", exact: true }).click();
  await expect(page.locator(".form-error[role=alert]")).toContainText(
    "إجاباتك لسه موجودة",
  );
  await expect(
    page.getByRole("checkbox", { name: "Stack", exact: true }),
  ).toBeChecked();
  await page.unroute("**/quiz?mode=practice");
  await page.getByRole("button", { name: "صحّح إجابتي", exact: true }).click();
  await expect(page.getByText("إجابة صحيحة", { exact: true })).toBeVisible();
});
