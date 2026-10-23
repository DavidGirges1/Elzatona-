"use server";
import { redirect } from "next/navigation";
import { createClient, configured, currentUser } from "@/lib/supabase/server";
import { appPath } from "@/lib/paths";
import { afterStudentLogin } from "./session";
import {
  signupSchema,
  loginSchema,
  emailSchema,
  resetSchema,
  adminUsernameSchema,
  validationErrors,
  type AuthState,
} from "./validation";
function origin() {
  return new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
    .origin;
}
const unavailable = { error: "الدخول مش متاح حاليًا. جرّب بعد شوية." };
export async function login(
  _state: AuthState,
  form: FormData,
): Promise<AuthState> {
  const p = loginSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return validationErrors(p.error);
  if (!configured()) return unavailable;
  const db = await createClient();
  const { error } = await db.auth.signInWithPassword(p.data);
  if (error)
    return {
      error:
        error.code === "email_not_confirmed"
          ? "افتح رسالة التأكيد في بريدك الأول."
          : "البريد أو كلمة المرور مش صحيحين. جرّب تاني.",
    };
  await afterStudentLogin(form.get("next"));
  return {};
}
export async function signup(
  _state: AuthState,
  form: FormData,
): Promise<AuthState> {
  const p = signupSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return validationErrors(p.error);
  if (!configured()) return unavailable;
  const db = await createClient();
  const available = await db.rpc("username_available", {
    p_username: p.data.username,
  });
  if (available.error) return unavailable;
  if (!available.data)
    return {
      errors: { username: "اسم المستخدم مستخدم بالفعل. اختار اسم تاني." },
    };
  const { data, error } = await db.auth.signUp({
    email: p.data.email,
    password: p.data.password,
    options: {
      data: { full_name: p.data.full_name, username: p.data.username },
      emailRedirectTo: `${origin()}${appPath("/auth/callback")}?next=%2Fonboarding`,
    },
  });
  if (error)
    return {
      error:
        error.code === "email_address_invalid"
          ? "راجع البريد الإلكتروني."
          : error.code === "over_email_send_rate_limit"
            ? "وصلنا لحد رسائل التأكيد. جرّب لاحقًا."
            : "إنشاء الحساب ماكملش. راجع البيانات أو جرّب تسجيل الدخول لو عندك حساب.",
    };
  if (data.session) redirect("/onboarding");
  return {
    success:
      "راجع بريدك الإلكتروني واضغط لينك تأكيد الحساب. بعد التأكيد هنكمل اختيار جامعتك وكليتك.",
  };
}
export async function forgotPassword(
  _state: AuthState,
  form: FormData,
): Promise<AuthState> {
  const p = emailSchema.safeParse(form.get("email"));
  if (!p.success) return { errors: { email: "اكتب بريد إلكتروني صحيح" } };
  if (!configured()) return unavailable;
  const db = await createClient();
  const { error } = await db.auth.resetPasswordForEmail(p.data, {
    redirectTo: `${origin()}${appPath("/auth/callback")}?next=%2Freset-password`,
  });
  if (error) return { error: "طلب الاستعادة ماكملش. جرّب بعد شوية." };
  return {
    success:
      "لو البريد مرتبط بحساب، هتوصلك رسالة آمنة لتغيير كلمة المرور. راجع الرسائل غير المرغوب فيها كمان.",
  };
}
export async function resetPassword(
  _state: AuthState,
  form: FormData,
): Promise<AuthState> {
  const p = resetSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return validationErrors(p.error);
  if (!(await currentUser()))
    return { error: "لينك الاستعادة انتهى أو مش صالح. اطلب لينك جديد." };
  const db = await createClient();
  const { error } = await db.auth.updateUser({ password: p.data.password });
  if (error)
    return {
      error:
        "تغيير كلمة المرور ماكملش. استخدم كلمة جديدة أو اطلب لينك استعادة جديد.",
    };
  await db.auth.signOut({ scope: "global" });
  redirect("/login?changed=1");
}
export async function adminLogin(
  _state: AuthState,
  form: FormData,
): Promise<AuthState> {
  const username = adminUsernameSchema.safeParse(form.get("username"));
  const password = String(form.get("password") || "");
  if (!username.success || !password || password.length > 128)
    return { error: "راجع اسم المستخدم وكلمة المرور." };
  if (!configured()) return unavailable;
  const db = await createClient();
  const { data, error } = await db.functions.invoke(
    process.env.SUPABASE_ADMIN_FUNCTION || "admin-session",
    { body: { username: username.data, password } },
  );
  if (error || !data?.session?.access_token || !data.session.refresh_token)
    return {
      error: "تعذر الدخول. راجع البيانات وصلاحية الحساب، أو جرّب لاحقًا.",
    };
  const result = await db.auth.setSession(data.session);
  const allowed = await db.rpc("is_admin");
  if (result.error || allowed.error || !allowed.data) {
    await db.auth.signOut();
    return { error: "الحساب غير مخول للإدارة." };
  }
  redirect("/admin");
}
