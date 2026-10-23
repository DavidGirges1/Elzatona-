import { test, expect } from "@playwright/test";

test("original transparent branding appears beside the name and replaces the rail letter", async ({
  page,
  request,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of ["/", "/login", "/courses"]) {
    await page.goto(path);
    const mark = page.locator("a.wordmark .brand-mark").first();
    await expect(mark).toBeVisible();
    const image = mark.locator("img");
    await expect(image).toHaveAttribute("alt", "");
    await expect
      .poll(() =>
        image.evaluate(
          (node: HTMLImageElement) => node.complete && node.naturalWidth > 0,
        ),
      )
      .toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (path === "/courses" && info.project.name !== "mobile-390") {
      await expect(page.locator(".rail .brand-mark-rail img")).toBeVisible();
      await expect(page.locator(".brand-symbol")).toHaveText("");
      await expect(page.locator(".brand-symbol")).toHaveAttribute(
        "aria-label",
        "الزتونة.",
      );
    }
    if (path !== "/")
      await page.screenshot({
        path: `docs/screenshots/brand-${path.slice(1)}-${info.project.name}.png`,
        fullPage: true,
      });
  }
  const original = await request.get("/brand/elzatona-logo.png");
  expect(original.status()).toBe(200);
  expect((await original.body()).length).toBe(416165);
  expect(errors).toEqual([]);
});

test("supplied animation plays in the real suspense fallback and is removed when ready", async ({
  page,
}, info) => {
  test.skip(
    !process.env.TEST_LOADING_FIXTURE,
    "Requires the temporary local fixture installed by scripts/verify-loading.mjs.",
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/qa-loading-check", { waitUntil: "commit" });
  const loader = page.locator(".page-loading");
  await expect(loader).toBeVisible();
  await expect(loader).toHaveAttribute("role", "status");
  const player = page.locator(".page-loading-motion");
  await expect(player).toBeVisible();
  await expect(player.locator("g[data-motion]")).toHaveCount(3);
  const frame = () =>
    player.locator("g[data-motion]").evaluateAll((nodes) =>
      nodes
        .map((n) => {
          const m = (n as SVGGraphicsElement).getCTM();
          return `${m?.e},${m?.f}`;
        })
        .join("|"),
    );
  const first = await frame();
  await expect.poll(frame).not.toBe(first);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(player).not.toBeVisible();
  await expect(page.locator(".page-loading-static")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(player).toBeVisible();
  const resumed = await frame();
  await expect.poll(frame).not.toBe(resumed);
  await page.screenshot({
    path: `docs/screenshots/loading-${info.project.name}.png`,
  });
  await expect(
    page.getByRole("heading", { name: "Loading verification complete" }),
  ).toBeVisible({ timeout: 15000 });
  await expect(loader).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("reduced motion uses the static artwork without loading a player", async ({
  page,
}) => {
  test.skip(
    !process.env.TEST_LOADING_FIXTURE,
    "Requires the temporary local loading fixture.",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  const playerRequests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("lottie_light")) playerRequests.push(r.url());
  });
  await page.goto("/qa-loading-check", { waitUntil: "commit" });
  await expect(page.locator(".page-loading-static")).toBeVisible();
  await page.waitForTimeout(400);
  await expect(page.locator(".page-loading-motion")).not.toBeVisible();
  expect(playerRequests).toEqual([]);
  await expect(
    page.getByRole("heading", { name: "Loading verification complete" }),
  ).toBeVisible({ timeout: 15000 });
});
