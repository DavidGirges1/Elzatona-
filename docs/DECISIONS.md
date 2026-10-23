# Implementation and verification decisions

- The blueprint defines behavior; the supplied design-system document and token CSS define visuals. No palette, font, or brand redesign was made during verification.
- Next.js 16.4.2, React 19.3, strict TypeScript, Tailwind 4, customized shadcn Button, Supabase SSR and Zod. Server Components read under RLS; Server Actions validate and authenticate; checked RPCs handle writes. No production fixture fallback.
- The official Supabase starter retrieval failed initially; the official Next.js App Router scaffold was used with current Supabase SSR integration added explicitly. Original design-pack files remain in `../design-pack`.
- Supported Webpack replaces Turbopack for reproducible builds in this environment. The Tailwind PostCSS plugin is configured explicitly. Next's supported `experimental.useTypeScriptCli=false` uses the TypeScript compiler API and still performs full build-time validation. It is not `ignoreBuildErrors`.
- The managed shell blocks local TCP listener creation. Production build and preview use an isolated Node 24 Docker container with the existing proxy/CA configuration. This is verification tooling; deployment remains standard Next.js/Vercel.
- Five reproducible migrations are applied to embedded PostgreSQL for grants/RLS regressions. Its Auth/Storage schemas are test stand-ins. Hosted/local Supabase service integration is a distinct gate.
- PDF uploads in the existing server-action transport are capped at 3 MiB to remain below Vercel's 4.5 MB request ceiling. Private storage, file-signature validation, service-only finalization, and 60-second signed attachments preserve the planned privacy boundary.
- Local Supabase image unpacking failed for both PostgreSQL 17 and 15 due Docker disk limits. Repository configuration remains PostgreSQL 17, to match a typical new hosted project. No migration or real upload is claimed to have passed on the full Supabase stack.
- Preview screenshots show actual unconfigured/anonymous states. Missing-course and resource 404 captures are labeled unavailable; they are not evidence of populated screen validation. Connected screenshot/journey suites are included and explicitly skipped without an isolated backend.
- User asked to prepare staging only. No deployment, domain/DNS change, public Coming Soon replacement, or new feature work is authorized by this verification milestone.

- 23 October: owner requested a shareable URL. Published a separate read-only Sites capture of current actual screens. The full Next.js app remains Vercel-targeted and unconnected; no rewrite, fabricated backend, or public Coming Soon change was made.

## Current scope — 23 October 2026

The earlier milestone notes above are historical. The owner subsequently authorized GitHub/Vercel deployment and then the full email/password, academic onboarding, separate admin console and new landing scope in `owner-instructions/05-authentication-onboarding-admin-landing.md`. This explicitly supersedes the former feature freeze/Google-only/single-university assumptions. The owner confirmed Coming Soon remains `/` and all new experiences live under `/test`.

- New landing at `/test`; authenticated home at `/test/dashboard`. Guests still open exact resource links without signup. Student actions require a live active account and completed academic context; admin RPCs require a confirmed active admin.
- Saved courses remain explicit follows. When none are followed, the dashboard offers only courses matched to the student's persisted academic context; it does not silently follow them. A context with no courses shows an honest preparation state.
- Normalized shared faculties, university-faculty relationships and per-relationship years support growth without frontend hardcoding. Existing Cairo records are preserved; no new attribution or curriculum is invented.
- Admin username resolution/password verification occurs in Supabase's managed `admin-session` function, using built-in privileged credentials. The app never receives a project service key, and students cannot execute the private identity/provisioning RPCs.
- Managed `resource-files` v2 adds verified-admin review of hidden/pending PDFs while public open remains published-only. Actual size/signature verification is still mandatory before PDF publication, including admin publication.
- Account suspension is enforced in database mutation RPCs and upload policy, independently of page navigation. Admin changes require confirmation/reasons and produce immutable browser-side audit records.
- Three new additive migrations have been applied and checked on the actual hosted project as well as fresh embedded PostgreSQL. Source/hosted timestamp mapping is recorded in implementation status; do not reset the existing project.
- First-party page events are coarse categories with a random tab-session identifier, no IP/email/query/body. DAU/MAU count authenticated non-admin accounts with visits. Metrics include testing and bots, and are labeled accordingly. Raw events are admin-private; retention maintenance is documented.
- Use existing semantic colors, Alexandria/Tajawal, RTL shell and shadcn Button. Lightweight CSS/IntersectionObserver animation replaces a large animation dependency; reduced motion and keyboard preview interaction are verified.
