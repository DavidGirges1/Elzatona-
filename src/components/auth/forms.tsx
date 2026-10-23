"use client";
import Link from "next/link";
import { useActionState, useState, useEffect } from "react";
import { Eye, EyeOff, ArrowLeft, Check, LoaderCircle } from "lucide-react";
import {
  login,
  signup,
  forgotPassword,
  resetPassword,
  adminLogin,
} from "@/lib/auth/actions";
import {
  usernameSchema,
  passwordSchema,
  signupSchema,
  type AuthState,
} from "@/lib/auth/validation";
import { appPath } from "@/lib/paths";
function Messages({ state }: { state: AuthState }) {
  return (
    <>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="notice" role="status">
          {state.success}
        </p>
      )}
    </>
  );
}
function Password({
  name = "password",
  label = "كلمة المرور",
  newPassword = false,
  onChange,
  error,
}: {
  name?: string;
  label?: string;
  newPassword?: boolean;
  onChange?: (value: string) => void;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className="field">
      {label}
      <span className="password-control">
        <input
          name={name}
          type={show ? "text" : "password"}
          required
          maxLength={128}
          autoComplete={newPassword ? "new-password" : "current-password"}
          dir="ltr"
          onChange={(e) => onChange?.(e.target.value)}
          aria-invalid={!!error}
        />
        <button
          type="button"
          className="icon-button"
          onClick={() => setShow(!show)}
          aria-label={show ? "اخفي كلمة المرور" : "اظهر كلمة المرور"}
          aria-pressed={show}
        >
          {show ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </span>
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}
function PrimarySubmit({
  pending,
  children,
}: {
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <button className="button primary auth-submit" disabled={pending}>
      {pending ? (
        <>
          <LoaderCircle className="spin" size={18} />
          جاري التنفيذ…
        </>
      ) : (
        <>
          {children}
          <ArrowLeft size={18} />
        </>
      )}
    </button>
  );
}
export function GoogleOption({
  available,
  next = "/dashboard",
}: {
  available: boolean;
  next?: string;
}) {
  return (
    <div className="google-option">
      <span>أو كمّل بحسابك على</span>
      {available ? (
        <a
          className="google-icon"
          aria-label="كمّل بحساب Google"
          href={appPath(`/auth/login?next=${encodeURIComponent(next)}`)}
        >
          <GoogleIcon />
        </a>
      ) : (
        <>
          <button
            type="button"
            className="google-icon"
            aria-label="تسجيل Google غير متاح حاليًا"
            disabled
          >
            <GoogleIcon />
          </button>
          <small>Google مش متاح حاليًا</small>
        </>
      )}
    </div>
  );
}
function GoogleIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      width="22"
      height="22"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18v5.99h7.74c4.52-4.18 7.08-10.36 7.08-17.64Z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59A14.41 14.41 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59v-6.19H2.56A23.86 23.86 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.91-5.81l-7.74-5.99c-2.15 1.45-4.92 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
      />
    </svg>
  );
}
export function LoginForm({
  next = "/dashboard",
  admin = false,
}: {
  next?: string;
  admin?: boolean;
}) {
  const [state, action, pending] = useActionState(
    admin ? adminLogin : login,
    {},
  );
  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="next" value={next} />
      <label className="field">
        {admin ? "اسم المستخدم" : "البريد الإلكتروني"}
        <input
          name={admin ? "username" : "email"}
          type={admin ? "text" : "email"}
          autoComplete="username"
          dir="ltr"
          required
          maxLength={admin ? 30 : 254}
          placeholder={admin ? "your_admin_username" : "you@example.com"}
          aria-invalid={!!state.errors?.email}
        />
        {state.errors?.email && (
          <span className="field-error">{state.errors.email}</span>
        )}
      </label>
      <Password error={state.errors?.password} />
      {!admin && (
        <Link href="/forgot-password" className="text-link forgot-link">
          نسيت كلمة المرور؟
        </Link>
      )}
      <Messages state={state} />
      <PrimarySubmit pending={pending}>
        {admin ? "دخول الإدارة" : "تسجيل الدخول"}
      </PrimarySubmit>
    </form>
  );
}
export function SignupForm() {
  const [state, action, pending] = useActionState(signup, {});
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availability, setAvailability] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  useEffect(() => {
    const p = usernameSchema.safeParse(values.username || "");
    if (!p.success) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setAvailability("checking");
      try {
        const r = await fetch(
          appPath(`/api/auth/username?username=${encodeURIComponent(p.data)}`),
          { signal: controller.signal },
        );
        const data = await r.json();
        setAvailability(
          r.ok ? (data.available ? "available" : "taken") : "idle",
        );
      } catch {
        if (!controller.signal.aborted) setAvailability("idle");
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [values.username]);
  function validate(name: string, value: string) {
    const next = { ...values, [name]: value };
    setValues(next);
    if (name === "username") setAvailability("idle");
    const result = signupSchema.safeParse(next);
    const issue = result.success
      ? null
      : result.error.issues.find((i) => i.path[0] === name);
    setErrors((e) => ({
      ...e,
      [name]:
        name === "confirm_password"
          ? value !== next.password
            ? "كلمتا المرور مش متطابقتين"
            : ""
          : issue?.message || "",
      ...(name === "password" && next.confirm_password
        ? {
            confirm_password:
              value !== next.confirm_password
                ? "كلمتا المرور مش متطابقتين"
                : "",
          }
        : {}),
    }));
  }
  const field = (
    name: string,
    label: string,
    type = "text",
    autocomplete = "",
  ) => (
    <label className="field">
      {label}
      <input
        name={name}
        type={type}
        autoComplete={autocomplete}
        required
        maxLength={name === "full_name" ? 80 : name === "username" ? 30 : 254}
        dir={name === "full_name" ? "auto" : "ltr"}
        onChange={(e) => validate(name, e.target.value)}
        aria-invalid={!!(errors[name] || state.errors?.[name])}
      />
      {(errors[name] || state.errors?.[name]) && (
        <span className="field-error">
          {errors[name] || state.errors?.[name]}
        </span>
      )}
    </label>
  );
  return (
    <form action={action} className="auth-form">
      {field("full_name", "الاسم الكامل", "text", "name")}
      {field("username", "اسم المستخدم", "text", "username")}
      <p
        className={`username-status ${availability === "taken" ? "field-error" : ""}`}
        aria-live="polite"
      >
        {availability === "checking" ? (
          "بنتأكد من الاسم…"
        ) : availability === "available" ? (
          <>
            <Check size={15} />
            الاسم متاح
          </>
        ) : availability === "taken" ? (
          "الاسم مستخدم. اختار اسم تاني."
        ) : (
          "٣–٣٠ حرف إنجليزي أو رقم أو _؛ ابدأ بحرف."
        )}
      </p>
      {field("email", "البريد الإلكتروني", "email", "email")}
      <Password
        newPassword
        onChange={(v) => validate("password", v)}
        error={errors.password || state.errors?.password}
      />
      <div className="password-strength" aria-live="polite">
        <span
          className={
            passwordSchema.safeParse(values.password || "").success
              ? "strong"
              : ""
          }
        />
        <small>
          {passwordSchema.safeParse(values.password || "").success
            ? "كلمة المرور مناسبة"
            : "١٠ أحرف على الأقل، فيها حروف وأرقام. ماتستخدمش كلمة مرور بتستخدمها في مكان تاني."}
        </small>
      </div>
      <Password
        name="confirm_password"
        label="تأكيد كلمة المرور"
        newPassword
        onChange={(v) => validate("confirm_password", v)}
        error={errors.confirm_password || state.errors?.confirm_password}
      />
      <Messages state={state} />
      <PrimarySubmit pending={pending}>اعمل حسابك</PrimarySubmit>
      <p className="muted small">
        بإنشاء الحساب، بتوافق على{" "}
        <Link href="/guidelines" className="text-link">
          قواعد المشاركة والخصوصية
        </Link>
        .
      </p>
    </form>
  );
}
export function RecoveryForm({ reset = false }: { reset?: boolean }) {
  const [state, action, pending] = useActionState(
    reset ? resetPassword : forgotPassword,
    {},
  );
  return (
    <form action={action} className="auth-form">
      {reset ? (
        <>
          <Password newPassword error={state.errors?.password} />
          <Password
            name="confirm_password"
            label="تأكيد كلمة المرور"
            newPassword
            error={state.errors?.confirm_password}
          />
        </>
      ) : (
        <label className="field">
          البريد الإلكتروني
          <input
            name="email"
            type="email"
            required
            dir="ltr"
            autoComplete="email"
            maxLength={254}
          />
          {state.errors?.email && (
            <span className="field-error">{state.errors.email}</span>
          )}
        </label>
      )}
      <Messages state={state} />
      <PrimarySubmit pending={pending}>
        {reset ? "احفظ كلمة المرور الجديدة" : "ابعت لينك الاستعادة"}
      </PrimarySubmit>
    </form>
  );
}
