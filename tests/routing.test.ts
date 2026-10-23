import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { appPath } from "../src/lib/paths";
describe("Official root-domain routing", () => {
  it.each([
    ["/", "/"],
    ["/courses", "/courses"],
    ["/auth/callback?next=%2Fsaved", "/auth/callback?next=%2Fsaved"],
    ["/api/resources/id/open", "/api/resources/id/open"],
  ])("keeps native URL at the root: %s", (path, expected) =>
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
