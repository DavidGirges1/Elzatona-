# Authentication, academic catalog and admin setup

The public root `/` remains the original Coming Soon page. The new landing is `/test`, student home `/test/dashboard`, and the internal login `/test/admin/login`. `/test` is unlisted, not a password or secret security boundary.

## Environment

Use `.env.example`; set public values from Supabase → Project Settings → API:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BASE_PATH=/test
SUPABASE_STORAGE_FUNCTION=resource-files
SUPABASE_ADMIN_FUNCTION=admin-session
```

For Vercel use `NEXT_PUBLIC_APP_URL=https://elzatona.tech` (the origin, without `/test`). Never put a secret or service-role key in a `NEXT_PUBLIC_` variable. The hosted application uses managed functions, so a privileged key is **not required in Vercel**. Supabase supplies privileged credentials inside its own Edge Functions.

## Migrations and storage

For a NEW Supabase project run the checked-in migrations in filename order with the Supabase CLI. For the existing Elzatona project do **not reset** the database or blindly run `db push`: the first core/storage migration versions were imported under different timestamps. See `SUPABASE_SETUP.md` and the implementation status for the hosted-to-source mapping.

The additive `20261023013635_academic_identity_and_admin.sql` preserves the old catalog. It adds normalized faculties, university relationships, configured years, student academic selections, account state, unique usernames, admin audit and private analytics. It seeds Capital University and Beni Suef University, five configurable faculties each and appropriate sample year configurations. These faculty/year options are an editable MVP configuration, not a verified university curriculum. No new real courses or study resources are fabricated. Existing old courses remain publicly accessible, but do not appear in a new student's dashboard until an administrator assigns their correct academic context.

Deploy functions:

```bash
npx supabase functions deploy resource-files --project-ref YOUR_PROJECT_REF --no-verify-jwt
npx supabase functions deploy admin-session --project-ref YOUR_PROJECT_REF --no-verify-jwt
```

`resource-files` authenticates protected finalize/review actions and permits public opening only for published PDFs. `admin-session` verifies the admin's password through Supabase Auth and a live confirmed admin role before returning a session to the Next.js server. Both intentionally implement authentication inside their handlers, supporting current publishable keys rather than assuming a legacy JWT API key. No CORS browser bypass or client-admin key is required.

Migrations create a **private** `course-pdfs` bucket limited to **3 MiB, PDF only**. Storage policies permit only the pending resource's authenticated, active, onboarded owner to upload its exact path, prohibit overwrites, and allow deleting only their pending upload. Publication verifies actual bytes and size in the function, never merely Storage metadata. Public downloads and admin review links expire in 60 seconds. Signed URLs are bearer links until expiry; hiding a resource stops new URLs, not an already issued 60-second link.

## Email authentication

In Supabase → Authentication → Sign In / Providers enable Email, keep Confirm Email enabled, and configure a password minimum of 10 characters. The application additionally requires letters and digits. For public API consistency set the project's password requirements accordingly where available.

Configure a verified SMTP sender under Authentication → Email → SMTP Settings. Supabase's built-in sender is restricted and is not a reliable general student email delivery service. Test a signup, confirmation and password recovery in a real inbox before student invitations.

Authentication → URL Configuration:

- Site URL: `https://elzatona.tech/test`
- Redirect allowlist: `https://elzatona.tech/test/auth/callback` and `http://localhost:3000/test/auth/callback`
- Add individual staging/preview callback URLs only when used; avoid broad production wildcards.

Default confirmation/recovery emails use Supabase's confirmation endpoint, which returns a PKCE code to `/test/auth/callback`. Complete it in the browser that initiated the request. For cross-device email links use the SSR token-hash route and configure the respective Supabase email templates:

```html
<!-- Confirm signup -->
<a
  href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/onboarding"
  >تأكيد حساب الزتونة</a
>
<!-- Password recovery -->
<a
  href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password"
  >تغيير كلمة المرور</a
>
```

`SiteURL` includes `/test` once. Use a local Site URL when testing these custom templates in an isolated local project. Password resets sign out all sessions before requiring fresh login. Supabase refresh-token revocation does not erase already issued JWTs until expiry; application mutations also recheck live account status in the database.

## Google (external owner setup)

In Google Cloud create an OAuth web client. Put its ID and secret **only in Supabase's Google provider settings**. Authorized Google redirect URI for this project:

`https://osakdzaxqvlcrfpwrjul.supabase.co/auth/v1/callback`

Enable Google in Supabase, configure the authorized domain/consent screen and test users if the Google OAuth app is still in testing. Keep the application callbacks above in Supabase's allowlist. The compact Google button uses the existing PKCE flow. New Google users must claim a unique username and complete the same onboarding. Provider settings and Google Cloud secrets cannot be provisioned with the currently available MCP tools; do not paste secrets into chat. The UI truthfully disables Google when Supabase reports it disabled.

## Provision the first administrator

1. Create your own account at `/test/signup` with a unique username and a strong password. Verify the email through your own inbox. Never use a shared default password.
2. Open **Supabase SQL Editor**, as the project owner. Run this with your actual verified email and chosen lowercase username (3–30 ASCII characters, starts with a letter):

```sql
select public.provision_admin('YOUR_VERIFIED_EMAIL', 'YOUR_ADMIN_USERNAME');
```

3. Sign out of the student account, then open `/test/admin/login` and use that username and the **same Supabase Auth password**. There is no second password database.
4. Verify the new role can access overview/users and that a separate student account cannot. Provisioning is logged; the RPC is denied to browser `anon` and `authenticated` roles.
5. Set correct course contexts in Admin → Courses; review seeded faculties/year configurations against the real university curriculum. Add actual permissioned course materials.

No admin link appears in the landing, student navigation or student login. Every admin server action/layout and privileged database RPC rechecks the confirmed active admin role. Admins cannot suspend themselves or another administrator. User status changes and resource publication/hiding require explicit confirmation and a recorded reason. Content is hidden, not irreversibly deleted, preserving moderation evidence.

## Analytics and retention

The collector sends page categories, an event nonce and a random tab-session visitor ID. No email, IP, query string or resource body is stored in analytics. Admin pages are excluded. DAU/MAU count distinct authenticated non-admin users with recorded page visits, not all anonymous visitors or proof of studying. Page views include internal testing/bots; they are not unique students. The public Coming Soon page is not instrumented.

Run the following owner maintenance SQL on an appropriate daily schedule (Supabase Cron or your team's maintenance process):

```sql
delete from public.request_budgets where bucket < now() - interval '2 days';
delete from public.analytics_events where created_at < now() - interval '90 days';
```

After retaining 90 days, total views refer to retained events. Choose a different documented retention period if required. Raw analytics, account states, private emails and audit records are only exposed to the authorized roles. Request budgets are protected by RLS with no client policies by design.
