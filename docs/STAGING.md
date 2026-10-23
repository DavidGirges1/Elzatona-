# Current developer deployment

The owner explicitly requested use of the existing GitHub/Vercel project with Coming Soon retained at `/` and the platform at `/test`. This supersedes the previous separate-staging-only plan within that scope.

- Public: https://elzatona.tech/ — original Coming Soon HTML, byte-identical.
- Developer app: https://elzatona.tech/test — real deployed Next.js/Supabase application.
- Repository: https://github.com/DavidGirges1/Elzatona-

See [TEST_DEPLOYMENT.md](TEST_DEPLOYMENT.md) for variables, callbacks, visibility limits, rollback and returning the platform to `/`. See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for exact deployed test evidence and remaining Google/browser gaps. The path is unlisted, not authenticated; no DNS/domain transfer was made and existing Vercel generated-hostname protection remains enabled.

A separate Supabase/Vercel staging project remains advisable for destructive fixtures or future schema experiments. Never reset the shared owner project to run tests or use a migration reset as deployment rollback.
