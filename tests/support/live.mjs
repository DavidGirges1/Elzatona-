import { createClient } from "@supabase/supabase-js";
import { randomUUID, randomBytes } from "node:crypto";
export const apiUrl =
  process.env.TEST_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
export const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const secret = process.env.SUPABASE_SECRET_KEY;
export function liveConfig() {
  if (!apiUrl || !publishable || !secret)
    throw new Error("Missing Supabase test configuration");
  if (process.env.TEST_ALLOW_WRITES !== "1")
    throw new Error("Set TEST_ALLOW_WRITES=1 for the isolated test project");
  return { apiUrl, publishable, secret };
}
export function client(key = publishable) {
  return createClient(apiUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
export async function fixtures() {
  liveConfig();
  const admin = client(secret);
  const run = randomUUID().slice(0, 8);
  const password = randomBytes(24).toString("hex");
  const people = [];
  for (const [index, name] of [
    "طالب التجربة أ",
    "طالبة التجربة ب",
    "مشرف التجربة",
  ].entries()) {
    const email = `elzatona-${run}-${index}@example.test`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, username: `qa_${run}_${index}` },
    });
    if (error) throw error;
    const db = client();
    const login = await db.auth.signInWithPassword({ email, password });
    if (login.error) throw login.error;
    people.push({ id: data.user.id, email, password, name, db });
  }
  const university = randomUUID();
  const faculty = randomUUID();
  const course = randomUUID();
  const otherCourse = randomUUID();
  const topic = randomUUID();
  const slug = `qa-ds-${run}`;
  let result = await admin.from("universities").insert({
    id: university,
    slug: `qa-${run}`,
    name: "Verification University — Fictional",
    name_ar: "جامعة تجريبية · بيانات اختبار",
  });
  if (result.error) throw result.error;
  result = await admin.from("faculties").insert({
    id: faculty,
    slug: `qa-faculty-${run}`,
    name: "QA Faculty",
    name_ar: "كلية اختبار",
  });
  if (result.error) throw result.error;
  result = await admin
    .from("university_faculties")
    .insert({ university_id: university, faculty_id: faculty });
  if (result.error) throw result.error;
  result = await admin
    .from("academic_years")
    .insert({ university_id: university, faculty_id: faculty, year: 1 });
  if (result.error) throw result.error;
  for (const person of people) {
    const r = await person.db.rpc("set_academic_context", {
      p_university: university,
      p_faculty: faculty,
      p_year: 1,
    });
    if (r.error) throw r.error;
  }
  result = await admin.from("courses").insert([
    {
      id: course,
      university_id: university,
      faculty_id: faculty,
      year_level: 1,
      slug,
      code: `QA-${run}`,
      title: "هياكل البيانات",
      title_ar: "هياكل البيانات",
      title_en: "Data Structures",
      department: "QA demo only",
      department_ar: "حوسبة · مادة تجريبية",
      description: "بيانات اختبار واضحة، وليست مادة تابعة لجامعة حقيقية.",
    },
    {
      id: otherCourse,
      university_id: university,
      faculty_id: faculty,
      year_level: 1,
      slug: `qa-db-${run}`,
      code: `QB-${run}`,
      title: "قواعد البيانات",
      title_ar: "قواعد البيانات",
      title_en: "Database Systems",
      department: "QA demo only",
      department_ar: "حوسبة · مادة تجريبية",
    },
  ]);
  if (result.error) throw result.error;
  result = await admin.from("topics").insert({
    id: topic,
    course_id: course,
    title: "Binary Trees",
    title_ar: "المحاضرة ٤ · Binary Trees",
  });
  if (result.error) throw result.error;
  result = await admin
    .from("user_roles")
    .insert({ user_id: people[2].id, role: "admin" });
  if (result.error) throw result.error;
  const { data: resource, error } = await people[0].db.rpc("submit_resource", {
    p_course: course,
    p_topic: topic,
    p_title: "شرح Binary Trees — مصدر تجريبي للمراجعة",
    p_description:
      "رابط عام لشرح هياكل البيانات. هذا سجل اختبار للواجهة والصلاحيات، وليس ملخصًا لجامعة حقيقية.",
    p_type: "reference",
    p_url: `https://developer.mozilla.org/en-US/docs/Glossary/Tree?qa=${run}`,
    p_rights: true,
    p_ai: false,
  });
  if (error) throw error;
  result = await people[2].db.rpc("set_highlight", {
    p_course: course,
    p_resource: resource,
    p_position: 1,
    p_note: "اختيار لاختبار الواجهة فقط",
  });
  if (result.error) throw result.error;
  return {
    admin,
    people,
    university,
    faculty,
    course,
    otherCourse,
    topic,
    slug,
    resource,
    run,
  };
}
export function minimalPdf() {
  return Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n",
  );
}
