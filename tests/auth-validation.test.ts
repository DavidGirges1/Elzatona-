import { it, expect } from "vitest";
import {
  usernameSchema,
  passwordSchema,
  signupSchema,
  adminUsernameSchema,
} from "../src/lib/auth/validation";
it.each([
  "ab",
  "admin",
  "support",
  "system",
  "1david",
  "some name",
  "مستخدم",
  "x".repeat(31),
])("rejects invalid student handle %s", (value) =>
  expect(usernameSchema.safeParse(value).success).toBe(false),
);
it("normalizes a username without changing meaningful characters", () =>
  expect(usernameSchema.parse("  David_23  ")).toBe("david_23"));
it("admin login permits a trusted provisioned handle even when reserved for students", () =>
  expect(adminUsernameSchema.parse("Admin")).toBe("admin"));
it.each(["short2", "abcdefghijk", "12345678901", "a2".repeat(65)])(
  "rejects weak or oversized password",
  (value) => expect(passwordSchema.safeParse(value).success).toBe(false),
);
it("supports mixed Arabic text and digits in a strong password", () =>
  expect(passwordSchema.safeParse("دراسة-آمنة-12345").success).toBe(true));
const valid = {
  full_name: "طالب التجربة",
  username: "student_test",
  email: "student@example.org",
  password: "Long-password42",
  confirm_password: "Long-password42",
};
it("accepts complete validated signup", () =>
  expect(signupSchema.safeParse(valid).success).toBe(true));
it("rejects mismatched confirmation at the correct field", () => {
  const r = signupSchema.safeParse({ ...valid, confirm_password: "wrong" });
  expect(r.success).toBe(false);
  if (!r.success) expect(r.error.issues[0].path).toEqual(["confirm_password"]);
});
it("rejects signup missing a full name", () =>
  expect(signupSchema.safeParse({ ...valid, full_name: "" }).success).toBe(
    false,
  ));
