import Link from "next/link";
export default function NotFound() {
  return (
    <section className="empty">
      <h1>الصفحة دي مش موجودة</h1>
      <p>المصدر ممكن يكون اتشال، أو اللينك مش كامل.</p>
      <Link href="/courses" className="button primary">
        اكتشف المواد
      </Link>
    </section>
  );
}
