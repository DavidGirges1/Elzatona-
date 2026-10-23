import { test, expect } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { readFileSync } from "node:fs";
test.use({ trace: "off" });
test("unfollowing the last course shows contextual suggestions without silently following it again", async ({
  page,
  context,
}, info) => {
  test.skip(
    !process.env.TEST_AUTH_ACCOUNTS_FILE ||
      !process.env.TEST_HOSTED_STATE_FILE ||
      info.project.name !== "mobile-390",
    "Explicit temporary hosted student/course.",
  );
  const person = JSON.parse(
    readFileSync(process.env.TEST_AUTH_ACCOUNTS_FILE!, "utf8"),
  )[1];
  const state = JSON.parse(
    readFileSync(process.env.TEST_HOSTED_STATE_FILE!, "utf8"),
  );
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
        email: person.email,
        password: person.password,
      })
    ).error,
  ).toBeNull();
  const follows = await db.from("user_courses").select("course_id");
  if (!follows.data?.some((x) => x.course_id === state.course))
    expect(
      (await db.rpc("follow_course", { p_course: state.course })).error,
    ).toBeNull();
  await context.addCookies(
    cookies.map((c) => ({
      ...c,
      url: process.env.TEST_APP_URL || "http://localhost:3000",
      sameSite: "Lax" as const,
    })),
  );
  await page.goto(`/test/courses/${state.slug}`);
  await page
    .getByRole("button", { name: "ضمن موادي · إزالة", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "ضيف لموادي", exact: true }),
  ).toBeVisible();
  await page.goto("/test/dashboard");
  await expect(
    page.getByRole("heading", { name: "لسه مضفتش موادك" }),
  ).toBeVisible();
  expect((await db.from("user_courses").select("course_id")).data).toHaveLength(
    0,
  );
  await expect(
    page.getByRole("heading", { name: "مواد جامعتك وسنتك" }),
  ).toBeVisible();
  await page.goto(`/test/courses/${state.slug}`);
  await page.getByRole("button", { name: "ضيف لموادي", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "ضمن موادي · إزالة", exact: true }),
  ).toBeVisible();
  await page.goto("/test/dashboard");
  await expect(
    page.getByRole("heading", { name: "لسه مضفتش موادك" }),
  ).toHaveCount(0);
});
