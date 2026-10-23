> For the new email/password, onboarding and admin flows, also follow [AUTH_ADMIN_SETUP.md](AUTH_ADMIN_SETUP.md).

> Current owner-requested routing is `/test`, with Coming Soon at `/` on Vercel. See [TEST_DEPLOYMENT.md](TEST_DEPLOYMENT.md) for current callbacks and deployment. The setup steps below remain applicable.

# Run Elzatona on your own computer

## 1. Install Node.js

Install **Node.js 24 LTS** from https://nodejs.org. npm is included. Open a new Terminal (macOS/Linux) or PowerShell/Windows Terminal (Windows), then check:

```bash
node --version
npm --version
```

Use Node 24 for the environment tested in this handoff. Docker is **not needed** to run Next.js against a hosted Supabase project. Git is needed only for Supabase CLI/repository workflows; install it if those commands request it.

## 2. Open the project folder

For the current GitHub repository, clone it and open its root:

```bash
git clone https://github.com/DavidGirges1/Elzatona-.git
cd Elzatona-
```

If using the older complete-project ZIP instead, extract it and open its `app` subfolder. Your current directory must contain `package.json`. Run all app commands below from this directory. The `original-design-pack` and `review-preview` folders are references, not the development application.

## 3. Install the exact locked dependencies

```bash
npm ci
```

This downloads dependencies from the npm registry and can take a few minutes. Keep `package-lock.json`; do not replace it or use another package manager during initial setup. On Windows, if PowerShell blocks `npm.ps1`, use `npm.cmd ci` and `npm.cmd run dev` instead of changing your security policy.

## 4. Create your local environment file

This command works on macOS, Linux and Windows. It copies the empty template only if `.env.local` does not already exist:

```bash
node -e "const fs=require('fs');if(!fs.existsSync('.env.local'))fs.copyFileSync('.env.example','.env.local')"
```

You can leave the Supabase fields blank for an initial interface check. This shows honest unconfigured/empty states; login, courses, resources, uploads and community actions need the real backend described in step 7.

## 5. Start development mode

```bash
npm run dev
```

Keep that terminal open. In your browser, open:

**http://localhost:3000/test**

Edit files under `src/`; Next.js reloads as you save. Stop the server with **Ctrl+C**. The first start may download the Arabic fonts; an internet connection is required for package installation and initial font compilation.

If port 3000 is occupied, stop the other app or use:

```bash
npm run dev -- --port 3001
```

Then open http://localhost:3001/test. If you use authentication on another port, also update the app origin and the exact allowed auth callback URL.

## 6. Run the production version locally

Stop development mode first, then:

```bash
npm run build
npm start
```

Open http://localhost:3000/test again. `npm start` requires a successful build. Do not copy `.next` from a different computer; build it locally. This is a normal Next.js/Vercel project; the Docker build used during verification was only a workaround for the managed environment's restricted shell.

## 7. Connect your real Supabase project

Use a dedicated **development/staging** project, not a database containing production students. Full instructions are in `docs/SUPABASE_SETUP.md`.

### 7a. Fill `.env.local`

Open the file in your editor and replace the placeholders with values from your own Supabase project's API settings:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_STORAGE_FUNCTION=resource-files
```

The first two values connect to your project. Private PDF signing/publication use the supplied `resource-files` Supabase Edge Function; deploy it as described in `docs/SUPABASE_SETUP.md`. No application server secret is needed with this configuration. Never commit this file, put the secret into a `NEXT_PUBLIC_` variable, or send it to the browser. Real values are intentionally not included in this ZIP.

Check names/configuration without printing values:

```bash
node --env-file=.env.local scripts/check-env.mjs
```

### 7b. Apply the database migrations to a new project

For the already-connected owner project `osakdzaxqvlcrfpwrjul`, read the existing-project history warning in `SUPABASE_SETUP.md` first; do not reapply or reset its schema. For a new empty project, from `app/`, authenticate the Supabase CLI securely and link the staging project:

```bash
npx supabase login
npx supabase link --project-ref YOUR_STAGING_PROJECT_REF
npx supabase db push --linked --dry-run
npx supabase db push --linked
npx supabase migration list --linked
```

Review the dry run before applying. All five files in `supabase/migrations/` are required: schema, RLS/RPC grants, Storage and hardening. Do not use `--include-seed`; no production content is invented or seeded automatically. A database reset is destructive: do not reset a shared/production project.

### 7c. Configure Google login

1. Create a Google Cloud OAuth Web application and configure its consent screen/test users.
2. In Google, set the authorized redirect URI to `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.
3. In Supabase Authentication → Providers, enable Google and enter that Google client ID/secret.
4. In Supabase Authentication → URL Configuration, add `http://localhost:3000/test/auth/callback` to the redirect allowlist. Use the appropriate app origin for Site URL (localhost for an exclusively local dev project; fixed staging origin for a shared staging project).
5. Restart `npm run dev` after changing `.env.local`. Test with a genuine Google account.

Google's callback points to **Supabase**; the app callback allowlisted in Supabase points to **Next.js**. They are different URLs. The app has no compulsory university/enrollment onboarding wizard: sign in, return to context, then explicitly follow a course.

### 7d. Storage and pilot content

The migrations create the private `course-pdfs` bucket, PDF-only MIME restrictions, 3 MiB limit and access policies. Do not make the bucket public. Uploads are capped at 3 MiB to fit the current Vercel server-action request transport.

Add your genuine university, department, courses and topics using the schema and guidance in `docs/SUPABASE_SETUP.md`. Sign in through the app and add permissioned resource links. There are intentionally no fake university courses in production queries. To create a moderator, follow the trusted SQL instructions in the setup document after that person signs in once.

## 8. Run checks

After initial development startup (or generate framework types first), run:

```bash
npx next typegen
npm run typecheck
npm run lint
npm test
npm run format:check
npm run build
```

`npm test` runs validation, token-contrast and embedded PostgreSQL/RLS tests. It does not require Docker or Supabase credentials and does not certify hosted service behavior.

For browser checks, install Chromium once:

```bash
npx playwright install chromium
```

Keep the app running in one terminal (`npm start` after building). In another terminal in `app/`, run:

```bash
npm run test:e2e
```

Without connected credentials, backend cases are explicitly skipped. The base command does not load `.env.local` into the test process automatically. See `docs/SUPABASE_SETUP.md` for the exact `node --env-file=.env.local` commands to run the real integration and connected browser suites. Those suites require an isolated disposable project and `TEST_ALLOW_WRITES=1`; they create/retain test accounts, resources and reports. Google signup must also be verified manually.

If Chromium reports missing OS libraries on Linux, use Playwright's documented `npx playwright install --with-deps chromium` setup, which may need administrator permissions for system libraries.

## 9. Optional: use a complete local Supabase stack

Install/start Docker Desktop and reserve sufficient disk space for the Supabase images, then from `app/`:

```bash
npx supabase start
npx supabase db reset --local
```

Use the local project URL/keys returned by the CLI in `.env.local`. Match the configured PostgreSQL major version to your hosted project when comparing migrations. This optional stack could not start in the managed environment because its images exceeded available Docker storage; it is not required for the hosted Supabase route above. See `docs/SUPABASE_SETUP.md` for the distinction between embedded tests and genuine Supabase integration.

## 10. Optional: open the read-only review copy

The public review URL is:
https://elzatona-review-oct23.bronzegenet14.chatgpt.site

To serve its packaged static copy locally, open a separate terminal in the top-level `Elzatona` folder (Python 3 required):

```bash
python -m http.server 8080 --directory review-preview/dist
```

On Windows you may use `py -m http.server 8080 --directory review-preview/dist`. Open http://localhost:8080. This is only a visual/navigation capture and has no working backend. Develop and test the real app from `app/`.

## 11. Staging deployment

The owner has authorized and deployed the existing project with Coming Soon at `/` and the platform at `/test`. Follow `app/docs/TEST_DEPLOYMENT.md` for current configuration and reversal; a separate project remains an option for future destructive staging tests. A shareable static review URL is not proof that the real Next.js/Supabase application is deployed.

## Current limits

Hosted Supabase Auth/API/RLS/real file-transfer checks now pass; The actual Vercel app is deployed at https://elzatona.tech/test; Google signup remains disabled/unverified. Google setup, actual authorized pilot content, an actual Android/WhatsApp journey, a takedown contact and moderation ownership are still needed before inviting real students. The latest status and exact verification results are in `app/docs/IMPLEMENTATION_STATUS.md`.
