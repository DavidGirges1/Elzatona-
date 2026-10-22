# Vercel staging, preserving elzatona.tech

Status: prepared instructions only. No Vercel project was created, deployed, or associated with a domain. The public Coming Soon site and DNS have not been changed.

1. Create a **new, separate Vercel project**, e.g. `elzatona-staging`. Import this application directory (`elzatona` if importing the parent workspace) from your repository. Do not select the existing Coming Soon Vercel project.
2. Framework preset: Next.js; Node.js 24; install `npm ci`; build `npm run build`; output directory: framework default. The tested build uses supported Webpack and full TypeScript validation. No static export is configured: pages require a server.
3. Use a dedicated staging Supabase project. Apply all migrations and configure Google as described in [SUPABASE_SETUP.md](SUPABASE_SETUP.md).
4. Add the four variables in `.env.example` to the **new staging project's** environment settings. Set `NEXT_PUBLIC_APP_URL` to the new project's fixed `https://...vercel.app` origin. Set the private key as a sensitive server variable. Do not add live credentials to this repository.
5. Keep Vercel's generated staging hostname. **Do not add `elzatona.tech`, `www.elzatona.tech`, change their DNS, transfer domains, or promote this staging project over the existing production site.** A future `staging.elzatona.tech` domain needs a separate explicit DNS change; it is not required for this milestone.
6. Keep the staging project access-controlled during engineering verification. For the guest-resource test and 5–10 invited students, choose an appropriate preview-protection bypass or intentionally allow access to the staging hostname. A Vercel password/login wall prevents the required anonymous WhatsApp journey even if application RLS is correct. Make that audience decision explicitly; never silently change the public Coming Soon site.
7. Add the exact fixed staging `/auth/callback` URL to Supabase's redirect allowlist. The Google callback still points to Supabase. Re-deploy after environment changes.
8. Run `check:env`, typecheck, lint, automated tests, production build, connected browser/Storage tests and a manual Google signup against staging. Check Vercel logs for action/request errors with a real <3 MiB PDF.
9. Review Arabic screens at 390/768/1440, also 360px and 200% text. Perform an actual Android WhatsApp link → exact resource → open source flow. Verify another student's writes are denied directly by the API and moderation removes visibility.
10. Only invite 5–10 students after the critical journey passes, rights/contact information and authorized pilot content are configured, and somebody owns report triage. This repository is not yet certified for that invitation.

Rollback: redeploy the previous known-good version of **the staging project**. Treat SQL migrations separately; do not drop tables or reset a shared hosted project as a rollback. Inspect Supabase backups before any destructive recovery. Production Coming Soon remains independent.
