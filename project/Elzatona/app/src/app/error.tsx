"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="empty">
      <h1>حصلت مشكلة في تحميل الصفحة</h1>
      <p>جرّب تاني. لو المشكلة مستمرة، ارجع بعد شوية.</p>
      <Button onClick={reset}>حاول تاني</Button>
    </section>
  );
}
