"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck } from "lucide-react";
export function OnboardingComplete({ next }: { next: string }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setTimeout(() => router.replace(next), 2200);
    return () => clearTimeout(timer);
  }, [next, router]);
  return (
    <section className="onboarding-complete panel">
      <span className="success-orbit">
        <CircleCheck size={45} />
      </span>
      <p className="eyebrow">كده بقينا عارفين طريقك</p>
      <h1>موادك، على مقاسك.</h1>
      <p className="muted">بياناتك اتحفظت. هنودّيك دلوقتي لمكانك في الزتونة.</p>
      <Link className="button primary" href={next}>
        يلا نبدأ
      </Link>
    </section>
  );
}
