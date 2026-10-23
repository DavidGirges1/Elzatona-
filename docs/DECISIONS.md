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
