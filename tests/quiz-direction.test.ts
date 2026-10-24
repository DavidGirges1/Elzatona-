import { expect, it } from "vitest";
import {
  contentDirection,
  booleanAnswer,
  answerText,
} from "../src/lib/quiz/direction";
it.each([
  "Which data structure uses LIFO?",
  "(2) What is O(n log n)?",
  "٣. Select the correct statement.",
  "📝 Stack → Queue",
  "2 / 3",
  "2 < 10",
])("English/numeric content stays LTR: %s", (text) =>
  expect(contentDirection(text)).toBe("ltr"),
);
it.each([
  "أيّ هيكل بيانات يستخدم LIFO؟",
  "(3) اشرح الفرق بين Stack وQueue.",
  "ما قيمة x = 2؟",
])("Arabic-led content stays RTL: %s", (text) =>
  expect(contentDirection(text)).toBe("rtl"),
);
it("empty inputs inherit the question's direction without forcing English on Arabic answers", () => {
  expect(contentDirection("", "ltr")).toBe("ltr");
  expect(contentDirection(" ", "rtl")).toBe("rtl");
  expect(contentDirection("قائمة مرتبطة", "ltr")).toBe("rtl");
  expect(contentDirection("Linked list", "rtl")).toBe("ltr");
});
it("true/false answer content follows the question language", () => {
  expect(booleanAnswer(false, "Which statement is false?")).toBe("False");
  expect(booleanAnswer(true, "أيّ عبارة صحيحة؟")).toBe("صح");
});

it.each([undefined, null, [], " "])(
  "empty answer %s has a safe separate label in result review",
  (answer) => {
    expect(
      answerText(
        {
          id: "q",
          type: "mcq",
          prompt: "Pick one",
          points: 1,
          source: "",
          options: [{ id: "a", text: "Stack" }],
        },
        answer,
      ),
    ).toEqual(["من غير إجابة"]);
  },
);
it("review keeps a false boolean and chosen option text instead of mixing Arabic prefixes", () => {
  const q = {
    id: "q",
    type: "true_false" as const,
    prompt: "Is this correct?",
    points: 1,
    source: "",
  };
  expect(answerText(q, false)).toEqual(["False"]);
  expect(
    answerText({ ...q, type: "mcq", options: [{ id: "a", text: "Stack" }] }, [
      "a",
    ]),
  ).toEqual(["Stack"]);
});
