import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
test.use({ trace: "off" });
test("authorized password change signs out and requires the new password", async ({
  page,
  context,
}, info) => {
  test.skip(
    !process.env.TEST_AUTH_ACCOUNTS_FILE || info.project.name !== "mobile-390",
    "Explicit temporary hosted fixture; resets only the QA account password.",
  );
  const file = process.env.TEST_AUTH_ACCOUNTS_FILE!;
  const people = JSON.parse(readFileSync(file, "utf8"));
  const p = people[3];
  const cookies: { name: string; value: string }[] = [];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const db = createServerClient(url, key, {
    cookies: {
      getAll: () => [],
      setAll: (v) => {
        cookies.push(...v);
      },
    },
  });
  const login = await db.auth.signInWithPassword({
    email: p.email,
    password: p.password,
  });
  expect(login.error).toBeNull();
  await context.addCookies(
    cookies.map((c) => ({
      ...c,
      url: process.env.TEST_APP_URL || "http://localhost:3000",
      sameSite: "Lax" as const,
    })),
  );
  await page.goto("/reset-password");
  const password = p.password + "42";
  await page.locator("input[name=password]").fill(password);
  await page.locator("input[name=confirm_password]").fill(password);
  await page.getByRole("button", { name: "احفظ كلمة المرور الجديدة" }).click();
  await expect(page).toHaveURL(/\/login\?changed=1$/);
  const verify = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  expect(
    (
      await verify.auth.signInWithPassword({
        email: p.email,
        password: p.password,
      })
    ).error,
  ).not.toBeNull();
  const changed = await verify.auth.signInWithPassword({
    email: p.email,
    password,
  });
  expect(changed.error).toBeNull();
  people[3].password = password;
  writeFileSync(file, JSON.stringify(people), { mode: 0o600 });
  await verify.auth.signOut({ scope: "local" });
});
