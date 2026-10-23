import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { appPath } from "../src/lib/paths";
describe("Unlisted test mount", () => {
  it.each([
    ["/", "/test"],
    ["/courses", "/test/courses"],
    ["/auth/callback?next=%2Fsaved", "/test/auth/callback?next=%2Fsaved"],
    ["/api/resources/id/open", "/test/api/resources/id/open"],
  ])("prefixes native URL %s", (path, expected) =>
    expect(appPath(path)).toBe(expected),
  );
  it("preserves the exact owner-authored Coming Soon HTML from GitHub", () => {
    const bytes = readFileSync("public/coming-soon.html");
    const blob = createHash("sha1")
      .update(`blob ${bytes.length}\0`)
      .update(bytes)
      .digest("hex");
    expect(blob).toBe("992a73d57e087f5c84c716225bd6f6a23b37c57a");
  });
});
