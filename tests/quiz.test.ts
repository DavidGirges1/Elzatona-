import { describe, expect, it } from "vitest";
import { exampleQuiz, conversionPrompt } from "../src/lib/quiz/example";
import {
  importQuiz,
  quizDraftSchema,
  quizPublishSchema,
  publicQuiz,
  previewGrade,
  hasAnswer,
  submittedAnswersSchema,
  MAX_QUIZ_BYTES,
} from "../src/lib/quiz/schema";
const copy = () => structuredClone(exampleQuiz);
describe("portable question sets", () => {
  it("round-trips all three question kinds and strips no unsupported fields silently", () => {
    expect(importQuiz(JSON.stringify(exampleQuiz))).toEqual(exampleQuiz);
    expect(
      quizDraftSchema.safeParse({ ...exampleQuiz, unknown: true }).success,
    ).toBe(false);
  });
  it("accepts markdown fenced JSON and provides a useful syntax error", () => {
    expect(
      importQuiz("```json\n" + JSON.stringify(exampleQuiz) + "\n```"),
    ).toEqual(exampleQuiz);
    expect(() => importQuiz("{")).toThrow("صيغة JSON");
  });
  it("rejects future versions and foreign formats", () => {
    expect(
      quizDraftSchema.safeParse({ ...exampleQuiz, version: 2 }).success,
    ).toBe(false);
    expect(
      quizDraftSchema.safeParse({ ...exampleQuiz, format: "quiz" }).success,
    ).toBe(false);
  });
  it("keeps incomplete AI imports as drafts, never publishes unknown answers", () => {
    const d = copy();
    const q = d.questions[0];
    if (q.type === "mcq") q.correctOptionIds = null;
    expect(quizDraftSchema.safeParse(d).success).toBe(true);
    expect(quizPublishSchema.safeParse(d).success).toBe(false);
  });
  it("rejects duplicate question IDs, option IDs and invalid keys", () => {
    let d = copy();
    d.questions[1].id = d.questions[0].id;
    expect(quizDraftSchema.safeParse(d).success).toBe(false);
    d = copy();
    const q = d.questions[0];
    if (q.type === "mcq") {
      q.options[1].id = q.options[0].id;
      expect(quizDraftSchema.safeParse(d).success).toBe(false);
      q.options[1].id = "b";
      q.correctOptionIds = ["missing"];
      expect(quizDraftSchema.safeParse(d).success).toBe(false);
    }
  });
  it("requires question text, options and model answers at publication", () => {
    for (const mutate of [
      (d: ReturnType<typeof copy>) => {
        d.questions[0].prompt = " ";
      },
      (d: ReturnType<typeof copy>) => {
        const q = d.questions[0];
        if (q.type === "mcq") q.options[0].text = "";
      },
      (d: ReturnType<typeof copy>) => {
        const q = d.questions[2];
        if (q.type === "written") q.modelAnswer = "";
      },
    ]) {
      const d = copy();
      mutate(d);
      expect(quizPublishSchema.safeParse(d).success).toBe(false);
    }
  });
  it("bounds number, bytes, text and points", () => {
    expect(
      quizDraftSchema.safeParse({ ...exampleQuiz, questions: [] }).success,
    ).toBe(false);
    expect(
      quizDraftSchema.safeParse({
        ...exampleQuiz,
        questions: Array(101).fill(exampleQuiz.questions[0]),
      }).success,
    ).toBe(false);
    expect(() => importQuiz(" ".repeat(MAX_QUIZ_BYTES + 1))).toThrow("٢٥٦");
    const d = copy();
    d.questions[0].points = 0;
    expect(quizDraftSchema.safeParse(d).success).toBe(false);
    d.questions[0].points = 1;
    d.questions[0].prompt = "a".repeat(3001);
    expect(quizDraftSchema.safeParse(d).success).toBe(false);
  });
  it("requires accepted exact written answers, allows self assessment", () => {
    const d = copy(),
      q = d.questions[2];
    if (q.type !== "written") throw Error();
    q.grading = "exact";
    q.acceptedAnswers = [];
    expect(quizPublishSchema.safeParse(d).success).toBe(false);
    q.grading = "self";
    expect(quizPublishSchema.safeParse(d).success).toBe(true);
  });
  it("projects player questions without any answer key or explanation", () => {
    const text = JSON.stringify(publicQuiz(exampleQuiz));
    for (const key of [
      "correctOptionIds",
      "answer",
      "modelAnswer",
      "acceptedAnswers",
      "explanation",
    ])
      expect(text).not.toContain('"' + key + '"');
  });
  it("treats false as an answer, and whitespace/empty lists as unanswered", () => {
    expect(hasAnswer(false)).toBe(true);
    for (const a of [null, undefined, " ", []])
      expect(hasAnswer(a)).toBe(false);
  });
  it("grades multi-choice as sets, false booleans, exact normalized answers and self assessment", () => {
    const d = copy();
    const mc = d.questions[0],
      tf = d.questions[1],
      w = d.questions[2];
    if (mc.type !== "mcq" || tf.type !== "true_false" || w.type !== "written")
      throw Error();
    mc.correctOptionIds = ["a", "b"];
    tf.answer = false;
    w.grading = "exact";
    w.acceptedAnswers = ["Hello World"];
    expect(
      previewGrade(d, [
        { id: mc.id, answer: ["b", "a"] },
        { id: tf.id, answer: false },
        { id: w.id, answer: " hello   WORLD " },
      ]).map((q) => q.status),
    ).toEqual(["correct", "correct", "correct"]);
    w.grading = "self";
    expect(
      previewGrade(d, [{ id: w.id, answer: "my explanation" }])[0].status,
    ).toBe("self");
    expect(previewGrade(d, [{ id: mc.id, answer: ["a"] }])[0].status).toBe(
      "incorrect",
    );
  });
  it("validates attempted question IDs and counts", () => {
    expect(
      submittedAnswersSchema.safeParse([
        { id: "q1", answer: false },
        { id: "q1", answer: null },
      ]).success,
    ).toBe(false);
    expect(submittedAnswersSchema.safeParse([]).success).toBe(false);
  });
  it("conversion prompt preserves source and forbids fabricated unknown keys", () => {
    expect(conversionPrompt).toContain("elzatona.quiz");
    expect(conversionPrompt).toContain("null");
    expect(conversionPrompt).toContain("١٠٠");
  });
});

it.each(["__proto__", "constructor", "toString"])(
  "rejects reserved imported identifier %s",
  (id) => {
    const d = copy();
    d.questions[0].id = id;
    expect(quizDraftSchema.safeParse(d).success).toBe(false);
  },
);
