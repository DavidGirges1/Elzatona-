"use client";
import Link from "next/link";
import { useActionState, useOptimistic } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { vote } from "@/lib/actions";
import { nextVote } from "@/lib/material-preview";
import type { ActionState } from "./forms";
export function ResourceVote({
  id,
  path,
  score,
  value,
  signedIn,
  own,
}: {
  id: string;
  path: string;
  score: number;
  value: number;
  signedIn: boolean;
  own: boolean;
}) {
  const [optimistic, update] = useOptimistic(
    { score, value },
    (state, selected: number) => nextVote(state.score, state.value, selected),
  );
  const [state, action, pending] = useActionState(
    async (_state: ActionState, form: FormData) => {
      const selected = Number(form.get("vote"));
      update(selected);
      return vote(id, selected, path, {}, form);
    },
    {},
  );
  const login = `/login?next=${encodeURIComponent(path)}&intent=vote`;
  const label = (direction: number) =>
    direction === 1
      ? optimistic.value === 1
        ? "↑ مفيد · إلغاء"
        : "↑ مفيد"
      : optimistic.value === -1
        ? "↓ مش مفيد · إلغاء"
        : "↓ مش مفيد";
  const control = (direction: number) => {
    const icon =
      direction === 1 ? <ArrowUp size={21} /> : <ArrowDown size={21} />;
    return signedIn ? (
      <button
        type="submit"
        name="vote"
        value={direction}
        className={`vote-arrow ${direction === 1 ? "up" : "down"}`}
        aria-label={label(direction)}
        title={own ? "مش ممكن تصوّت على إضافتك" : label(direction)}
        aria-pressed={optimistic.value === direction}
        disabled={pending || own}
      >
        {icon}
      </button>
    ) : (
      <Link
        href={login}
        className="vote-arrow"
        aria-label={label(direction)}
        title={label(direction)}
      >
        {icon}
      </Link>
    );
  };
  const controls = (
    <>
      {control(1)}
      <output
        className="vote-score"
        aria-live="polite"
        aria-label="صافي الأصوات"
      >
        {new Intl.NumberFormat("ar-EG").format(optimistic.score)}
      </output>
      {control(-1)}
    </>
  );
  return (
    <div className="vote-control">
      <span className="sr-only">قيّم فائدة المصدر</span>
      {signedIn ? (
        <form
          action={action}
          className="vote-pill"
          aria-label="تقييم المصدر"
          aria-busy={pending}
        >
          {controls}
        </form>
      ) : (
        <div className="vote-pill" role="group" aria-label="تقييم المصدر">
          {controls}
        </div>
      )}
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
    </div>
  );
}
