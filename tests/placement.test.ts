import { describe, it, expect } from "vitest";
import {
  placementSchema,
  typesForArea,
  lectureLabel,
  placementPath,
} from "../src/lib/placement";
const id = "89000000-0000-4000-8000-000000000001";
describe("required placement", () => {
  it.each([
    {},
    { area: "lecture", lectures: [] },
    { area: "general", lectures: [id] },
    { area: "lecture", lectures: [id, id] },
    { area: "unsure", lectures: [] },
  ])("rejects %j", (p) =>
    expect(placementSchema.safeParse(p).success).toBe(false),
  );
  it.each([
    { area: "lecture", lectures: [id] },
    { area: "general", lectures: [] },
    { area: "revision", lectures: [] },
    { area: "sections", lectures: [] },
  ])("accepts %j", (p) =>
    expect(placementSchema.safeParse(p).success).toBe(true),
  );
  it("keeps sections separate, exams in revision", () => {
    expect(typesForArea("sections")).toEqual(["sections"]);
    expect(typesForArea("lecture")).not.toContain("sections");
    expect(typesForArea("lecture")).not.toContain("past_exam");
    expect(typesForArea("revision")).toContain("past_exam");
    expect(typesForArea("general")).not.toContain("question_bank");
  });
  it("clear mixed language lecture labels and stable links", () => {
    expect(lectureLabel({ number: 3, title: "SQL Joins" })).toBe(
      "المحاضرة ٣ · SQL Joins",
    );
    expect(placementPath("db", "lecture", id)).toBe(
      `/courses/db/lectures/${id}`,
    );
  });
});
