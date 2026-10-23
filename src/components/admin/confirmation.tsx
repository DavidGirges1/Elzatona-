"use client";
import { useRef } from "react";
export function Confirmation({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        className="button secondary"
        onClick={() => ref.current?.showModal()}
      >
        {label}
      </button>
      <dialog className="confirm-dialog" ref={ref}>
        <h2>{title}</h2>
        <p className="muted">
          راجع البيانات والسبب قبل تأكيد القرار. العملية بتتسجل في سجل الإدارة.
        </p>
        {children}
        <button
          type="button"
          className="button ghost"
          onClick={() => ref.current?.close()}
        >
          إلغاء
        </button>
      </dialog>
    </>
  );
}
