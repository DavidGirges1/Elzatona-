# Elzatona (الزتونة) — Instructions for AI Coding Agents

**Read `Elzatona_Implementation_Blueprint_v3.md`, `ELZATONA_DESIGN_SYSTEM.md`, and `elzatona.tokens.css` completely before writing code.** The blueprint defines product/architecture; the separate design system and CSS are **authoritative for visual decisions**. Do not substitute an English-first SaaS template.

## Locked product constraints
- Product: **Elzatona / الزتونة**, a student-powered academic resource community for Egyptian university students.
- Launch: one Egyptian university, one department, three real pilot courses, targeting the first 100 users.
- Interface: **Arabic-first, RTL-first**, natural Egyptian tone; English CS terminology and filenames must remain legible.
- Logged-in home: **موادي** with explicitly followed courses and search. Logged-out home: searchable pilot courses.
- WhatsApp shared-resource URL must **open exact resource with no signup**. Ask for login only when saving, voting, following, adding, or discussing.
- Course-first architecture: resources organized by course and topic/lecture; search, filters, votes, sharing, source details, discussion.
- `زتونة المادة`: up to 3 **manually curated, truly published** resources. Never fabricate picks, rankings, engagement, or professor endorsement.
- Interactive native quiz and AI tutor are NOT required for first release; existing authorized question bank links are supported.

## Preferred stack
Next.js App Router, strict TypeScript, Tailwind + customized shadcn/ui, Supabase Postgres/Auth/Storage/RLS, Vercel, Zod, Playwright, Vitest, SQL migrations. Use official and up-to-date implementation patterns.

## Design quality bar
Playful Academic with cool blue-white background, dark teal-blue primary actions, cheerful fixed pastel palette (sky/lavender/pink/sunshine/mint/peach), Alexandria headings and Tajawal UI text; compact course tiles and white resource rows; clean metadata; one main action per screen; strong visual hierarchy at 360px Android widths. No olive or forest green branding. No copied leaderboard/robots/coins from founder visual reference; no generic colorful SaaS dashboard, sparkling AI graphics, fake statistics, noisy features, massive hero illustrations or unnecessary motion. Use semantic CSS tokens, not arbitrary hex values. Audit bidi text with `<bdi>`, `dir="auto"` and explicit LTR controls for URLs/emails.

## Execution process
1. Inspect existing repository; document assumptions and do not overwrite prior work.
2. Build the foundational palette/typography/spacing and preview 4 key screens at 360px and desktop; seek founder review, then follow phases 0–6 with usable vertical slices.
3. Write real Supabase schema/RLS and migrations; no fake backend data in production paths.
4. Test anonymous deep links, signed-in **موادي**, resource finding, submission, voting, saving, discussion, moderation and unauthorized data access.
5. Record results and blockers in `docs/IMPLEMENTATION_STATUS.md`. Do not claim external integration or deployment works unless tested.
6. Seek founder feedback on four screens: home, course hub, direct resource detail, and contribution form before polishing secondary features. Never copy fabricated preview content into production.

**Definition of success:** A real Egyptian student can open a resource sent on WhatsApp, find another useful course resource, and submit a helpful link faster and with less confusion than their existing workflow.
