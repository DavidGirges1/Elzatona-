# Elzatona — الزتونة

Arabic-first academic resources, built with Next.js and Supabase.

**Current test mode:** Coming Soon stays at `/` on Vercel; the actual app opens at `/test`. `/test` is unlisted, not password-protected.

```bash
npm ci
# Copy .env.example to ignored .env.local and fill public Supabase values.
npm run dev
```

Open **http://localhost:3000/test**. No server secret is needed with the deployed managed file function. Google requires provider configuration in Supabase.

- [Test deployment, callbacks and launch reversal](docs/TEST_DEPLOYMENT.md)
- [System design](docs/SYSTEM_DESIGN.md)
- [Implementation and exact test results](docs/IMPLEMENTATION_STATUS.md)
- [Local setup](docs/LOCAL_SETUP.md)
- [Supabase setup](docs/SUPABASE_SETUP.md)
- [Original blueprint and visual rules](docs/specification/)
- [All original references](docs/original-design-pack/) and [owner instructions](docs/owner-instructions/)

The unchanged root `index.html` is the original landing-page source; public/coming-soon.html is its verified byte-identical copy. The Next app requires a server; it is not a static export.
