# Elzatona — الزتونة

Arabic-first academic resources, built with Next.js and Supabase.

**Official domain:** the platform runs at `https://elzatona.tech/`. Old `/test/...` links redirect to their root equivalents. The original Coming Soon document is retained as a rollback reference.

```bash
npm ci
# Copy .env.example to ignored .env.local and fill public Supabase values.
npm run dev
```

Open **http://localhost:3000**. No server secret is needed with the deployed managed file function. Email/password login is primary; configure verified email delivery in Supabase. Google is secondary and requires its provider configuration.

- [Official-domain deployment and remaining Auth setup](docs/PRODUCTION_DOMAIN.md)
- [Authentication, academic catalog and initial admin setup](docs/AUTH_ADMIN_SETUP.md)
- [Accepted scope and execution plan](docs/AUTH_ADMIN_PLAN.md)
- [System design](docs/SYSTEM_DESIGN.md)
- [Implementation and exact test results](docs/IMPLEMENTATION_STATUS.md)
- [Local setup](docs/LOCAL_SETUP.md)
- [Supabase setup](docs/SUPABASE_SETUP.md)
- [Original blueprint and visual rules](docs/specification/)
- [All original references](docs/original-design-pack/) and [owner instructions](docs/owner-instructions/)

The unchanged root `index.html` is the original landing-page source; public/coming-soon.html is its verified byte-identical copy. The Next app requires a server; it is not a static export.
