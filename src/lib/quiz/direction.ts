import type { Answer, PublicQuestion } from "./schema";
export type TextDirection = "ltr" | "rtl";
/** Match first-strong text direction without letting option letters or UI labels decide it. */
export function contentDirection(
  text: string,
  fallback: TextDirection = "ltr",
): TextDirection {
  const firstLetter = text.match(/\p{L}/u)?.[0];
  if (!firstLetter) return /\p{N}/u.test(text) ? "ltr" : fallback;
  return /[\p{Script_Extensions=Arabic}\p{Script_Extensions=Hebrew}]/u.test(
    firstLetter,
  )
    ? "rtl"
    : "ltr";
}
export function booleanAnswer(value: boolean, question: string) {
  return contentDirection(question) === "rtl"
    ? value
      ? "صح"
      : "غلط"
    : value
      ? "True"
      : "False";
}

export function answerText(
  question: PublicQuestion,
  answer: Answer | undefined,
): string[] {
  if (Array.isArray(answer)) {
    const values =
      question.options
        ?.filter((o) => answer.includes(o.id))
        .map((o) => o.text) || [];
    return values.length ? values : ["من غير إجابة"];
  }
  if (typeof answer === "boolean")
    return [booleanAnswer(answer, question.prompt)];
  return [
    typeof answer === "string" && answer.trim() ? answer : "من غير إجابة",
  ];
}
