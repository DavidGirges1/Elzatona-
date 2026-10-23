# Accepted implementation scope — 23 October 2026

Source: [full owner instructions](owner-instructions/05-authentication-onboarding-admin-landing.md).

Owner confirmed: **keep Coming Soon at `/`; develop everything under `/test`.** This supersedes the old Google-only/one-university scope without replacing the established Playful Academic identity. The student platform remains simple; the separate internal admin area uses a denser sidebar and actual metrics as explicitly requested. Existing public resource links remain accessible to guests.

Execution order:

1. Additive academic/identity/admin migration; preserve existing data, RLS, exact ownership and upload verification.
2. Email/password signup/login/recovery and compact secondary Google; persisted username and mandatory academic onboarding.
3. Query courses by persisted university/faculty/year. Profile editing and empty states, no substitute unrelated catalog.
4. Separate username-based admin Auth, owner-only provisioning, university/faculty/year/course management, paginated private users/resources/audit and meaningful tracked analytics.
5. Arabic landing inside `/test`, using existing fonts, tokens, accessible lightweight animations and an explanatory interactive preview.
6. Unit/embedded SQL checks, real hosted migration/functions, authenticated real-backend browser workflows, responsive visual inspection, production build and deployment verification.

Assumptions and decisions:

- Faculty years are editable initial configuration; Engineering 1–5, Medicine 1–6, Computers/Commerce/Arts 1–4. Actual curricula require owner review; support 1–12 without UI changes.
- Existing Cairo course context is not falsely relabeled as Capital University. An admin must set accurate university/faculty/year before it appears in that personalized context.
- Admins authenticate with the same Supabase password, resolving the username server-side inside a managed function. No email/role lookup available to students and no privileged key in Vercel.
- Resource removal uses reversible hiding with an audit reason; pending PDFs cannot be published via an admin bypass.
- No Motion dependency needed: CSS + IntersectionObserver with reduced-motion support keeps the first Android experience small.
- Account suspension is checked inside mutation RPCs, so existing sessions cannot continue protected community operations.
- `/test` remains publicly reachable and excluded from indexing; its obscurity does not provide access control.

See [implementation status](IMPLEMENTATION_STATUS.md) for exact evidence, deployment state and remaining owner configuration.
