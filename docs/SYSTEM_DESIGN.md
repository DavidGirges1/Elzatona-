# Elzatona system design

**Current authorization model:** [four-layer quality control](COMMUNITY_ROLES.md) supersedes earlier publisher/organizer switches or legacy moderator references below. Admin-only role assignment, explicit leader-course scopes, private pending submissions and database-checked review govern all link/PDF/quiz publication.

The authoritative product/design documents are in `docs/specification/`; the eight original reference files and original ZIP are retained in `docs/original-design-pack/` and `docs/original-attachments/`. Owner requests are retained in `docs/owner-instructions/`. `AGENTS.md` supplies repository instructions.

## Application and deployment

Next.js App Router, strict TypeScript, React server components/Server Actions, Tailwind semantic tokens and customized shadcn components. Arabic is the default locale and RTL layout; Alexandria/Tajawal are compiled by next/font. No mock data fallback, AI tutor or social feed is used.

Vercel hosts the Next application at the official domain root, `https://elzatona.tech/`. Build-time `NEXT_PUBLIC_BASE_PATH` is intentionally empty. Next Link/router/Server Action redirects use root paths; `src/lib/paths.ts` keeps native anchors, GET search, Open Graph URLs and Route Handler redirects/callbacks consistent. `vercel.json` no longer rewrites `/` to Coming Soon. Next temporarily redirects old `/test/:path*` links to root equivalents, retaining query strings and request methods.

The original Coming Soon document remains unchanged in source for rollback (Git blob `992a73d57e087f5c84c716225bd6f6a23b37c57a`). Public pages allow indexing; account/admin/Auth/API routes retain crawler exclusions/noindex headers. These are not security boundaries: community mutations require Auth and database authorization. See [PRODUCTION_DOMAIN.md](PRODUCTION_DOMAIN.md) for exact external Auth setup and rollback.

## Data, Auth and authorization

Supabase project: `osakdzaxqvlcrfpwrjul`. Public application clients receive only URL/publishable key. Server Components use the caller’s cookies; server-side getUser verifies identity. The proxy refreshes cookies and marks authenticated responses private/no-store. User input is validated with Zod and bounded by database constraints. Canonical PostgreSQL UUIDs are accepted even without RFC version bits.

Core tables: universities, courses, topics, profiles, user_roles, user_courses, resources, resource_votes, resource_saves, course_highlights, discussions, discussion_replies, reports, moderation_actions, mutation_limits and product_events. All have RLS. The resource_cards view runs with security_invoker. Private state is owner-scoped. Internal role/event/rate tables intentionally have no direct client policies.

SQL RPCs implement bounded mutations: follow courses, contribute/edit own resources, toggle votes/saves, ask/reply, report, update profile, moderate and curate. Explicit EXECUTE grants expose only the intended caller surface. Internal actor/finalization helpers are not browser-callable. Moderator privileges come from a trusted role table, never user-editable OAuth metadata.

Google OAuth: app `/auth/login` → Supabase Auth → Google → `https://osakdzaxqvlcrfpwrjul.supabase.co/auth/v1/callback` → app `/auth/callback` → safe original context. Google remains disabled until the owner privately supplies the OAuth Web client credentials in Supabase. The app exposes a truthful unavailable state. QA password sessions are not proof of Google signup.

## Resource and Storage boundary

External resources open through the public resource detail and a visibility-checked redirect route. Sharing a published resource never requires signup. Following, contributing, voting, saving and discussions require verified identity.

PDF flow: authenticated Server Action validates title/course/topic/rights and file → prepare_pdf creates the author’s pending row → caller’s Storage client uploads into `<author>/<resource>.pdf` under RLS → managed resource-files function verifies the bearer token/author/pending state/active course and actual stored PDF signature and size → privileged finalize_pdf_checked publishes it. No Supabase service secret is exported to Vercel. The optional previous server-only fallback remains documented.

The course-pdfs bucket is private, MIME-restricted and capped at 3 MiB to fit Vercel’s Server Action transport. No overwrite policy exists. Anonymous open signs only a currently published PDF in an active course, with a 60-second attachment URL. A hide action stops new URLs; previous URLs may last until expiry. Signature checks are not malware scanning. Pending-file cleanup is currently operational, not scheduled.

## Verification and operations

Vitest covers validation, fresh embedded migrations/RLS/grants, design-token contrast, managed-file authorization and routing. Playwright tests actual Next pages, Server Actions and hosted Storage without replacing queries. Hosted test credentials are temporary and removed after tests; production keys/traces/.env.local/dependencies/build caches are excluded from Git. Tests distinguish local PostgreSQL, actual Supabase, Google signup and deployed Vercel evidence. See IMPLEMENTATION_STATUS.md.

The existing hosted migration names map to local capabilities but have imported core/storage timestamp differences. Do not reset, replay or repair the shared database without a reviewed reconciliation.

For launch routing reversal: see TEST_DEPLOYMENT.md. Deployment rollback never resets database content.

## October 23 extension: identity, academic context and administration

See [accepted scope](AUTH_ADMIN_PLAN.md) and [setup/provisioning](AUTH_ADMIN_SETUP.md).

Student UI → Server Action (Zod + verified Supabase user) → guarded Postgres RPC → normalized tables/RLS → revalidated server rendering. `student_context()` provides only the caller's persisted context. Partial onboarding saves after each step; finishing requires an offered university-faculty-year tuple and a claimed username. Course discovery queries include database `university_id`, `faculty_id` and `year_level` predicates for signed-in students. Public resource links remain globally readable under the existing published-content policies.

New tables: `faculties`, `university_faculties`, `academic_years`, `student_academics`, `account_states`, `admin_audit_log`, `analytics_events`, `request_budgets`. Profiles gain full names and canonical unique usernames; courses gain faculty/semester constraints; PDFs gain a server-controlled verification timestamp.

Admin UI → dedicated username/password Server Action → managed `admin-session` function → private rate-limited username-to-identity RPC → Supabase Auth password verification → confirmed live admin role check → SSR cookies. No custom password store or client-side privileged lookup. All console pages are under a separate guarded layout; actions and database RPCs independently recheck privileges. Private emails are returned only by guarded, paginated `admin_users()`.

Management uses validated RPCs and audit records. Disabling catalog options invalidates academic readiness without deleting student history. Removing a configured year referenced by students or courses is blocked by foreign keys. Content removal uses hiding; unpublished PDFs cannot be promoted unless server byte verification has completed. Admins can obtain short-lived attachment URLs for review after independent role verification.

`/api/analytics` validates origin/body and passes an event nonce/category/tab-session UUID to a throttled deduplicating RPC. The server associates only an existing authenticated user ID. Overview reads aggregate real registrations, page events and content actions; no fabricated growth metrics. Maintenance retention and known bot/test traffic limitations are explicit in setup.
