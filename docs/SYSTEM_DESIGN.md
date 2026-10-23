# Elzatona system design

The authoritative product/design documents are in `docs/specification/`; the eight original reference files and original ZIP are retained in `docs/original-design-pack/` and `docs/original-attachments/`. Owner requests are retained in `docs/owner-instructions/`. `AGENTS.md` supplies repository instructions.

## Application and deployment

Next.js App Router, strict TypeScript, React server components/Server Actions, Tailwind semantic tokens and customized shadcn components. Arabic is the default locale and RTL layout; Alexandria/Tajawal are compiled by next/font. No mock data fallback, AI tutor or social feed is used.

Vercel hosts the Next application. During the owner’s testing period, build-time `NEXT_PUBLIC_BASE_PATH=/test` mounts the entire platform under `/test`. Next Link/router/Server Action redirects receive the prefix automatically; `src/lib/paths.ts` prefixes native anchors, GET search, Open Graph URLs and Route Handler redirects/callbacks. `vercel.json` rewrites `/` to the unchanged owner-authored `public/coming-soon.html`, and `/robots.txt` to the disallow rule. No Coming Soon navigation points to `/test`. The test app has noindex/nofollow metadata and headers.

The root Coming Soon document matches Git blob `992a73d57e087f5c84c716225bd6f6a23b37c57a` from the original repository. Its unchanged original `index.html` remains in Git. The root rewrite is a Vercel platform feature; local `next dev` is opened at `/test`.

`/test` is an unlisted public URL, not a password. Repository source is public and can reveal it. Developers must not put confidential data there on the assumption that the path is secret. Actual community mutations require Auth and database authorization.

## Data, Auth and authorization

Supabase project: `osakdzaxqvlcrfpwrjul`. Public application clients receive only URL/publishable key. Server Components use the caller’s cookies; server-side getUser verifies identity. The proxy refreshes cookies and marks authenticated responses private/no-store. User input is validated with Zod and bounded by database constraints. Canonical PostgreSQL UUIDs are accepted even without RFC version bits.

Core tables: universities, courses, topics, profiles, user_roles, user_courses, resources, resource_votes, resource_saves, course_highlights, discussions, discussion_replies, reports, moderation_actions, mutation_limits and product_events. All have RLS. The resource_cards view runs with security_invoker. Private state is owner-scoped. Internal role/event/rate tables intentionally have no direct client policies.

SQL RPCs implement bounded mutations: follow courses, contribute/edit own resources, toggle votes/saves, ask/reply, report, update profile, moderate and curate. Explicit EXECUTE grants expose only the intended caller surface. Internal actor/finalization helpers are not browser-callable. Moderator privileges come from a trusted role table, never user-editable OAuth metadata.

Google OAuth: app `/test/auth/login` → Supabase Auth → Google → `https://osakdzaxqvlcrfpwrjul.supabase.co/auth/v1/callback` → app `/test/auth/callback` → safe original context. Google remains disabled until the owner privately supplies the OAuth Web client credentials in Supabase. The app exposes a truthful unavailable state. QA password sessions are not proof of Google signup.

## Resource and Storage boundary

External resources open through the public resource detail and a visibility-checked redirect route. Sharing a published resource never requires signup. Following, contributing, voting, saving and discussions require verified identity.

PDF flow: authenticated Server Action validates title/course/topic/rights and file → prepare_pdf creates the author’s pending row → caller’s Storage client uploads into `<author>/<resource>.pdf` under RLS → managed resource-files function verifies the bearer token/author/pending state/active course and actual stored PDF signature and size → privileged finalize_pdf_checked publishes it. No Supabase service secret is exported to Vercel. The optional previous server-only fallback remains documented.

The course-pdfs bucket is private, MIME-restricted and capped at 3 MiB to fit Vercel’s Server Action transport. No overwrite policy exists. Anonymous open signs only a currently published PDF in an active course, with a 60-second attachment URL. A hide action stops new URLs; previous URLs may last until expiry. Signature checks are not malware scanning. Pending-file cleanup is currently operational, not scheduled.

## Verification and operations

Vitest covers validation, fresh embedded migrations/RLS/grants, design-token contrast, managed-file authorization and routing. Playwright tests actual Next pages, Server Actions and hosted Storage without replacing queries. Hosted test credentials are temporary and removed after tests; production keys/traces/.env.local/dependencies/build caches are excluded from Git. Tests distinguish local PostgreSQL, actual Supabase, Google signup and deployed Vercel evidence. See IMPLEMENTATION_STATUS.md.

The existing hosted migration names map to local capabilities but have imported core/storage timestamp differences. Do not reset, replay or repair the shared database without a reviewed reconciliation.

For launch routing reversal: see TEST_DEPLOYMENT.md. Deployment rollback never resets database content.
