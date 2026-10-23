import { test, expect, type BrowserContext } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { readFileSync } from "node:fs";
const enabled =
  !!process.env.TEST_PREVIEW_STATE && !!process.env.TEST_PREVIEW_ACCOUNTS;
const state = enabled
  ? JSON.parse(readFileSync(process.env.TEST_PREVIEW_STATE!, "utf8"))
  : {};
const people = enabled
  ? JSON.parse(readFileSync(process.env.TEST_PREVIEW_ACCOUNTS!, "utf8"))
  : [];
const url = (id: string) => `/courses/${state.slug}/resources/${id}`;
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
  const { error } = await db.auth.signInWithPassword({
    email: people[index].email,
    password: people[index].password,
  });
  expect(error).toBeNull();
  await context.addCookies(
    cookies.map((cookie) => ({
      ...cookie,
      url: process.env.TEST_APP_URL || "http://localhost:3000",
      sameSite: "Lax" as const,
    })),
  );
}
test.use({ trace: "off" });
test.describe("focused materials with real Supabase", () => {
  test.skip(
    !enabled,
    "Requires explicitly provisioned temporary preview QA fixtures.",
  );
  test.setTimeout(60000);
  test("guest watches inline without eager YouTube requests or leaving the page", async ({
    page,
  }, info) => {
    const requests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("youtube")) requests.push(request.url());
    });
    await page.goto(url(state.video));
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "اختبار معاينة الفيديو",
    );
    expect(requests).toHaveLength(0);
    await expect(page.locator("iframe")).toHaveCount(0);
    await page
      .getByRole("button", { name: "شاهد الفيديو هنا", exact: true })
      .click();
    await expect(page.locator("iframe")).toHaveAttribute(
      "src",
      /youtube-nocookie\.com\/embed\/sO6VGgBHppo\?rel=0&playsinline=1&start=5/,
    );
    await expect(page.locator("iframe")).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(url(state.video));
    await page.screenshot({
      path: `docs/screenshots/material-video-${info.project.name}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("link", { name: "↑ مفيد", exact: true }).click();
    await expect(page).toHaveURL(/\/login\?.*intent=vote/);
  });
  test("guest reads actual PDF, changes pages, zooms, enters/exits fullscreen and shares", async ({
    page,
  }, info) => {
    await page.goto(url(state.pdf));
    await page
      .getByRole("button", { name: "اعرض الـ PDF هنا", exact: true })
      .click();
    await expect(page.getByText("صفحة ١ من ٢", { exact: true })).toBeVisible({
      timeout: 30000,
    });
    await expect(page.locator(".pdf-viewport")).toHaveAttribute(
      "aria-busy",
      "false",
      { timeout: 30000 },
    );
    expect(
      await page
        .locator("canvas")
        .evaluate((c) => (c as HTMLCanvasElement).width),
    ).toBeGreaterThan(100);
    await page
      .getByRole("button", { name: "الصفحة التالية", exact: true })
      .click();
    await expect(page.getByText("صفحة ٢ من ٢", { exact: true })).toBeVisible();
    await expect(page.locator(".pdf-viewport")).toHaveAttribute(
      "aria-busy",
      "false",
    );
    await page.getByRole("button", { name: "تكبير", exact: true }).click();
    await expect(page.getByText("125%", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "ملء الشاشة", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "إنهاء ملء الشاشة" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "إنهاء ملء الشاشة" }).click();
    await page.getByRole("button", { name: "تصغير", exact: true }).click();
    await page.locator(".resource-share summary").click();
    await expect(
      page.getByRole("button", { name: "انسخ لينك المصدر" }),
    ).toBeVisible();
    await page.locator(".resource-share summary").click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `docs/screenshots/material-pdf-${info.project.name}.png`,
      fullPage: true,
    });
    const download = await page.request.get(
      `/api/resources/${state.pdf}/open`,
      { maxRedirects: 0 },
    );
    expect(download.status()).toBe(302);
    const file = await fetch(download.headers().location);
    expect(file.status).toBe(200);
    expect(
      Buffer.from(await file.arrayBuffer())
        .subarray(0, 5)
        .toString(),
    ).toBe("%PDF-");
  });
  test("reader votes toggle, switch and persist using the real server action", async ({
    page,
    context,
  }) => {
    await login(context, 1);
    await page.goto(url(state.video));
    await expect(page.locator(".vote-score")).toHaveText("٠");
    await page.getByRole("button", { name: "↑ مفيد", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "↑ مفيد · إلغاء", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".vote-pill")).toHaveAttribute(
      "aria-busy",
      "false",
    );
    await page.reload();
    await expect(page.locator(".vote-score")).toHaveText("١");
    await page.getByRole("button", { name: "↓ مش مفيد", exact: true }).click();
    await expect(page.locator(".vote-pill")).toHaveAttribute(
      "aria-busy",
      "false",
    );
    await expect(page.locator(".vote-score")).toHaveText("؜-١");
    await page
      .getByRole("button", { name: "↓ مش مفيد · إلغاء", exact: true })
      .click();
    await expect(page.locator(".vote-pill")).toHaveAttribute(
      "aria-busy",
      "false",
    );
    await expect(page.locator(".vote-score")).toHaveText("٠");
  });
  test("author cannot vote on own contribution", async ({ page, context }) => {
    await login(context, 0);
    await page.goto(url(state.video));
    await expect(
      page.getByRole("button", { name: "↑ مفيد", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "↓ مش مفيد", exact: true }),
    ).toBeDisabled();
  });
  test("failed PDF preview has retry and direct file fallback", async ({
    page,
  }) => {
    await page.route(`**/api/resources/${state.pdf}/preview`, (route) =>
      route.fulfill({ status: 503, body: "Unavailable" }),
    );
    await page.goto(url(state.pdf));
    await page
      .getByRole("button", { name: "اعرض الـ PDF هنا", exact: true })
      .click();
    await expect(page.locator(".preview-message[role=alert]")).toContainText(
      "المعاينة ما اتحمّلتش",
      { timeout: 30000 },
    );
    await expect(page.getByRole("button", { name: "حاول تاني" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "افتح الـ PDF", exact: true }),
    ).toBeVisible();
    await page.unroute(`**/api/resources/${state.pdf}/preview`);
    await page.getByRole("button", { name: "حاول تاني" }).click();
    await expect(page.getByText("صفحة ١ من ٢", { exact: true })).toBeVisible({
      timeout: 30000,
    });
  });
});
