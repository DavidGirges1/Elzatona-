import Link from "next/link";
import { redirect } from "next/navigation";
import {
  GraduationCap,
  Building2,
  ArrowRight,
  Check,
  UserRound,
} from "lucide-react";
import { AuthFrame } from "@/components/auth/frame";
import { ActionForm, Submit } from "@/components/forms";
import { OnboardingComplete } from "@/components/onboarding/complete";
import { chooseAcademicStep, chooseUsername } from "@/lib/auth/onboarding";
import { studentContext } from "@/lib/auth/session";
import { currentUser, createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validation";
export const metadata = { title: "اختار جامعتك وكليتك" };
export default async function Onboarding({
  searchParams,
}: {
  searchParams: Promise<{
    edit?: string;
    step?: string;
    next?: string;
    done?: string;
  }>;
}) {
  if (!(await currentUser())) redirect("/login?next=/onboarding");
  const db = await createClient();
  const context = await studentContext();
  if (!context?.active) redirect("/suspended");
  const s = await searchParams;
  const next = safeNext(s.next || "/dashboard");
  if (context.ready && s.done)
    return (
      <AuthFrame>
        <OnboardingComplete next={next === "/" ? "/dashboard" : next} />
      </AuthFrame>
    );
  if (context.ready && !s.edit && !s.step)
    redirect(next === "/" ? "/dashboard" : next);
  const { data: universities, error: universityError } = await db
    .from("universities")
    .select("*")
    .eq("is_active", true)
    .eq("onboarding_enabled", true)
    .order("name_ar");
  if (universityError) throw universityError;
  let step =
    s.edit === "1" ||
    s.step === "1" ||
    !universities?.some((u) => u.id === context.university_id)
      ? 1
      : !context.faculty_id || s.step === "2"
        ? 2
        : 3;
  const { data: relations, error: relationError } = context.university_id
    ? await db
        .from("university_faculties")
        .select("faculty_id")
        .eq("university_id", context.university_id)
        .eq("is_active", true)
    : { data: [], error: null };
  if (relationError) throw relationError;
  const { data: faculties, error: facultyError } = relations?.length
    ? await db
        .from("faculties")
        .select("*")
        .in(
          "id",
          relations.map((r) => r.faculty_id),
        )
        .eq("is_active", true)
        .order("name_ar")
    : { data: [], error: null };
  if (facultyError) throw facultyError;
  if (step === 3 && !faculties?.some((f) => f.id === context.faculty_id))
    step = 2;
  const { data: years, error: yearError } =
    step === 3 && context.university_id && context.faculty_id
      ? await db
          .from("academic_years")
          .select("year")
          .eq("university_id", context.university_id)
          .eq("faculty_id", context.faculty_id)
          .order("year")
      : { data: [], error: null };
  if (yearError) throw yearError;
  const identity = !context.username_claimed;
  return (
    <AuthFrame>
      <div className="onboarding-wrap">
        <div className="step-track" aria-label={`الخطوة ${step} من 3`}>
          {["الجامعة", "الكلية", "السنة الدراسية"].map((label, i) => (
            <span className={step >= i + 1 ? "current" : ""} key={label}>
              <b>{step > i + 1 ? <Check size={15} /> : i + 1}</b>
              {label}
            </span>
          ))}
        </div>
        {identity ? (
          <section className="auth-card">
            <UserRound size={28} />
            <h1>اسم يعرّف دفعتك بيك.</h1>
            <p className="muted">
              حساب Google اتربط. اختار اسم مستخدم مميز قبل ما نكمل.
            </p>
            <ActionForm action={chooseUsername}>
              <input type="hidden" name="next" value={next} />
              <label className="field">
                اسم المستخدم
                <input
                  name="username"
                  dir="ltr"
                  required
                  minLength={3}
                  maxLength={30}
                  pattern="[a-z][a-z0-9_]+"
                  autoComplete="username"
                />
                <span className="muted small">
                  حروف إنجليزي وأرقام و _؛ ابدأ بحرف.
                </span>
              </label>
              <Submit>كمّل</Submit>
            </ActionForm>
          </section>
        ) : (
          <>
            <header className="onboarding-intro">
              <p className="eyebrow">نرتّب الزتونة على طريقتك</p>
              <h1>
                {step === 1
                  ? "إنت في جامعة إيه؟"
                  : step === 2
                    ? "اختار كليتك."
                    : "إنت في سنة كام؟"}
              </h1>
              <p className="muted">
                {step === 1 ? (
                  "٣ اختيارات بسيطة، عشان توصّل لمصادر موادك بسهولة."
                ) : step === 2 ? (
                  <>
                    <bdi>{context.university}</bdi> · كليتك بتحدد المواد
                    المناسبة ليك.
                  </>
                ) : (
                  <>
                    <bdi>{context.faculty}</bdi> · هنظهرلك السنين المتاحة لكليتك
                    بس.
                  </>
                )}
              </p>
            </header>
            {step > 1 && (
              <Link
                href={`/onboarding?step=${step - 1}&next=${encodeURIComponent(next)}`}
                className="text-link"
              >
                <ArrowRight size={17} />
                غيّر {step === 2 ? "الجامعة" : "الكلية"}
              </Link>
            )}
            <ActionForm
              action={chooseAcademicStep.bind(
                null,
                step === 1 ? "university" : step === 2 ? "faculty" : "year",
              )}
              className="onboarding-form"
            >
              <input type="hidden" name="next" value={next} />
              {step > 1 && (
                <input
                  type="hidden"
                  name="university_id"
                  value={context.university_id || ""}
                />
              )}{" "}
              {step === 3 && (
                <input
                  type="hidden"
                  name="faculty_id"
                  value={context.faculty_id || ""}
                />
              )}
              <div
                className={`selection-grid ${step === 3 ? "year-grid" : ""}`}
              >
                {step === 1
                  ? universities?.map((u, i) => (
                      <label
                        className={`selection-card tone-${i % 2 === 0 ? "sky" : "lavender"}`}
                        key={u.id}
                      >
                        <input
                          type="radio"
                          name="university_id"
                          value={u.id}
                          defaultChecked={context.university_id === u.id}
                          required
                        />
                        <Building2 size={34} />
                        <strong>{u.name_ar || u.name}</strong>
                        <span dir="ltr">{u.name}</span>
                        <i>
                          <Check size={16} />
                        </i>
                      </label>
                    ))
                  : step === 2
                    ? faculties?.map((f) => (
                        <label className="selection-card" key={f.id}>
                          <input
                            type="radio"
                            name="faculty_id"
                            value={f.id}
                            defaultChecked={context.faculty_id === f.id}
                            required
                          />
                          <GraduationCap size={28} />
                          <strong>{f.name_ar}</strong>
                          <i>
                            <Check size={16} />
                          </i>
                        </label>
                      ))
                    : years?.map((y) => (
                        <label
                          className="selection-card year-card"
                          key={y.year}
                        >
                          <input
                            type="radio"
                            name="academic_year"
                            value={y.year}
                            defaultChecked={context.academic_year === y.year}
                            required
                          />
                          <b>{new Intl.NumberFormat("ar-EG").format(y.year)}</b>
                          <strong>
                            السنة{" "}
                            {[
                              "",
                              "الأولى",
                              "التانية",
                              "التالتة",
                              "الرابعة",
                              "الخامسة",
                              "السادسة",
                            ][y.year] || y.year}
                          </strong>
                          <i>
                            <Check size={16} />
                          </i>
                        </label>
                      ))}
              </div>
              {(step === 1 && !universities?.length) ||
              (step === 2 && !faculties?.length) ||
              (step === 3 && !years?.length) ? (
                <p className="notice">
                  الاختيارات دي لسه بتتجهز. جرّب جامعة أو كلية تانية، أو ارجع
                  بعد شوية.
                </p>
              ) : (
                <Submit>{step === 3 ? "جاهز · افتح موادي" : "كمّل"}</Submit>
              )}
            </ActionForm>
            <p className="onboarding-note muted">
              تقدر تغيّر بياناتك الدراسية بعدين من حسابك.
            </p>
          </>
        )}
      </div>
    </AuthFrame>
  );
}
