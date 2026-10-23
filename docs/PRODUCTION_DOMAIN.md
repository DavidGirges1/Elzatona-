# Official Elzatona domain

The owner now authorizes replacing Coming Soon with the actual platform at **https://elzatona.tech/**. This supersedes the earlier instruction to keep everything under `/test`. Existing database rows and the verified owner administrator are retained. No database reset, domain transfer, or new provider credentials are needed for the routing change.

## Routing and Vercel configuration

- `NEXT_PUBLIC_APP_URL=https://elzatona.tech` (origin only).
- `NEXT_PUBLIC_BASE_PATH=` (intentionally empty, build-time). Both Next configuration and the native URL helper default to the root.
- Existing Supabase public URL/key and managed function variables remain unchanged. No project secret is exported.
- `vercel.json` no longer rewrites the root to Coming Soon. The original HTML remains in source as a rollback reference.
- Next redirects `/test/:path*` to `/:path*` with HTTP **307**, retaining query parameters and request methods. Temporary redirects permit a safe rollback without permanent client caches. Old shared resource links and emailed token-hash confirmation links retain their destinations. Old in-progress forms should be refreshed before submission after a new Next build.
- Public landing/course pages no longer carry blanket noindex metadata. Account/admin/Auth/API routes retain `X-Robots-Tag: noindex, nofollow` and crawler exclusions. Crawler settings are not authorization; existing server checks and RLS still apply.
- Local preview is `http://localhost:3000/`. An old ignored `.env.local` must also have an empty `NEXT_PUBLIC_BASE_PATH` before rebuilding.

## Owner-only configuration remaining

The connected Supabase MCP exposes database, project, and function tools, but **no Auth configuration update endpoint**. No Supabase Management API credential is configured in this workspace. Google Cloud and an email delivery provider are not connected. These dashboard steps cannot be completed through the available plugins:

1. Supabase → Authentication → URL Configuration: set Site URL to `https://elzatona.tech`. Add redirect URLs `https://elzatona.tech/auth/callback` and, for local work, `http://localhost:3000/auth/callback`. Keep the old `/test/auth/callback` allowlist entry during transition. This is required for reliable new OAuth/PKCE flows; moving the website alone does not update Auth settings.
2. Google Cloud: create/configure a Web OAuth client, External audience, and test users while in Testing. Origin `https://elzatona.tech`; Google redirect URI **`https://osakdzaxqvlcrfpwrjul.supabase.co/auth/v1/callback`**. Enter its client ID/secret only in Supabase → Authentication → Sign In / Providers → Google, enable and save. Refresh the app; provider availability is fetched without cache. Only basic openid/email/profile scopes are required.
3. Configure a verified sender and custom SMTP in Supabase using an email provider such as Resend. Put SMTP credentials only in the provider/Supabase dashboards. Keep Email and Confirm Email enabled. The default Supabase sender is restricted and does not establish student inbox delivery.
4. Supabase → Email Templates → Confirm signup: use `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">تأكيد حساب الزتونة</a>`. Site URL must have no `/test`. This route supports cross-device confirmation. For recovery, use the same route with `type=recovery`.
5. In a private browser, test Google → return → onboarding; separately use a fresh real inbox for signup → verification page → received email → confirmation → onboarding → logout/login. Verify email confirmation in Supabase Users. Never send passwords, SMTP secrets, Google client secrets or live confirmation links through chat/source.

Google consent and inbox receipt require owner participation. Neither is claimed to work until actually completed. Public deployment does not establish launch readiness; review pilot course attribution/content and previous security/operations items in IMPLEMENTATION_STATUS.md.

## Rollback

Vercel's previous deployment remains available in deployment history. Restoring the `/test` deployment also requires restoring `NEXT_PUBLIC_BASE_PATH=/test` for subsequent builds; environment changes alone do not alter an already built deployment. Restore appropriate Supabase Site URL/callback settings if rolling back. Do not reset Supabase or remove the owner account.
