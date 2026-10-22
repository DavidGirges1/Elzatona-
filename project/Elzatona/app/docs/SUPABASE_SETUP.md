# Connect your staging Supabase project

Use a **separate staging/test project**, never an existing production database. No hosted project has been connected or migrated in this session. The app does not manufacture credentials or use fixture data in production queries.

## 1. Credentials

In Supabase Project Settings → API/API Keys, copy the project URL and publishable key. For private PDF signing and server-verified finalization, also obtain a server secret key (a legacy service-role key is supported). Add these to environment secrets or an ignored `.env.local` in this project:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_SECRET_KEY=YOUR_SERVER_ONLY_SECRET
```

`NEXT_PUBLIC_APP_URL` is the Next.js app origin, **not** the Supabase URL. For staging use the fixed staging Vercel URL. Never prefix the secret key with `NEXT_PUBLIC_`, commit `.env.local`, paste keys into reports, or include the secret in browser code. The app's optional browser client only receives the publishable key. The secret is used only in server-only PDF code; ordinary student writes use verified user credentials and RLS.

```bash
node --env-file=.env.local scripts/check-env.mjs
```

This reports names/readiness only. Restart/rebuild the app after changing environment variables. Vercel needs a new deployment after environment changes.

## 2. Apply migrations

The CLI is pinned through the lockfile. Its help was checked against the installed version. On your workstation:

```bash
npm ci
npx supabase login
npx supabase link --project-ref YOUR_STAGING_PROJECT_REF
npx supabase db push --linked --dry-run
npx supabase db push --linked
npx supabase migration list --linked
```

Authenticate using the CLI's secure mechanism; do not put tokens or database passwords in shell history. If account credentials are already injected, use them instead of another interactive login. In this managed environment the CLI needs `SUPABASE_HOME=/tmp/elzatona-supabase` because the default home is read-only.

Apply all five timestamped files in `supabase/migrations/`, in order. Never apply only the core schema. These create all public tables, security-invoker resource view, RLS, restricted RPC grants, profile trigger, private storage bucket/policies, and verification hardening. No production content is seeded automatically. Back up an existing project before migrating it; review the dry run. A failed migration is a stop condition.

`npm test` applies these exact files to fresh embedded PostgreSQL with test Auth/Storage schemas and verifies grants/RLS. This is useful regression evidence, **not** a hosted migration reset. `npm run db:types` generates types from those applied migrations. After connecting, generate an independent hosted schema snapshot for comparison:

```bash
npx supabase gen types --linked --schema public > /tmp/elzatona-hosted.types.ts
```

Review differences and run typecheck before adopting generated types; view nullability and nullable SQL function parameters need application-level refinement.

For a full local Supabase installation on a machine with enough Docker disk space:

```bash
npx supabase start
npx supabase db reset --local
```

The configured PostgreSQL major version is 17; match it to your hosted project. Local startup in this session failed unpacking Supabase's PostgreSQL image (`no space left on device`), so no full-stack local reset was certified.

## 3. Google authentication and exact redirects

1. In Google Cloud create/select an OAuth web application, configure its consent screen, and add the intended pilot Google accounts if the app is in Testing mode.
2. Add the authorized redirect URI **`https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`** to Google. This is the Supabase callback, not the Next.js callback.
3. In Supabase Authentication → Providers → Google, enable Google and enter the Google client ID/secret there. Do not add the Google secret to browser variables.
4. In Supabase Authentication → URL Configuration, set Site URL to the fixed staging app origin. Add these exact redirect URLs as needed:
   - `http://localhost:3000/auth/callback`
   - `https://YOUR_FIXED_STAGING_HOST/auth/callback`
5. Keep the Vercel staging `NEXT_PUBLIC_APP_URL` equal to that fixed staging origin. Avoid broad production redirect wildcards. Add a specific Vercel preview callback only when testing that preview.
6. Test in a fresh browser: open a resource, click save, sign in with Google, return to the exact resource, then explicitly click save. The callback must not automatically vote/save/follow.
7. Repeat with a second Google account. Test a cancelled consent flow and an expired callback.

The product has no multi-step enrollment onboarding. The intended first-use flow is Google sign-in → return to context → explicitly choose/follow a course. Account creation via Google and this complete browser flow remain unverified until the provider is configured.

## 4. Private PDF storage

Migrations create `course-pdfs` with `public=false`, `allowed_mime_types=['application/pdf']`, **3 MiB (3,145,728 bytes)** maximum. The original 15 MiB proposal cannot pass through Vercel's 4.5 MB function request limit; the existing server-upload flow is intentionally capped at 3 MiB. Next's action limit is 4 MB to allow multipart overhead. Do not increase only one of these limits.

Policies permit inserting a new object only for the signed-in author's matching pending resource, reading only authorized objects, and deleting only one's own pending objects. There is no overwrite/update policy. Anonymous list/read is not granted. Finalization is **server-secret-only** (`finalize_pdf_checked`), after the server checks the actual PDF signature, author and metadata; students cannot directly change status or storage paths. Retry downloads the stored pending bytes and verifies the signature before finalizing.

Published PDFs are opened through `/api/resources/[id]/open`. The server checks current published visibility, then creates an attachment URL valid for 60 seconds. Hiding a resource stops new URLs; existing signed URLs can remain valid for up to 60 seconds. File signature checking is not malware scanning; keep the small pilot moderated and plan scanning before broad public uploads. Cleanup of stale pending objects is still a documented operational task, not an implemented scheduled job.

## 5. Real pilot data and initial moderator

Use Supabase SQL Editor to insert the **actual authorized** university, department, three courses, and topics. Required columns are visible in the first migration. Use stable ASCII slugs; populate genuine Arabic/English labels. Do not label test fixtures as real courses. Students submit permissioned resources through the app after signing in. No scraping/import is performed.

After the moderator has signed in once, find their UUID in Authentication → Users, then run this trusted SQL manually (replace the UUID):

```sql
insert into public.user_roles(user_id,role)
values ('REPLACE_WITH_MODERATOR_AUTH_USER_UUID'::uuid,'moderator')
on conflict(user_id) do update set role=excluded.role;
```

Do not derive roles from profile metadata. Confirm a normal account cannot open `/admin/reports` or `/admin/highlights`. Establish a rights/takedown contact address before inviting students; no contact was supplied yet.

## 6. Run genuine integration and browser tests

Use only a dedicated disposable staging/test project. These suites create test users, fictional courses, resources, reports and private PDF objects. They deliberately exercise hiding content. They retain fixtures for inspection; remove them by resetting the disposable project when finished. Never run against a production/pilot-content database.

```bash
node --env-file=.env.local --input-type=module -e "process.env.TEST_ALLOW_WRITES='1'; await import('./tests/live-supabase.mjs')"
```

This makes real Auth, PostgREST and Storage requests and checks public reads, private follows/saves, votes, discussions, forbidden edits, uploads, MIME/size policies, finalization and moderator hide. Test identities are provisioned through the trusted Auth admin API, then log in through Auth; this **does not certify Google signup UX**.

Start the app with the same project configuration, then:

```bash
npm run build
npm start
# In a separate terminal:
node --env-file=.env.local --input-type=module -e "process.env.TEST_ALLOW_WRITES='1'; const {spawnSync}=await import('node:child_process'); const r=spawnSync('npx',['playwright','test','tests/e2e/connected.spec.ts'],{stdio:'inherit',env:process.env});process.exit(r.status??1)"
```

Install Chromium with `npx playwright install chromium` if not available. The connected suite uses real Supabase Auth sessions in browser cookies, then tests the actual app pages and Server Actions, without replacing database queries. `TEST_APP_URL` overrides localhost for staging. Rebuild after fixes, rerun until all critical journeys pass, and separately complete the manual Google/WhatsApp phone tests.
