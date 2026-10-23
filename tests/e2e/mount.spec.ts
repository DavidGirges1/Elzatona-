import { test, expect } from "@playwright/test";
const mount = process.env.NEXT_PUBLIC_BASE_PATH ?? "/test";
const at = (path: string) => mount + (path === "/" ? "" : path);
test("test mount keeps links, native search and assets inside the platform", async ({
  page,
}) => {
  await page.goto(at("/"));
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator("meta[name=robots]")).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  await expect(page.locator("a.wordmark")).toHaveAttribute(
    "href",
    mount || "/",
  );
  await page
    .getByRole("textbox", { name: "بتدوّر على ملخص، امتحان، أو شرح؟" })
    .fill("هياكل");
  await page.getByRole("button", { name: "بحث", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${mount}/courses\\?q=`));
  await expect(page.locator("h1")).toHaveText("اكتشف المواد");
});
test("auth gates and callback failures retain the mount and safe destination", async ({
  page,
  request,
}) => {
  await page.goto(at("/saved"));
  await expect(page).toHaveURL(new RegExp(`${mount}/login\\?next=/saved`));
  const invalid = await request.get(
    at("/auth/callback?next=https%3A%2F%2Fevil.example"),
    { maxRedirects: 0 },
  );
  expect(invalid.status()).toBe(307);
  expect(new URL(invalid.headers().location).pathname).toBe(at("/login"));
  const noProvider = await request.get(at("/auth/login?next=%2Fsaved"), {
    maxRedirects: 0,
  });
  expect(noProvider.status()).toBe(307);
  expect(new URL(noProvider.headers().location).pathname).toBe(at("/login"));
});
