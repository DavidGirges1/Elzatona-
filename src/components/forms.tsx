"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
export type ActionState = { error?: string; success?: string };
export type FormAction = (
  state: ActionState,
  data: FormData,
) => Promise<ActionState>;
export function Submit({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "outline" | "ghost";
}) {
  const { pending } = useFormStatus();
  return (
    <Button variant={variant} disabled={pending} type="submit">
      {pending ? "جاري الحفظ…" : children}
    </Button>
  );
}
export function ActionForm({
  action,
  children,
  className,
}: {
  action: FormAction;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className={className}>
      {children}
      {state.success && (
        <p className="notice" role="status">
          {state.success}
        </p>
      )}
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
export function Share({ title }: { title: string }) {
  const [state, action] = useActionState(async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      return "اتنسخ اللينك";
    } catch {
      return "انسخ اللينك من شريط العنوان";
    }
  }, "");
  return (
    <form action={action}>
      <Button variant="outline">{state || "انسخ لينك المصدر"}</Button>
      <a
        className="button ghost"
        href={`https://wa.me/?text=${encodeURIComponent(title)}`}
        onClick={(e) => {
          e.currentTarget.href = `https://wa.me/?text=${encodeURIComponent(title + " " + location.href)}`;
        }}
        target="_blank"
        rel="noopener noreferrer"
      >
        شارك على واتساب
      </a>
    </form>
  );
}
