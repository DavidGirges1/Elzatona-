# Elzatona implementation status

Updated **23 October 2026 UTC**. Current phase: **expanded authentication, academic onboarding and administration verified locally against real Supabase; GitHub/Vercel rollout in progress**.

Owner confirmed: **keep Coming Soon at `/`; all new development under `/test`**. `/test` is an unlisted public URL, not access control. Original instructions, design pack, uploaded ZIP and the full new request are retained under `docs/owner-instructions`, `docs/original-design-pack`, `docs/specification` and `docs/original-attachments`.

## Current functionality and verification boundaries

| Area                                                            | Implemented | Embedded/local verification                                                             | Actual hosted Supabase                                                                   | New Vercel deployment           |
| --------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------- |
| Arabic landing, RTL, existing typography/tokens, reduced motion | Yes         | Screenshots/keyboard/360–1440px                                                         | Live-backed catalog links                                                                | Pending rollout                 |
| Email/password login, sessions, logout                          | Yes         | Real browser login                                                                      | Confirmed temporary Auth accounts                                                        | Pending rollout                 |
| Signup/full name/unique username/live validation                | Yes         | Validation + trigger + browser availability checks                                      | Auth rejects reserved example.com test address; **real-inbox confirmation not verified** | Pending rollout                 |
| Password reset/change                                           | Yes         | Authenticated reset form updates real password, signs out; old password fails/new works | Actual password update verified; **recovery email/token delivery unverified**            | Pending rollout                 |
| Google secondary icon + PKCE callbacks                          | Yes         | Truthful disabled state/safe callback failure                                           | Provider reports **disabled**                                                            | Cannot claim Google login works |
| Resumable university → faculty → year onboarding                | Yes         | Browser completion, resume and edit                                                     | Actual persisted contexts and valid configuration                                        | Pending rollout                 |
| Course matching and explicit saved courses                      | Yes         | Contextual empty state/follow-unfollow browser tests                                    | Database context predicates and private follows                                          | Pending rollout                 |
| Separate admin username/password login                          | Yes         | Real browser login and console pages                                                    | Managed function + Auth + verified role                                                  | Pending rollout                 |
| University/faculty/year/course management                       | Yes         | Actual forms create options; new seventh year appears in onboarding                     | Normalized constraints, audit and real rows                                              | Pending rollout                 |
| Users search/filter/pagination/suspend/reactivate               | Yes         | Search, confirmation, suspension/reactivation browser journey                           | Live account status blocks existing sessions                                             | Pending rollout                 |
| Resource contribution/votes/reports/moderation                  | Yes         | Complete student → other student → admin browser journey                                | Actual rows and denied ownership changes                                                 | Pending rollout                 |
| Private PDF upload/publication/download/admin review            | Yes         | Real file through form; guest downloads exact bytes; admin hide/review                  | Actual Storage/functions/RLS; 60-second signed attachments                               | Pending rollout                 |
| Actual metrics, interactive chart and private audit             | Yes         | Console renders, chart switches, real event counts                                      | Coarse page events, admin-only aggregates/audit                                          | Pending rollout                 |

**Not launch-ready.** Suitable for developer review after rollout; ordinary student invitations still require verified email delivery and initial admin/content setup. Google remains a separate external configuration task. No default admin password exists.

## Exact checks completed

- `npm run typecheck`: passed, strict TypeScript.
- `npm run lint`: passed, zero errors/warnings.
- `npm test`: **152 passed, 7 files, 5.80 seconds**. Includes fresh application of **8 migrations** against embedded PostgreSQL, existing resource/community/Storage RLS protections, username rules, academic foreign keys, role spoofing/admin denial, private user emails, suspension, analytics deduplication and current academic checks at privileged PDF finalization.
- Complete Node 24 production build: passed. Standard Next.js App Router output; no TypeScript error suppression. Docker is only this environment's listener/proxy workaround.
- Hosted API suite: **18/18 passed** in `tests/academic-hosted.mjs`: password sessions, partial context persistence, invalid years, private admin RPC denial, managed username login, bad credentials, actual course matching, link publication, PDF upload/download/hide/admin review, suspension/reactivation, metrics with an incomplete academic year.
- Browser suite `academic.spec.ts` + `mount.spec.ts`: **50 passed, 4 intentionally skipped duplicate write journeys, 1.8 minutes**, against the owner's hosted backend through the local production app. Thirty real screenshots at **390/768/1440px**, JavaScript errors checked, RTL and overflow checked.
- Full admin-create → dynamic onboarding (including year 7) → course → real PDF form upload → guest exact-byte download → other-student vote → report → admin hide → suspension/reactivation browser journey: **1 passed, 43.6 seconds**.
- Authenticated password-change browser journey: **1 passed, 4.5 seconds**. This verifies a password update, **not email delivery**.
- Last-course unfollow/refollow browser regression: **1 passed, 9.2 seconds**. Zero follows shows contextual suggestions, not silently re-followed courses.
- 360px/reduced-motion/keyboard preview, safe callback failure and enlarged text checks: **3 passed, 7 unconfigured-only tests skipped, 9.7 seconds**. Enlarged base text is browser emulation; no actual Android system-font or WhatsApp-device test is claimed.
- Total successful local production-browser checks across these runs: **56**. Skipped tests are explicit, not counted as passes.
- Hosted catalog audit: **24 public tables, zero without RLS**.

Earlier exploratory failures were fixed: missing `/test` on an API authorization redirect (now explicit 401/403), live password-confirmation validation with other fields empty, saved-course last-unfollow behavior and consistent admin student distributions. QA harness issues (global session signout, outdated button labels, direct external request without proxy, non-void test cookie callbacks) were corrected. The passing results above are the later runs. Exploratory failures are not claimed as successful checks.

## Hosted migration/function record

Existing project: **Elzatona**, `osakdzaxqvlcrfpwrjul`, PostgreSQL 17. No reset or destructive schema replacement was performed. The old three courses/seventeen topics remain; their academic attribution is not invented.

| Source migration                                 | Actual hosted version                         |
| ------------------------------------------------ | --------------------------------------------- |
| `20261023013635_academic_identity_and_admin.sql` | `20261023021121`                              |
| `20261023022342_admin_metric_consistency.sql`    | `20261023022501`                              |
| `20261023023558_pdf_academic_authorization.sql`  | Applied via MCP; see hosted migration history |

Earlier core/storage files were imported under hosted `20261022223225`/`20261022223257`; other earlier hardening migrations retain their documented versions. Do not blindly reset or `db push` the existing shared project. On a new project, apply source migrations in filename order.

- `admin-session`: **ACTIVE v1**, authenticates username/password through Supabase Auth and a confirmed live admin role.
- `resource-files`: **ACTIVE v2**, public published-only open, authenticated owner finalization, confirmed active admin review. JWT gateway verification is intentionally disabled because each protected action verifies identity inside the handler; public opening requires no signup.
- No project secret/service key was exported into the app or Vercel. Functions use Supabase-managed credentials.
- Seeded onboarding options: Capital University and Beni Suef University; configurable common faculties/years. Actual university curricula need owner review. No fake course/resource content is seeded for students.

## Configuration, security and remaining owner work

See [AUTH_ADMIN_SETUP.md](AUTH_ADMIN_SETUP.md) for exact steps, redirects, SMTP, Google and initial admin SQL. [AUTH_ADMIN_PLAN.md](AUTH_ADMIN_PLAN.md) records scope decisions; [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) records architecture.

1. Configure a verified SMTP sender, then test signup → actual inbox → verification → onboarding and forgotten password → actual inbox → reset. Supabase Email is enabled and autoconfirm is false; a reserved example.com probe was rejected with `email_address_invalid`, which does **not** establish deliverability to a real student.
2. Configure Google Cloud OAuth client and enable Supabase Google if desired. The current MCP has no Auth-provider configuration endpoint and cannot create Google secrets. Put them in Supabase settings, never chat/source. Exact callback: `https://osakdzaxqvlcrfpwrjul.supabase.co/auth/v1/callback`.
3. Verify Supabase redirect allowlist includes `https://elzatona.tech/test/auth/callback` and `http://localhost:3000/test/auth/callback`; Site URL should be `https://elzatona.tech/test`. Cross-device email token-hash templates are documented.
4. Create/verify your own account, run owner-only `provision_admin` in Supabase SQL Editor, then use `/test/admin/login`. No permanent administrator has been fabricated for you.
5. Review faculty/year configuration; assign correct contexts to real pilot courses and add permissioned content before student tests.
6. Enable Supabase leaked-password protection where available. Security advisors flag it disabled. Other advisor warnings are deliberate guarded SECURITY DEFINER RPC exposure; four RLS/no-policy tables are intentionally browser-inaccessible internal stores. No direct writable private tables are opened to silence warnings.
7. Set documented analytics/budget retention maintenance, publish a takedown contact, and assign moderation ownership. Analytics includes internal QA and bots; page views are not unique students.
8. Test on an actual budget Android and a WhatsApp-shared link, including real email/Google consent where configured. Arrange 5–10 student usability tests only after signup delivery and meaningful course content are confirmed.

Local preview: **http://localhost:3000/test** while the preview container is running. Root Coming Soon is preserved by the Vercel rewrite; bare root on the local Next server need not serve it. Screenshots are in [docs/screenshots](screenshots/), prefixed `academic-`.

## Deployment and cleanup gate

The last previously verified live deployment was `dpl_GNnYMj64VzPwc7uaCM44gRczYDkE`, commit `070953087c52255af63eb2bace00c5f67cc52e8d`. The expanded code is prepared for the same authorized GitHub/Vercel project, retaining the original root file hash `992a73d57e087f5c84c716225bd6f6a23b37c57a` (**58,478 bytes**). New domain verification will be recorded after rollout.

Temporary, clearly labeled QA accounts/content are still retained for final deployment tests. They must be signed out and removed, including actual Storage objects, before handoff. No QA passwords/session files/traces are committed.

Previous milestone evidence is archived at [archive/IMPLEMENTATION_STATUS_pre_auth.md](archive/IMPLEMENTATION_STATUS_pre_auth.md).
