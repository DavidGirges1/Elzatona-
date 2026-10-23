# Coming Soon at /, platform at /test

The owner requested deployment to the existing `elzatona` Vercel project, repository `DavidGirges1/Elzatona-`, while preserving the public Coming Soon page. This replaces the earlier separate-staging-only instruction within this explicit scope. No domain/DNS transfer is required.

- Public: https://elzatona.tech/ — original Coming Soon HTML.
- Unlisted platform: https://elzatona.tech/test — real Next.js/Supabase app.
- Local actual app: http://localhost:3000/test after `npm ci` and `npm run dev`.

## Variables

Set on the Vercel project before building:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://osakdzaxqvlcrfpwrjul.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<public key from project API settings>
NEXT_PUBLIC_APP_URL=https://elzatona.tech
NEXT_PUBLIC_BASE_PATH=/test
SUPABASE_STORAGE_FUNCTION=resource-files
```

NEXT_PUBLIC_APP_URL is the origin, without `/test`. The prefix is a separate build-time variable. Managed file signing/publication uses Supabase’s built-in function credentials; do not export or add a server secret to the frontend. Local APP_URL uses http://localhost:3000.

Google redirect in Google Cloud remains `https://osakdzaxqvlcrfpwrjul.supabase.co/auth/v1/callback`. Supabase must allow the exact app callback **https://elzatona.tech/test/auth/callback** and optionally **http://localhost:3000/test/auth/callback**. Configure OAuth client ID/secret privately in Supabase; never in this repository.

## Visibility and verification

`/test` is public to anyone with the URL. No link is added to Coming Soon; robots/meta/headers discourage indexing, but they are not access control. The public GitHub source reveals routing. Use actual access control before uploading confidential data. Supabase RLS still protects private saves, ownership, votes and moderation. Vercel protection remains enabled for generated preview hostnames and is not disabled merely to make tests pass.

Test root returns the exact original HTML; test /test and nested courses, public deep links, search, protected actions, callback redirects and static assets. Inspect the deployed commit/build and production errors through the Vercel plugin. No deployment is marked working before HTTP/browser verification.

## Return to normal after owner approval

To launch the platform at `/`, remove the two Coming Soon rewrites from vercel.json, remove its /test-only headers, set NEXT_PUBLIC_BASE_PATH to an empty value, and rebuild. Change the Supabase allowed app callback to https://elzatona.tech/auth/callback (Google’s callback remains at Supabase). Review robots rules and enable normal index metadata. Retest source links, login, uploads and Server Actions before promotion. Existing data and migrations do not change.

To go back to Coming Soon only, roll Vercel back to the recorded original deployment dpl_G744TBBFTTiNfFEEocVWppKe5djm, commit fbbc4f32d816b79bf4e52e0ea8b54f08eab37861. Do not reset Supabase. Keep a copy of project configuration because the original deployment was static and the new one uses the Next.js framework.
