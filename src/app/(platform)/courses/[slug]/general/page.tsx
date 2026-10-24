import { CourseArea } from "@/components/course-area";
export const metadata = { title: "ملفات المادة" };
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const page = Math.max(
    1,
    Math.min(1000, Math.trunc(Number((await searchParams).page)) || 1),
  );
  return <CourseArea slug={slug} area="general" page={page} />;
}
