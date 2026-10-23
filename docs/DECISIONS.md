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

## Capital computing curriculum and course groups — 23 October 2026

The owner's new request supersedes the earlier three-course pilot limit and strict same-year course-discovery rule for the supplied faculty. Import all 122 distinct courses from their 2021 regulations into the existing Capital University/computers context; preserve other institutions' original records. The PDF's Helwan label is recorded as source provenance. Article 18 supplies levels directly from course codes. Do not guess semesters, passed prerequisites, current offering schedules, or a student's specialization.

Discovery uses year for ordering, not access control; department filters retain common requirements. One shared code has one hub, with normalized per-department requirement mappings. Students explicitly select courses in groups of up to one visible page; bulk addition is idempotent and does not toggle existing follows. A student's saved library survives academic-context changes, including year changes. Contributions and public access use the existing course permissions and moderation controls. No artificial resources, memberships, engagement counts or prerequisite blocks are introduced.

Source, transcription, page mapping, reproducible import and test instructions: [curriculum/README.md](curriculum/README.md).

## Keep curriculum provenance out of student flows — 23 October 2026

The owner rejects the regulations/prerequisite/source-page disclosure as clutter. Keep provenance in developer documentation and use curriculum metadata for suggestions/filtering behind the scenes. Course pages should focus on resources and discussion. Remove the disclosure entirely, including the course-page query and related registration disclaimers elsewhere in the student interface; this requires no database change.

## Focused material previews and voting — 23 October 2026

- Owner requests in-platform YouTube/PDF viewing and clearer Reddit-inspired voting, while preserving Elzatona's Arabic-first identity. Existing pastel tokens, typography and resource structure remain authoritative.
- Recognize only exact HTTPS YouTube hosts and valid video IDs (watch, short, live and share URLs). Build a single-video `youtube-nocookie.com` embed after an explicit watch action, with no autoplay or playlist feed. Preserve bounded shared timestamps. Never scrape metadata, proxy arbitrary URLs, or embed arbitrary submitted HTML. The original-link fallback remains visible. YouTube controls its ads/end screens and whether an owner permits embedding.
- Uploaded PDFs use a lazy-loaded, pinned PDF.js reader with paging, bounded zoom and fullscreen. Only the current page renders, with device pixel ratio capped at 2. Local worker/fonts/CMaps/WASM are copied from the installed dependency before dev/build and excluded from git/lint as generated vendor assets. Direct file opening remains available for downloads, unsupported/protected PDFs and assistive technology; canvas preview has no text-selection/search layer in this iteration.
- The same-origin PDF stream checks the ordinary published-resource read path, then the existing private-bucket signing service; only that verified signed Storage URL is fetched. No bucket, RLS or signing-policy change. No signed token is placed in page HTML; responses are private/no-store. Previously downloaded content remains on the student's device, as with direct downloads.
- Up/down arrows surround the real net score, use semantic selected states and Elzatona sky/peach fills, prevent overlapping submissions, optimistically reflect toggles/switches and reconcile with server revalidation. Existing checked vote RPC, guest login-return intent and no-self-voting rule remain authoritative. Sharing options expand from one explicit button; save, ask, report and author edit remain available.
- Tests use two temporary ordinary student accounts and explicitly labeled temporary material; these are removed after verification. No real content or account is reset. In this managed environment YouTube's player loads, but media-CDN tunnel failures prevent verifying uninterrupted playback; do not represent iframe presence as streamed video success.

## Controlled contribution launch — 23 October 2026

- Owner explicitly requests student material publishing be disabled at launch, with per-student approval from the administrator dashboard and a future global reopening control. This supersedes open publishing for all academically onboarded students. No existing student is grandfathered in. Administrators remain authorized.
- Publishing and organization are separate, audited grants. Publishers can create resources and edit their own published metadata; organizers can create course topics and edit published metadata/topic placement across active courses. Ownership, source URL/file, course, visibility, deletion, moderation and administrative access remain protected. The wider organization scope is stated explicitly in the admin confirmation.
- Ordinary browsing, private PDF reads, follows, voting, saving, questions and replies remain governed by existing rules. The broader `can_contribute` predicate is deliberately not redefined to mean publishing approval.
- Approval is checked in resource RPCs, Storage insertion, metadata editing and service-only PDF finalization. Revocation does not wait for JWT refresh. No credentials or approval decisions are stored in editable profile metadata. Only owner-scoped cleanup of pending files remains possible after revocation.
- A single database setting reopens publication/own edits for eligible students, without opening organization of other authors' work. Returning to restricted mode preserves individual grants. Tests of the reopening path use a rolled-back hosted transaction so the public launch remains restricted throughout verification.
- See [controlled-publishing instructions](CONTROLLED_PUBLISHING.md) for operation, migration identity, scope and security advisor rationale.
