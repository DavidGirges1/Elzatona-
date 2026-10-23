import { mkdir, copyFile, rm, access } from "node:fs/promises";
import { spawn } from "node:child_process";
const base = process.env.TEST_APP_URL || "http://localhost:3000";
if (
  process.env.VERCEL ||
  !["localhost", "127.0.0.1"].includes(new URL(base).hostname)
)
  throw new Error(
    "Loading fixture verification is local only. Use a running dev server.",
  );
const route = new URL("../src/app/qa-loading-check/", import.meta.url);
let exists = false;
try {
  await access(route);
  exists = true;
} catch {}
if (exists) throw new Error("Refusing to overwrite an existing fixture route.");
try {
  await mkdir(route);
  await copyFile(
    new URL("../tests/fixtures/delayed-loading-page.tsx", import.meta.url),
    new URL("page.tsx", route),
  );
  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        "node_modules/@playwright/test/cli.js",
        "test",
        "tests/e2e/brand-loading.spec.ts",
        "--reporter=list",
        "--output=/tmp/elzatona-brand-loading-results",
      ],
      {
        stdio: "inherit",
        env: { ...process.env, TEST_APP_URL: base, TEST_LOADING_FIXTURE: "1" },
      },
    );
    child.once("error", reject);
    child.once("exit", resolve);
  });
  if (exitCode !== 0)
    process.exitCode = typeof exitCode === "number" ? exitCode : 1;
} finally {
  await rm(route, { recursive: true, force: true });
}
