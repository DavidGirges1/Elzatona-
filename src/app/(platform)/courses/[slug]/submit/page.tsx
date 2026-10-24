import { materialAreas, type MaterialArea } from "@/lib/placement";
import Link from "next/link";
import { materialAccess } from "@/lib/material-access";
import { pdfEnabled } from "@/lib/supabase/files";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase/server";
import { getCourse, getLectures } from "@/lib/data";
import { MaterialComposer } from "@/components/quiz/material-composer";
export const metadata = { title: "ضيف مصدر" };
export default async function SubmitPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ area?: string; lecture?: string }>;
}) {
  const { slug } = await params;
  if (!(await currentUser()))
    redirect(`/login?next=${encodeURIComponent(`/courses/${slug}/submit`)}`);
  const c = await getCourse(slug);
  if (!c) notFound();
  const access = await materialAccess(c.id);
  const { area, lecture } = await searchParams;
  const initialPlacement = materialAreas.includes(area as MaterialArea)
    ? { area: area as MaterialArea, lectures: lecture ? [lecture] : [] }
    : lecture
      ? { area: "lecture" as const, lectures: [lecture] }
      : undefined;
  const lectures = await getLectures(c.id);
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
        lectures={lectures}
        canPublish={access.can_publish}
        canSubmit={access.can_submit}
        pdfEnabled={pdfEnabled()}
        initialPlacement={initialPlacement}
      />
    </div>
  );
}
