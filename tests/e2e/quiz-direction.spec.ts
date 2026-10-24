import { test, expect, type Locator, type Page } from "@playwright/test";
const enabled =
  process.env.TEST_QUIZ_DIRECTION_HARNESS === "1" &&
  !(process.env.TEST_APP_URL || "").startsWith("https://");
test.beforeEach(() =>
  test.skip(
    !enabled,
    "Local-only QA route; never deployed, no database writes.",
  ),
);
const direction = async (node: Locator, expected: "ltr" | "rtl") =>
  expect(await node.evaluate((n) => getComputedStyle(n).direction)).toBe(
    expected,
  );
const noOverflow = async (page: Page) =>
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
test("English and mixed-language questions, controls, writing and results preserve bidi layout", async ({
  page,
}, info) => {
  await page.goto("/qa-loading-check/bidi");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await direction(page.locator("html"), "rtl");
  await direction(page.locator(".quiz-prompt"), "ltr");
  const option = page.locator(".quiz-option").first();
  await direction(option, "ltr");
  expect((await option.locator("input").boundingBox())!.x).toBeLessThan(
    (await option.locator(".quiz-text").boundingBox())!.x,
  );
  for (const row of await page.locator(".quiz-option").all()) {
    const bounds = (await row.boundingBox())!,
      input = (await row.locator("input").boundingBox())!,
      text = (await row.locator(".quiz-text").boundingBox())!;
    expect(input.width).toBeLessThanOrEqual(24);
    expect(input.height).toBeLessThanOrEqual(24);
    expect(text.width).toBeGreaterThan(120);
    expect(text.x).toBeGreaterThanOrEqual(bounds.x);
    expect(text.x + text.width).toBeLessThanOrEqual(bounds.x + bounds.width);
    expect(bounds.height).toBeLessThan(200);
  }
  await option.locator("input").focus();
  await page.keyboard.press("Space");
  await expect(option.locator("input")).toBeChecked();
  await noOverflow(page);
  await page.screenshot({
    path: `docs/screenshots/quiz-english-player-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "صحّح إجابتي", exact: true }).click();
  await expect(page.getByText("إجابة صحيحة", { exact: true })).toBeVisible();
  await direction(page.locator(".quiz-feedback .quiz-answer-values p"), "ltr");
  await page.getByRole("button", { name: "التالي", exact: true }).click();
  await page.getByRole("radio", { name: "False", exact: true }).check();
  await page.getByRole("button", { name: "صحّح إجابتي", exact: true }).click();
  await direction(page.locator(".quiz-feedback .quiz-answer-values p"), "ltr");
  await page.getByRole("button", { name: "التالي", exact: true }).click();
  const written = page.getByLabel("إجابتك", { exact: true });
  await direction(written, "ltr");
  await written.fill("نص عربي داخل سؤال إنجليزي");
  await direction(written, "rtl");
  await written.fill("Each comparison halves the remaining search space.");
  await direction(written, "ltr");
  await page.getByRole("button", { name: "صحّح إجابتي", exact: true }).click();
  await direction(page.locator(".quiz-feedback .quiz-text").first(), "ltr");
  await page.getByRole("button", { name: "إجابتي صحيحة", exact: true }).click();
  await page.getByRole("button", { name: "التالي", exact: true }).click();
  await direction(page.locator(".quiz-prompt"), "ltr");
  await direction(page.locator(".quiz-option").nth(1), "rtl");
  await direction(page.locator(".quiz-option").nth(2), "ltr");
  await page
    .getByRole("radio", { name: "Array (e.g. arr[0])", exact: true })
    .check();
  await page.getByRole("button", { name: "صحّح إجابتي", exact: true }).click();
  await page.getByRole("button", { name: "التالي", exact: true }).click();
  await direction(page.locator(".quiz-prompt"), "rtl");
  const arabic = page.getByRole("radio", { name: "صح", exact: true });
  await arabic.check();
  await page.getByRole("button", { name: "صحّح إجابتي", exact: true }).click();
  await page.getByRole("button", { name: "اعرض النتيجة", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "سلّم وشوف النتيجة" })
    .click();
  await expect(
    page.getByRole("heading", { name: "دي نتيجة محاولتك" }),
  ).toBeVisible();
  await direction(
    page.locator(".quiz-review-question").first().locator("h2"),
    "ltr",
  );
  await direction(
    page
      .locator(".quiz-review-question")
      .first()
      .locator(".quiz-answer-values p")
      .first(),
    "ltr",
  );
  await direction(
    page.locator(".quiz-review-question").last().locator("h2"),
    "rtl",
  );
  await noOverflow(page);
  await page.screenshot({
    path: `docs/screenshots/quiz-english-results-${info.project.name}.png`,
    fullPage: true,
  });
});
test("English authoring and empty inputs follow English content while Arabic questions remain RTL", async ({
  page,
}, info) => {
  await page.goto("/qa-loading-check/bidi");
  await page.getByRole("button", { name: "عرض المحرّر", exact: true }).click();
  await direction(
    page.getByRole("textbox", { name: "اسم المجموعة", exact: true }),
    "ltr",
  );
  await direction(page.getByLabel("نص السؤال", { exact: true }), "ltr");
  await direction(page.locator(".quiz-edit-option").first(), "ltr");
  await noOverflow(page);
  await page.screenshot({
    path: `docs/screenshots/quiz-english-editor-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "ضيف سؤال", exact: true }).click();
  const prompt = page.getByLabel("نص السؤال", { exact: true });
  await direction(prompt, "ltr");
  await direction(
    page.getByRole("textbox", { name: "اختيار 1", exact: true }),
    "ltr",
  );
  await prompt.fill("اشرح المسألة دي");
  await direction(prompt, "rtl");
  await page
    .getByRole("textbox", { name: "اختيار 1", exact: true })
    .fill("2 / 3");
  await direction(
    page.getByRole("textbox", { name: "اختيار 1", exact: true }),
    "ltr",
  );
  await page
    .getByRole("combobox", { name: "نوع السؤال", exact: true })
    .selectOption("written");
  const model = page.getByLabel("الإجابة النموذجية", { exact: true });
  await direction(model, "rtl");
  await model.fill("Let x = 2; then f(x) = x + 1.");
  await direction(model, "ltr");
  await page
    .getByRole("combobox", { name: "طريقة التصحيح", exact: true })
    .selectOption("exact");
  await page
    .getByRole("textbox", { name: /الإجابات المقبولة/ })
    .fill("Yes\nNo");
  await direction(
    page.getByRole("textbox", { name: /الإجابات المقبولة/ }),
    "ltr",
  );
  await page.setViewportSize({ width: 360, height: 800 });
  await page.addStyleTag({ content: "html {font-size:20px !important}" });
  await noOverflow(page);
});
