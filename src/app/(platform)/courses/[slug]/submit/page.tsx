import Link from "next/link";
import { materialAccess } from "@/lib/material-access";
import { pdfEnabled } from "@/lib/supabase/files";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase/server";
import { getCourse, getTopics } from "@/lib/data";
import { MaterialComposer } from "@/components/quiz/material-composer";
export const metadata = { title: "ضيف مصدر" };
export default async function SubmitPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ purpose?: string }>;
}) {
  const { slug } = await params;
  if (!(await currentUser()))
    redirect(`/login?next=${encodeURIComponent(`/courses/${slug}/submit`)}`);
  const c = await getCourse(slug);
  if (!c) notFound();
  const access = await materialAccess(c.id);
  const { purpose } = await searchParams;
  const topics = await getTopics(c.id);
  return (
    <div className="form-page">
      <Link className="breadcrumb" href={`/courses/${slug}`}>
        <bdi>{c.title_ar || c.title}</bdi> / ضيف مصدر
      </Link>
      <h1>ضيف مصدر يفيد دفعتك</h1>
      <p className="muted">
        لينك مفيد أو ملف من شغلك، وخليه سهل يتلاقى. الإضافات بتظهر بعد المراجعة،
        أو مباشرة لو حسابك مصرح له.
      </p>
      <MaterialComposer
        courseId={c.id}
        slug={slug}
        topics={topics}
        canPublish={access.can_publish}
        canSubmit={access.can_submit}
        pdfEnabled={pdfEnabled()}
        purpose={purpose}
      />
    </div>
  );
}
