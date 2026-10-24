// Local-only visual/interaction harness; copied into a gitignored QA route during testing.
"use client";
import { useState } from "react";
import { Shell } from "@/components/layout/shell";
import { QuizPlayer } from "@/components/quiz/player";
import { QuizEditor } from "@/components/quiz/editor";
import { publicQuiz, type QuizDocument } from "@/lib/quiz/schema";
const doc: QuizDocument = {
  format: "elzatona.quiz",
  version: 1,
  title: "Data Structures — Practice Set 1",
  description: "English-first questions with Arabic navigation.",
  language: "en",
  aiAssisted: false,
  questions: [
    {
      id: "mc",
      type: "mcq",
      prompt:
        "(1) Which data structure uses LIFO (Last In, First Out)?\nChoose the best answer for push(x) and pop().",
      options: [
        { id: "a", text: "Stack — push(x), then pop()" },
        { id: "b", text: "Queue — first in, first out (FIFO)" },
        { id: "c", text: "Linked list: head → node → null" },
      ],
      correctOptionIds: ["a"],
      points: 1,
      explanation:
        "A stack removes the most recently inserted element. Example: push(1), push(2), pop() → 2.",
      source: "Chapter 2 — Stacks",
    },
    {
      id: "tf",
      type: "true_false",
      prompt: "(2) Binary search works on an unsorted array.",
      answer: false,
      points: 1,
      explanation: "Binary search requires sorted data.",
      source: "",
    },
    {
      id: "written",
      type: "written",
      prompt:
        "(3) Explain why a balanced binary search tree has O(log n) lookup time.",
      grading: "self",
      modelAnswer:
        "Each comparison discards about half of the remaining nodes. After k steps, n / 2^k ≈ 1, so k ≈ log₂(n).",
      acceptedAnswers: [],
      points: 1,
      explanation: "Compare the height of a balanced tree with a linear chain.",
      source: "",
    },
    {
      id: "mixed",
      type: "mcq",
      prompt: "(4) What does مصفوفة mean in English?",
      options: [
        { id: "a", text: "Array (e.g. arr[0])" },
        { id: "b", text: "قائمة مترابطة — Linked list" },
        { id: "c", text: "2 / 3" },
      ],
      correctOptionIds: ["a"],
      points: 1,
      explanation: "مصفوفة معناها Array. Example: arr[0] = 7.",
      source: "",
    },
    {
      id: "arabic",
      type: "true_false",
      prompt: "(5) هل Stack بتتبع نظام LIFO؟",
      answer: true,
      points: 1,
      explanation: "آخر عنصر يدخل هو أول عنصر يخرج (LIFO).",
      source: "",
    },
  ],
};
const quiz = publicQuiz(doc);
export default function BidiFixture() {
  const [editor, setEditor] = useState(false);
  return (
    <Shell>
      <div className="quiz-fixture">
        <div className="actions">
          <button className="button secondary" onClick={() => setEditor(false)}>
            عرض اللاعب
          </button>
          <button className="button secondary" onClick={() => setEditor(true)}>
            عرض المحرّر
          </button>
        </div>
        {editor ? (
          <QuizEditor
            initial={doc}
            courseId="00000000-0000-4000-8000-000000000001"
            slug="qa-only"
            topics={[]}
            canPublish={false}
          />
        ) : (
          <QuizPlayer
            quiz={quiz}
            localDocument={doc}
            mode="practice"
            coursePath="/courses"
          />
        )}
      </div>
    </Shell>
  );
}
