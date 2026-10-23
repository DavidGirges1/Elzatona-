# Elzatona implementation status

Updated: **23 October 2026 (UTC)**. Current phase: **verification and Supabase/Vercel integration**. New product features remain frozen.

## Readiness

**Not ready yet to invite 5–10 real students.** Real Supabase API/Auth/RLS/Storage checks now pass, and the actual Next.js browser journeys have passed. Google is disabled in the hosted Auth configuration. The Next.js application has not been deployed to the owner's Vercel project. `https://elzatona.tech/` was inspected: HTTP 200, title “Elzatona — Coming Soon | Gamified Learning Platform”. Its code, environment settings, domains and DNS were left untouched.

## Connection and evidence

- Owner-authorized Supabase: **Elzatona**, project `osakdzaxqvlcrfpwrjul`, URL `https://osakdzaxqvlcrfpwrjul.supabase.co`, active PostgreSQL 17.
- Ignored local `.env.local` contains the real project URL/publishable key, `NEXT_PUBLIC_APP_URL=http://localhost:3000`, and `SUPABASE_STORAGE_FUNCTION=resource-files`. No service/secret key was copied out of Supabase; the app's secret-key variable is blank.
- All 16 public tables have RLS; `resource_cards` uses `security_invoker=true`. Existing university, three courses and 17 topics were preserved. The owner still needs to confirm the actual authorized pilot content.
- Existing hosted migrations were inspected. Their core/storage version numbers differ from local filenames. No reset/reapplication was performed. See the existing-project warning in [SUPABASE_SETUP.md](SUPABASE_SETUP.md).
- Private `course-pdfs`: PDF MIME only, 3,145,728-byte limit, no public list/read or object overwrite policy.
- Managed function **resource-files**, ACTIVE version 1, was deployed to this project. It verifies the actual Auth user and ownership before PDF publication, validates stored bytes, and signs only published PDFs in active courses for 60 seconds. `verify_jwt=false` is deliberate for anonymous `open`; `finalize` verifies its bearer token explicitly with Auth. Supabase's built-in function secret stays inside Supabase.
- Vercel management access is not connected. A public domain cannot supply project/environment/deployment access. No claim is made about the credentials or build source currently configured in Vercel.

| Area                                                    | Implemented      | Local verification                                       | Real Supabase                                                       | Deployed                                |
| ------------------------------------------------------- | ---------------- | -------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------- |
| Arabic RTL layout, design tokens, fonts                 | Yes              | Build and actual populated screenshots                   | Actual course reads                                                 | Next app: no                            |
| Public course/resource discovery                        | Yes              | Actual browser rendering                                 | Public API reads pass                                               | Next app: no                            |
| Google OAuth routes/profile                             | Yes              | Safe return, disabled-provider and callback-error states | Google setting confirmed **false**; signup not tested               | Next app: no                            |
| Follow courses, submit links, votes, saves, discussions | Yes              | PostgreSQL tests and connected browser checks            | Real sessions/RPCs and permission failures pass                     | Next app: no                            |
| Private PDF upload/publication/guest download           | Yes              | Handler tests and connected form checks                  | Real upload, exact-byte download, MIME/size/ownership failures pass | Managed function: **yes**; Next app: no |
| Reports/moderation/curation                             | Yes              | SQL tests and resource-report browser journey            | Normal-user denial, moderator hide and visibility pass              | Next app: no                            |
| Vercel staging                                          | Runbook prepared | Production build passes                                  | Not applicable                                                      | **No**                                  |

## Fixes made during integration

- Replaced the app's requirement for an exported server secret with a narrow managed Supabase file function. The optional original server-only fallback remains available.
- Enabled the PDF field for the managed-function configuration; updated environment diagnostics and setup/deployment instructions.
- Fixed a real integration failure: existing PostgreSQL course/topic IDs have no RFC UUID version/variant bits. Zod's strict `uuid()` rejected them, blocking follows and submissions. Shared `guid()` validation now accepts PostgreSQL's canonical UUID shape while rejecting malformed input; ownership/RLS checks remain enforced. Added a regression test.
- Login checks public Auth provider availability; students see a clear Arabic unavailable message while Google is disabled. The OAuth entry route preserves the safe return destination instead of sending them into a disabled provider error.
- Isolated the HTTPS protocol in contribution helper text with `bdi` for RTL readability. No palette, typography or identity redesign.

## Exact verification results

| Check                                        | Result                                        | Limits                                                                                              |
| -------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                          | Exit 0                                        | Strict application and test TypeScript                                                              |
| `npm run lint`                               | Exit 0, no warnings/errors                    | Application, tests and tooling                                                                      |
| `npm test`                                   | **92 passed, 0 failed, 4 files**              | Validation, embedded PostgreSQL/RLS, contrast, 18 managed-file handler checks                       |
| Five migrations on fresh embedded PostgreSQL | Passed within SQL suite                       | Test Auth/Storage schemas; not a full hosted reset                                                  |
| `npm run build`                              | Exit 0, compiled in 15.8s; TypeScript in 4.8s | Full Node 24 production build; supported Webpack/compiler API; no checks disabled                   |
| `check:env` with `.env.local`                | Exit 0                                        | URL, publishable key, app origin present/valid; managed file function configured; no values printed |
| `tests/hosted-connection.mjs`                | **19 passed, 0 failed**                       | Actual hosted Auth/PostgREST/Storage/function; temporary password-session fixtures, not Google      |
| `tests/e2e/hosted.spec.ts`                   | **27 passed, 0 failed** (1.9m)                | Actual Next server against the real Supabase project at 390/768/1440                                |
| Google signup/login                          | **Blocked**                                   | Hosted `/auth/v1/settings`: `external.google=false`; no genuine Google session tested               |
| Vercel deployment                            | **Not performed**                             | Public domain inspected only; no management access                                                  |

Intermediate failures were not counted as passes. The first connected browser run exposed the UUID bug. After that fix, 24 browser cases passed and three PDF download assertions failed because Playwright's request client attempted blocked direct external networking; the uploads/publications had succeeded. The download assertion was changed to Node's real HTTPS fetch through the environment's configured proxy. No Supabase request was mocked or intercepted. An initial Playwright trace-option placement error and test cookie setter return type were also fixed. Formatting warnings were corrected; `npm run format:check` exits 0.

Earlier milestone evidence: 73 unit/SQL tests and 27 unconfigured-browser cases passed; 30 admin-key connected cases skipped. The separate admin-key fixture suite still requires a disposable project/server secret and was not used to certify this owner-project run. Local full Supabase startup previously failed on Docker disk capacity; no full local-stack reset is claimed.

## Critical journeys and remaining gaps

Real hosted checks verify guest public reads, private follow/save state, student link submission → second student read, vote transitions/self-vote denial, questions/replies, author-only PDF upload/finalization, anonymous exact-byte PDF download, forged MIME/oversize/overwrite/cross-author failures, private reports and moderator hiding. The app browser run additionally uses actual Server Actions and screens. QA account provisioning/password sessions do **not** verify Google signup.

Still unverified: genuine Google consent/new-account/callback/session refresh; deployed Vercel uploads/actions; actual Android/WhatsApp opening; slow-network upload retry; own-resource editing UI; profile update and manual-highlight UI; discussion/reply report UI; concurrent voting load; full accessibility audit and human student usability. SQL tests cover several underlying permission paths, but that is not equivalent to these UI journeys.

PDF signature validation is not malware scanning. Stale pending object cleanup is not scheduled. Hidden PDFs stop receiving new URLs; previously signed URLs may remain valid for 60 seconds. A real takedown/contact channel and moderation owner must be supplied before inviting students.

## Preview and screenshots

Local actual app: **http://localhost:3000**, running in `elzatona-preview` in this execution environment. This URL is local and depends on environment lifetime/port forwarding. There is no new public Next.js deployment.

Actual populated screenshots are `docs/screenshots/hosted-{home,discovery,course,resource,submission,login}-{mobile-390,tablet-768,desktop-1440}.png`. They use real queries and clearly labeled temporary QA contributions; no sample data fallback was added to production code. See [VISUAL_QA.md](VISUAL_QA.md). Test content is removed after verification.

Public read-only UI capture: https://elzatona-review-oct23.bronzegenet14.chatgpt.site. It is the earlier unconfigured capture, not the running backend-connected app. Its deployed audience has not changed.

The previously repaired source ZIP remains downloadable at https://elzatona-review-oct23.bronzegenet14.chatgpt.site/downloads/99d5368c278fa5a4/Elzatona_Complete_Project.zip (1,978,549 bytes, 183 files, CRC and SHA-256 verified). That export predates the current Supabase integration changes; do not assume it contains this update.

## Next owner steps

1. Connect/authorize **Vercel**, then select or create a separate staging deployment using this updated Next.js source. Preserve the Coming Soon production domain. Set the four preferred variables documented in [STAGING.md](STAGING.md); the managed function means no Vercel server secret is required.
2. Configure a Google Cloud OAuth Web client. Add **`https://osakdzaxqvlcrfpwrjul.supabase.co/auth/v1/callback`** as its redirect URI. Enable Google in Supabase and enter the client ID/secret privately there. The available MCP tools cannot perform Auth-provider configuration or create Google Cloud secrets.
3. Supply the fixed staging URL, set `NEXT_PUBLIC_APP_URL` to it and allow its exact `/auth/callback` in Supabase. Also allow `http://localhost:3000/auth/callback` for local work. Redeploy after environment changes.
4. Test genuine Google signup with two accounts, guest WhatsApp links and a real PDF on staging; review the populated screens and authorized pilot content; establish moderation/contact ownership. Invite students only when these gates pass.

No public-site replacement or domain/DNS change has been made.

## Security advisory review

The hosted security advisor still reports three informational no-policy findings for intentionally private `mutation_limits`, `product_events` and `user_roles`; two anonymous and 14 authenticated SECURITY DEFINER exposure warnings for the explicitly granted RPC surface. Anonymous `is_moderator` reveals only the current caller’s role status, and `record_open` checks published resources. Mutation RPCs enforce Auth, ownership/role checks and throttles. Internal finalization/actor helpers remain unavailable to ordinary clients; real permission failures passed. RLS was not disabled and no blanket policies/grants were added to silence the advisor. Review guidance: [private-table policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [anonymous function grants](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated function grants](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

Auth also reports [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). The application exposes Google sign-in only; the hosted email/password provider remains enabled for temporary QA sessions. If password login is enabled for students later, configure password protection before exposing it. No claim of an advisor-clean project is made.

## Temporary fixture cleanup — complete

Removed eight test objects through the real Storage API (not by deleting Storage metadata). Verified all three QA folders were empty, globally signed out the three test accounts, then deleted only their 16 temporary resources, discussions/replies, reports/actions, related events and accounts. Final hosted checks: **0 QA users, 0 QA sessions, 0 QA resources, 0 QA Storage objects**. Original catalog preserved: **1 university, 3 courses, 17 topics**; resource count restored to its initial zero. Local temporary credential/state files were removed. Screenshots retain labeled QA content for review; their resource URLs are no longer live after cleanup.

Final browser result: **27 passed, 0 failed, 0 skipped** in the hosted app suite at all three widths. Final format check: exit 0. The separately provisioned admin-key fixture suite was not run.

## GitHub /test deployment milestone — 23 October 2026

The owner explicitly requested the existing GitHub repository and Vercel production domain be used with Coming Soon retained at `/` and the platform unlisted at `/test`. This supersedes earlier separate-staging-only instructions within that scope. Confirmed writable repository `DavidGirges1/Elzatona-` and existing production deployment commit `fbbc4f32d816b79bf4e52e0ea8b54f08eab37861` in Vercel project `prj_6HrPeMdc7tbZeOukBkCvklzhEDkb` (`elzatona`, owning team `team_eYl5lq1dBbWQzWyTEdGV37bI`). Project-scoped MCP calls succeed; an explicit broader team selector returned 403, so all operations remain scoped to this authorized project.

The Vercel project had no environment variables. Added the real public Supabase connection, app origin, `/test` build prefix and managed storage-function configuration; no service secret was exported. Existing generated-hostname protection remains intact. Google is still disabled and requires owner OAuth configuration.

Next.js now builds with basePath `/test`; native search/anchors, metadata and Route Handler redirects/callbacks explicitly include that prefix. Supplied vercel.json retains original landing HTML at the root, copied byte-for-byte from Git blob `992a73d57e087f5c84c716225bd6f6a23b37c57a`. No public landing link points to the app. Robots/meta/header rules discourage indexing. `/test` is unlisted but is not authentication, and the repository is public.

Current local checks: TypeScript/lint pass; **97 automated tests pass**; full production build passes (8.3s compilation, 4.1s TypeScript); **6 routing browser checks pass** across 390/768/1440. Hosted API integration rerun: **19 checks pass**. Full `/test` hosted browser rerun: **27 passed, 0 failed** (1.7m). The first run had one mobile follow assertion exceed the default 5-second polling timeout; after allowing 15 seconds for the real hosted response and resetting only the test student’s follow state, the complete rerun passed. Preview/deployment verification is in progress. Temporary new QA accounts/content will be removed after those checks.

All eight original design-pack files, original attached ZIP, owner instructions, system-design documentation, local/setup/rollback guides and existing implementation/tests/screenshots are included. Secret env files, dependencies/build caches and QA credentials are excluded. See SYSTEM_DESIGN.md and TEST_DEPLOYMENT.md.
