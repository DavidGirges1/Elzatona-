import { beforeEach, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  rpc: vi.fn(),
  remember: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error("REDIRECT " + path);
  }),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({
  configured: () => true,
  currentUser: async () => null,
  createClient: async () => ({
    rpc: mocks.rpc,
    auth: { signUp: mocks.signUp },
  }),
}));
vi.mock("../src/lib/auth/session", () => ({ afterStudentLogin: vi.fn() }));
vi.mock("../src/lib/auth/pending-verification", () => ({
  rememberPendingEmail: mocks.remember,
}));
import { signup } from "../src/lib/auth/actions";
const form = () => {
  const f = new FormData();
  for (const [k, v] of Object.entries({
    full_name: "طالب التجربة",
    username: "verification_student",
    email: "student@example.org",
    password: "Long-password42",
    confirm_password: "Long-password42",
  }))
    f.set(k, v);
  return f;
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
});
it("successful signup requiring confirmation navigates to its own page and keeps email out of the URL", async () => {
  await expect(signup({}, form())).rejects.toThrow("REDIRECT /verify-email");
  expect(mocks.remember).toHaveBeenCalledWith("student@example.org");
  expect(mocks.redirect).toHaveBeenCalledWith("/verify-email");
});
it("a signup session goes directly to onboarding", async () => {
  mocks.signUp.mockResolvedValue({
    data: { session: { access_token: "test-only" } },
    error: null,
  });
  await expect(signup({}, form())).rejects.toThrow("REDIRECT /onboarding");
  expect(mocks.remember).not.toHaveBeenCalled();
});
it("provider failure stays on the form without implying email delivery", async () => {
  mocks.signUp.mockResolvedValue({
    data: { session: null },
    error: { code: "over_email_send_rate_limit" },
  });
  const result = await signup({}, form());
  expect(result.error).toContain("حد رسائل");
  expect(result.success).toBeUndefined();
  expect(mocks.redirect).not.toHaveBeenCalled();
  expect(mocks.remember).not.toHaveBeenCalled();
});
it("invalid signup never reaches the auth provider", async () => {
  const f = form();
  f.set("confirm_password", "wrong");
  const result = await signup({}, f);
  expect(result.errors?.confirm_password).toBeDefined();
  expect(mocks.signUp).not.toHaveBeenCalled();
});
