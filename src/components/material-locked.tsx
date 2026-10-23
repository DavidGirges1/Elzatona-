import Link from "next/link";
import { LockKeyhole } from "lucide-react";
export function MaterialLocked({
  slug,
  edit = false,
}: {
  slug: string;
  edit?: boolean;
}) {
  return (
    <section className="panel material-locked">
      <span className="course-icon sky">
        <LockKeyhole size={24} />
      </span>
      <h1>
        {edit ? "تنظيم المصادر للمصرّح لهم" : "إضافة المصادر للمصرّح لهم"}
      </h1>
      <p className="muted">
        الإدارة بتختار الحسابات اللي تقدر تضيف وتنظّم المصادر في المرحلة
        الحالية. تقدر تتصفح وتستفيد من كل المصادر المنشورة.
      </p>
      <Link href={`/courses/${slug}`} className="button primary">
        ارجع لمصادر المادة
      </Link>
    </section>
  );
}
