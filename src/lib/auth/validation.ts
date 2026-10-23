import { z } from "zod";
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "اسم المستخدم من ٣ حروف على الأقل")
  .max(30, "حد أقصى ٣٠ حرف")
  .regex(/^[a-z][a-z0-9_]*$/, "ابدأ بحرف إنجليزي، واستخدم حروف وأرقام و _")
  .refine(
    (s) =>
      !["admin", "administrator", "support", "system", "elzatona"].includes(s),
    "الاسم ده محجوز",
  );
export const emailSchema = z
  .email("اكتب بريد إلكتروني صحيح")
  .trim()
  .toLowerCase()
  .max(254);
export const passwordSchema = z
  .string()
  .min(10, "استخدم ١٠ أحرف على الأقل")
  .max(128, "حد أقصى ١٢٨ حرف")
  .refine(
    (s) => /\p{L}/u.test(s) && /\p{N}/u.test(s),
    "استخدم حروف وأرقام مع بعض",
  );
export const signupSchema = z
  .object({
    full_name: z.string().trim().min(3, "اكتب اسمك الكامل").max(80),
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirm_password: z.string(),
  })
  .refine((s) => s.password === s.confirm_password, {
    path: ["confirm_password"],
    message: "كلمتا المرور مش متطابقتين",
  });
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "اكتب كلمة المرور").max(128),
});
export const resetSchema = z
  .object({ password: passwordSchema, confirm_password: z.string() })
  .refine((s) => s.password === s.confirm_password, {
    path: ["confirm_password"],
    message: "كلمتا المرور مش متطابقتين",
  });
export type AuthState = {
  error?: string;
  success?: string;
  errors?: Record<string, string>;
};
export function validationErrors(error: z.ZodError): AuthState {
  return {
    errors: Object.fromEntries(
      error.issues.map((i) => [String(i.path[0]), i.message]),
    ),
  };
}

export const adminUsernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z][a-z0-9_]{2,29}$/);
