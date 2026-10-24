import { describe, it, expect } from "vitest";
import {
  normalizeUrl,
  safeNext,
  resourceSchema,
  idSchema,
  resourceTypesForPurpose,
  resourceTypes,
} from "../src/lib/validation";
describe("safe return destinations", () => {
  it.each([
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "/%2fexample.com",
    "/%252fexample.com",
    "/%255cevil.com",
    "/%5cevil.com",
    "/ok\nheader",
    "/%0dheader",
    "/%",
    "javascript:alert(1)",
  ])("rejects %s", (v) => expect(safeNext(v)).toBe("/"));
  it("preserves resource and filters", () =>
    expect(safeNext("/courses/ds/resources/123?topic=trees")).toBe(
      "/courses/ds/resources/123?topic=trees",
    ));
});
describe("source URL safety", () => {
  it.each([
    "javascript:alert(1)",
    "data:text/html,x",
    "http://example.com",
    "https://localhost/a",
    "https://127.1/a",
    "https://2130706433/a",
    "https://192.168.1.1/a",
    "https://[::1]/a",
    "https://x.local/a",
    "https://u:p@example.com",
    "https://example.com:8080/",
  ])("rejects %s", (v) => expect(() => normalizeUrl(v)).toThrow());
  it("preserves access tokens while removing tracking", () =>
    expect(
      normalizeUrl(
        "https://drive.google.com/file/d/abc?resourcekey=secret&utm_source=wa#heading",
      ),
    ).toBe("https://drive.google.com/file/d/abc?resourcekey=secret"));
  it("keeps YouTube timestamp", () =>
    expect(normalizeUrl("https://www.youtube.com/watch?v=abc&t=25")).toContain(
      "t=25",
    ));
});
it("requires sharing permission and valid topic UUID", () => {
  const input = {
    course_id: "00000000-0000-4000-8000-000000000001",
    topic_id: "",
    title: "شرح Trees",
    description: "",
    type: "video",
    external_url: "https://example.org",
  };
  expect(resourceSchema.safeParse(input).success).toBe(false);
  expect(
    resourceSchema.safeParse({ ...input, rights_confirmed: "on" }).success,
  ).toBe(true);
  expect(
    resourceSchema.safeParse({
      ...input,
      rights_confirmed: "on",
      topic_id: "another-course",
    }).success,
  ).toBe(false);
});

it("accepts existing PostgreSQL course and topic UUIDs without RFC version bits", () => {
  expect(
    idSchema.safeParse("b0000000-0000-0000-0000-000000000001").success,
  ).toBe(true);
  expect(
    resourceSchema.safeParse({
      course_id: "b0000000-0000-0000-0000-000000000001",
      topic_id: "c0000000-0000-0000-0000-000000000001",
      title: "شرح موضوع",
      description: "",
      type: "notes",
      external_url: "https://example.org",
      rights_confirmed: "on",
    }).success,
  ).toBe(true);
  for (const invalid of [
    "not-an-id",
    "b0000000-0000-0000-0000-000000000001 OR true",
    "../../private",
  ])
    expect(idSchema.safeParse(invalid).success).toBe(false);
});

it("groups sections with studying and professor sheets with solving", () => {
  expect(resourceTypesForPurpose("study")).toContain("sections");
  expect(resourceTypesForPurpose("study")).not.toContain("sheets");
  expect(resourceTypesForPurpose("solve")).toContain("sheets");
  expect(resourceTypesForPurpose("solve")).not.toContain("sections");
  expect(resourceTypesForPurpose()).toEqual(resourceTypes);
});
it.each(["sections", "sheets"])(
  "validates a %s contribution with the usual sharing requirements",
  (type) => {
    const input = {
      course_id: "00000000-0000-4000-8000-000000000001",
      topic_id: "",
      title: "A permitted material",
      description: "",
      type,
      external_url: "https://example.org/material",
      rights_confirmed: "on",
    };
    expect(resourceSchema.safeParse(input).success).toBe(true);
    expect(
      resourceSchema.safeParse({ ...input, rights_confirmed: undefined })
        .success,
    ).toBe(false);
  },
);
