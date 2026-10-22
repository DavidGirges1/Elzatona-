# Elzatona / الزتونة

Arabic-first student academic resource sharing. Next.js App Router, strict TypeScript, Tailwind/shadcn primitives, Supabase Auth/Postgres/private Storage, Zod. Cool blue-white, dark teal actions, Alexandria headings, Tajawal UI, fixed pastel categories, RTL.

## Run locally

```bash
npm ci
cp .env.example .env.local
# Fill your staging Supabase values, then follow docs/SUPABASE_SETUP.md.
npm run dev
```

Open `http://localhost:3000`. Without Supabase credentials the app shows honest empty/setup states; no demonstration data substitutes for production queries. Public resources do not require sign-in; contribution/save/vote/discussion actions do.

## Verify

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm start
# Separate terminal, install Chromium if necessary:
npm run test:e2e
```

`npm test` covers URL validation and PostgreSQL grants/RLS using embedded PostgreSQL with test Auth/Storage schemas. Browser tests distinguish unconfigured states from connected tests; missing integration configuration is reported as skipped, never passed. `npm run db:types` regenerates types from the migrated embedded schema.

- [Current status and exact results](docs/IMPLEMENTATION_STATUS.md)
- [Supabase, Google OAuth, Storage and live verification](docs/SUPABASE_SETUP.md)
- [Separate Vercel staging; preserve elzatona.tech](docs/STAGING.md)
- [Visual QA and actual screenshots](docs/VISUAL_QA.md)
- [Significant decisions](docs/DECISIONS.md)

No hosted integration or deployment has been certified. Use a disposable project for integration fixtures and provide authorized pilot content before real-student testing. Never commit secrets.
