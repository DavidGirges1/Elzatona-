# Elzatona (الزتونة) — Agent-Ready MVP & Arabic UX Blueprint

**Version:** 3.0 — 22 October 2026. Supersedes Elzatona v2 olive brand direction; preserves architecture and product behavior.
**Purpose:** Build a deployable, mobile-first prototype for the first 100 real student accounts.  
**Product name:** **Elzatona** (الزتونة). Working brand identity: Arabic-first for Egyptian university students. Verify domain and trademark availability before final public launch; do not assume name clearance.  
**Primary value:** A shared, organized, enduring resource hub for each Egyptian university course, improved by students and made useful across academic years.  
**Launch scope:** ONE Egyptian university, ONE department, THREE courses. Architect data for growth, but seed only permissioned pilot content.

> **Build objective:** A student following a resource link from WhatsApp sees the exact resource **without signup**, can open it immediately, and can explore related course resources. A returning signed-in student sees **موادي (My Courses)** and can find relevant materials in a few taps. A contributor shares an existing link or PDF in under 60 seconds. All core paths run on real Supabase data. **Arabic/RTL and natural Egyptian microcopy are release requirements, not a localization stretch goal.**

---

## Product decisions already made / remaining assumptions

**Decided with founder**
- Working brand: **Elzatona / الزتونة**; audience: **Egyptian university students**.
- **Arabic-first, RTL-first** interface, while allowing real English terminology (e.g. Data Structures, SQL) and filenames.
- Authenticated homepage prioritizes **موادي — My Courses**, not an algorithmic social feed.
- Resource-sharing/course knowledge community is the product; interactive question banks are a **supporting feature**; AI tutor is **future scope**.
- Primary distribution begins in existing **WhatsApp class groups**; do not build a replacement chat app.
- Very simple mobile UX, distinctive local brand voice and strong visual taste; avoid generic generated dashboards.
- **Visual direction updated:** **Playful Academic** — cool blue-white shell, bold Arabic titles, dark teal-blue primary actions, restrained pastel sky/lavender/pink/sunshine/mint highlights. **No olive**. Canonical source: `ELZATONA_DESIGN_SYSTEM.md` and `elzatona.tokens.css`.

**Explicit working assumption to validate with users**
- **Anonymous deep-link access + optional sign-in** is recommended but the founder has not separately locked it as a final onboarding decision. Implement it as a reversible MVP assumption: content opens first; require login only for save, follow, vote, upload, reply, or ask.

**Do not silently change these decisions.** Add proposed departures to `docs/DECISIONS.md` with rationale, then implement the smallest reversible option.

---

## 0. Instructions to the AI coding agent (read this first)

Act as a pragmatic full-stack product engineer, UX designer, and security-conscious reviewer. Implement the app in small, working vertical slices. Favor comprehensible code, polished mobile UX, and actual end-to-end flows over breadth. Do not build a generic admin SaaS dashboard.

**Non-negotiable rules**

1. Use **Next.js App Router + TypeScript (strict) + Tailwind CSS + shadcn/ui + Supabase Postgres/Auth/Storage**, and **Vercel** for deployment. Use the official `with-supabase` Next.js starter if starting from scratch. Use `@supabase/ssr` and current official Supabase auth guidance. Next.js 16 uses `proxy.ts`, not the old middleware naming: verify against the installed framework version.
2. Before generating code, inspect the existing repo. If files already exist, adapt; do not overwrite user work. Check the current versions, APIs, and docs for code you use. Avoid deprecated auth patterns. Prefer Server Components for reads, Server Actions for authenticated writes; use Client Components only when interactive. No separate Express backend, ORM, Redux, Redis, WebSockets, or microservices for the pilot.
3. Use **SQL migrations in `supabase/migrations/`**, Supabase CLI, and generated TypeScript database types. Enable and **test Row Level Security on every public table**. Never treat hiding UI controls as authorization. Never expose service-role/secret keys to browsers. Never use user-controllable metadata to determine admin privileges.
4. Do not invent university names, real notes, past exams, or permission to redistribute them. Provide clean development fixtures and a separate seed-import process for authorized materials. Keep PDF uploads limited and safe; do not scrape WhatsApp/Drive or ingest private files automatically.
5. All forms need Zod validation, clear **Arabic** errors/loading/success states, responsive layouts, and keyboard accessibility. Support anonymous reading and link sharing; require login for interactions. Set root `<html lang="ar" dir="rtl">`; test mixed Arabic + English + filenames in every primary screen.
6. Keep a `docs/IMPLEMENTATION_STATUS.md` checklist. After each phase run formatter, linter, typecheck, tests and build; report exactly what passed/failed. If credentials are missing, implement the integration and document the manual setup instead of faking connected behavior.
7. An iteration is complete only when its acceptance tests pass. No unfinished buttons, fake counters, dead links, hardcoded 'real' upvote counts, or placeholder success toasts.
8. Build the tokenized **Playful Academic** visual identity from `ELZATONA_DESIGN_SYSTEM.md`: no olive, floating chatbot bubbles, meaningless stats, forced gamification, giant decorative hero, or repeated card grids without information hierarchy. Three core jobs: **find, share, discuss**; homepage is **موادي** for returning students.

**Final deliverables:** running repo, migration/seed scripts, README, `.env.example`, RLS tests, Playwright smoke tests, deploy instructions, minimal admin moderation UI, seeded demo environment, and a clear list of external setup steps. Include four reviewed responsive screen previews adhering to `ELZATONA_DESIGN_SYSTEM.md`. Do not claim deployments, live connections, test successes, or end-to-end validation unless actually performed.

---

## 1. Product definition and constraints

### Target user
Egyptian undergraduate students, initially one university + department + three courses, who already share summaries, slides, YouTube videos, exam materials (when authorized), and explanations through WhatsApp and Google Drive. Many arrive from a WhatsApp deep link on a modest Android device and variable mobile connection.

**Language and tone:** Arabic-first Egyptian colloquial for short actions and friendly guidance; clear modern Arabic for academic or legal explanations. Use English for familiar subject terminology where actual students do. **No forced slang** (avoid endless “يا بطل 🔥” and marketing hype), no literal corporate translations, no Arabizi as default UI copy.

### Problems to solve first
1. Resources scattered across chat and Drive, with poor findability by course/topic/lecture.
2. Useful recommendations and answers are lost between student cohorts.
3. Students lack lightweight mechanisms to signal usefulness, flag mistakes, and discover trusted contributions.
4. Returning students have no quick **my courses** workspace that reduces navigation.

### Positioning
**English:** “The shared brain of your university courses.”

**Arabic working headline:** “موادك، من غير دوشة.”

**Supporting sentence:** “ملخصات، محاضرات، فيديوهات وامتحانات سنين فاتت — مترتبين في مكان واحد، بمساعدة الطلبة.”

This is **not** a drive replacement, WhatsApp clone, general-purpose AI tutor, or generic social feed. WhatsApp is a distribution channel; Elzatona is the durable home for course knowledge.

### Jobs to be done
- **Anonymous visitor arriving from WhatsApp:** View the **exact shared resource immediately**; see course/lecture context; open original link or permitted PDF; discover related materials; optionally share back to WhatsApp; no sign-up wall.
- **Returning signed-in student:** `/` shows **موادي** with current courses, obvious search, small truthful course updates, and a lightweight way to add/change saved courses.
- **Student contributor:** Add HTTPS link or authorized PDF within ~60 seconds; preselect course/topic from current context; see contribution posted; receive truthful voting feedback.
- **Question asker:** Ask a course-specific question (or one tied to a resource) and see durable replies.
- **Moderator/curator:** Triage reports; select at most 3 genuinely useful course highlights under **زتونة المادة** without implying formal professor verification.

### First-release boundaries
**Must ship:** pilot course directory; **signed-in موادي homepage**, saved/followed course controls and first-use empty state; course home/search/topic and type filters; Arabic RTL UI; sharable resource detail pages; external links + secure PDFs; votes; saves; discussions and replies; report workflow; contributor profiles; manual highlight curation; basic analytics; mobile accessibility.

**Deliberately defer:** AI answers, AI-generated content feeds, direct messages, in-app chat, realtime notifications, native app, payments, broad university catalog, full leaderboard, animated mascots, recommendation algorithm, OCR, vector search, automatic WhatsApp/Drive imports, PWA offline sync. **Native interactive quizzes** only after core workflows pass and user demand is observed (existing question-bank links allowed from day one).

### First 100 students: measures of success
- 100 distinct real student sign-ups in pilot; exclude team/test accounts.
- **North-star candidate:** weekly students who access a genuinely useful source via Elzatona (actual outbound click/PDF open), alongside weekly unique contributing students.
- Instrument: shared-resource landing, resource opened, course followed, course revisited, resource submitted, helpful vote, discussion posted, saved, WhatsApp share.
- Candidate activation: in first 7 days after sign-up, open 2 distinct sources **or** create a contribution/reply.
- Candidate retention: active use 7 days after initial activation, monitored separately during exam weeks vs normal weeks.
- Hypotheses only: >40% activation; >10% contribute; >25% useful-action day-7 return. Do not present as validated benchmarks.

### Release UX principles
1. **Open content before asking for anything** when arriving by shared link.
2. **Course-first, lecture/topic-first**. No random feed.
3. **One clear action per view**; secondary actions remain easy to find.
4. Never invent “new items,” verification labels, usage data or likes.
5. Each screen should answer: “Which course? Which topic? Why is this resource worth opening?”

## 2. UX specification — Arabic, RTL, and mobile first

### 2.1 Routes and information architecture

```text
/                                  Authenticated: موادي; anonymous: find pilot courses
/courses                           Course directory + search; Arabic headings
/courses/[slug]                    Course hub: المصادر | بنك الأسئلة (links) | المناقشات
/courses/[slug]/resources/[id]     Public resource detail; deep-link destination
/courses/[slug]/discussions/[id]   Public course/resource Q&A
/courses/[slug]/submit             Resource submit (auth gated, safe return)
/courses/[slug]/ask                Ask a question (auth gated, safe return)
/my-courses                        Optional direct alias to saved courses view
/saved                             My saved resources (auth)
/profile                           My public-contributions/profile (auth)
/u/[id]                            Public contributor (privacy-safe)
/login                             Google sign-in; show requested intent/context
/auth/callback                     Validated OAuth callback
/admin/reports                     Moderator only
/admin/highlights                  Minimal moderator highlights curation
```

Use stable ASCII URL slugs for pilot; Arabic display names live in data and UI. Do not generate unstable route paths by transliterating UI labels on every request.

### 2.2 Global navigation
- Mobile top app bar: small **الزتونة.** wordmark, discover/search, context-relevant save/avatar. Avoid crowded headers and redundant duplicate menus.
- Authenticated homepage: search directly beneath the concise heading, then **موادي**, followed by honest per-course updates and a quiet contribution prompt. No statistics dashboard.
- Course header: course title and department/level context; top tabs **المصادر** and **المناقشات**. A **بنك الأسئلة** type/category may be shown as a tab only if populated; otherwise leave it as a resource type.
- Breadcrumb/back returns to the previous in-app context; if arriving by WhatsApp with no history, returns to current course, not an error or blank screen.
- No bottom navigation unless real usability testing justifies it. If used, <=3 destinations (موادي, اكتشف, المحفوظات) with accessible labels.
- Mobile touch targets >=44x44 CSS px and respect Android safe areas. Search and main content remain visible at ~360px without side scrolling.

### 2.3 Homepage: authenticated = موادي
**Hierarchy, in order:**
1. Small wordmark and quiet user/account affordance.
2. Concise authentic headline such as **“موادك، من غير دوشة.”**; avoid huge decorative hero.
3. One search field **“بتدوّر على ملخص، امتحان، أو شرح؟”** supporting course-first matches and resource search with clear scope.
4. Section **موادي** with 2–6 compact course rows/cards (not giant empty tiles), showing Arabic course name, familiar English course name/code where relevant, and at most one **truthful** useful update (e.g. newly published resource since last visit; if not computed reliably, omit).
5. Link **تعديل المواد** to add/remove current courses.
6. Subdued contextual action **“عندك حاجة تفيد دفعتك؟ ضيف مصدر”** when course context is known.

**Zero saved courses:** Show useful empty state **“لسه مضفتش موادك”**, visible real pilot courses, and CTA **“اختار موادك”**. No forced multi-screen wizard; allow choose courses directly.

**Anonymous root `/`:** Explain the value in one sentence and display searchable available pilot courses immediately. Do not pretend the anonymous visitor has personalized courses; if there is a local last-visited course, optionally display “آخر مادة فتحتها” transparently.

### 2.4 WhatsApp deep-link journey (critical)
Example `/courses/data-structures/resources/<uuid>`:
1. Arrive from WhatsApp with no session → server renders **exact published resource** with clear title, source type, course/topic, attribution, short description, and primary **افتح المصدر** action.
2. On tap open source link/PDF with no auth. Resource opens in new safe tab where relevant; page remains accessible.
3. Below are **related resources from the same topic** and link to **شوف باقي مصادر المادة**; no aggressive modal after opening.
4. If the visitor taps **احفظ**, **صوّت**, **ضيف مصدر**, **اسأل**, or **ضيف المادة لموادي**, show small inline sign-in explanation **“سجّل دخولك عشان تحفظ المصدر”**. After Google OAuth, return to the exact record and resume the *intended action only if safe and explicitly confirmed*.
5. Never convert a shared link into a generic welcome page or force university/faculty/year selection before reading.
6. Share UX: native share where available or `wa.me/?text=...` / copy-link with correct URL encoding; no WhatsApp scraping or API dependency. On Android, check that the shared preview includes real Arabic title and no private PDF links.

### 2.5 Course hub — the central product screen
The course is the atomic container for **student knowledge**, not a giant chronological feed.

1. Header: Arabic display name, optional English/code line, university/department/year information, small course-follow action **“ضيف لموادي”** (signed-in toggles to **“ضمن موادي”**).
2. Course-scoped search **“دور جوّه المادة…”**, matching titles/descriptions and, if supported, topic names.
3. Primary sections: **المصادر** and **المناقشات**; question-bank resource category is filterable. If native quiz exists later, then add third tab.
4. Topic/lecture browsing **“المحاضرات والموضوعات”** is prominent; default “الكل”. A student studying Trees should see its slides, notes, videos, questions and exams together.
5. Compact type filters: **الكل**, **ملخصات الطلبة**, **سلايدز**, **امتحانات**, **فيديوهات**, **بنوك أسئلة**, **مراجع**; control overflow and long text on 360px Android.
6. Sort: **الأفيد** (vote score, transparent) and **الأحدث**. Popularity is a signal, never label as verified correctness.
7. Resource row/card: actual title, type, lecture/topic, short supporting description, contributor and semester if meaningful, vote score, accessible actions. Preserve mixed Arabic/English text without visual corruption.
8. If at least one genuine editorial pick exists, show **زتونة المادة** prominently but quietly (max 3 recommended resources, approved by moderator/curator). Explain **“مصادر مختارة من مجتمع المادة”**, not fake **“دكتور المادة معتمدها”**.
9. Visible **ضيف مصدر** CTA in course context. Zero results shows useful CTA to contribute or clear filter, not placeholder material.

**Signature idea to validate:** **زتونة المادة**: curated entry point to 1–3 sources that genuinely help students start their course. A later **زتونة المحاضرة** is a possible per-topic version, but don't implement as a complex separate feature yet.

### 2.6 Resource detail screen
- Context visible without scrolling: **المادة / المحاضرة / نوع المصدر**, resource title, concise description, contributor, date/semester, external domain or PDF label.
- Big primary action: **افتح المصدر** / **افتح الـ PDF**; anonymous access allowed on `published` resources.
- Secondary: **مفيد ↑**, **مش مفيد ↓**, **احفظ**, **شارك**, **بلّغ عن مشكلة**. Never infer that upvotes guarantee factual correctness.
- For AI-assisted submissions, show factual disclosure **“المحتوى معمول بمساعدة AI”** when declared; not AI-generated badges for everything.
- Under the source: **مصادر تانية لنفس المحاضرة** and **أسئلة عن المصدر ده**. Link questions to existing discussion model rather than creating a competing unstructured comments system.
- Missing/removed resource: Arabic 404/hidden state; still allow navigating back to course; never leak private storage path.

### 2.7 Submission — target <60 seconds
- Page title **“ضيف مصدر يفيد دفعتك”**. Course preselected from referring screen, adjustable only when clearly needed.
- First choice: **“لينك”** vs **“ملف PDF”**; paste an HTTPS link or upload a permitted PDF.
- Required: title, resource type, course; link/file. Topic/lecture highly encouraged but optional for generic materials. Description, semester, AI-assisted declaration optional.
- Add minimal one-line copyright/permission confirmation for uploads; avoid a scary full-page legal gate. Never copy private Drive contents automatically.
- Duplicate link in same course → show existing record and invitation to vote/comment rather than silently create another.
- Actual errors in Egyptian-friendly Arabic, e.g. **“اللينك مش صالح. جرّب لينك بيبدأ بـ https://”**; keep user's entered data on failure.
- Redirect to actual submitted resource; real success copy **“اتضاف المصدر”**. PDF pending/finalization state must reflect reality.

### 2.8 Discussions and contributor identity
- **اسأل دفعتك** creates course-scoped topic/question; optional resource association; chronological visible replies, no nested chat.
- Copy: **“اسأل سؤال”**, **“رد على السؤال”**, **“مفيش أسئلة هنا لسه — اسأل أول سؤال”**.
- Student usernames, contribution counts and genuinely helpful feedback, but no global gamification scoreboard in version one.
- Public profiles exclude email, student ID, phone and private affiliation data.

### 2.9 Visual design system — Playful Academic (LOCKED DIRECTION)

**The founder rejected the former olive/quiet-paper art direction.** The visual reference is a cheerful pastel educational dashboard. Its relevant design principles are: bold rounded geometry, bright but soft module colors, crisp dark typography, purposeful colorful icons and polished visual spacing. **Do not copy** its busy dashboard, robots, gamified coins, leaderboards, revenue stats, or fake engagement.

**Canonical detailed spec:** `ELZATONA_DESIGN_SYSTEM.md`. **Canonical CSS variables:** `elzatona.tokens.css`. **Visual layout reference:** `Elzatona_Design_Preview.html` (static example, not connected product UI). Import and customize shadcn/Tailwind in one place. No arbitrary hex values in component code.

**Primary semantic palette:** page `#F6FAFD`, canvas `#EDF3FB`, surface `#FFFFFF`, ink `#172533`, muted ink `#5C6878`, primary `#176B87`, border `#DFE8F1`. Resource pastels: sky `#D5EDF7`, lavender `#E1E3FA`, pink `#F7DDF4`, sunshine `#FFF0C5`, mint `#DFF3E1`, peach `#FFE0D2`. Text on pastels uses the *paired dark ink token* from the design-system file, not white.

**Fonts:** Alexandria headings/wordmark + Tajawal body/UI (via `next/font` where supported). Test performance and legibility at 360px and 200% zoom; never load a large family without considering font optimization. Mixed-script technical text must use directional isolation.

**Shape:** friendly rounded (input 12px, button 14px, resource 18px, course 24px, special highlight 28px), 8px spacing system, outlined white resource rows, pastel course tiles, light visual elevation only when needed. One dark blue primary action per context.

**Signature motif:** a sparse **زتونة المادة** “helpful sticker” on a real curated resource. One per screen at most. Never invent curator picks or activity; no pointless confetti.

**Navigation:** For desktop, if a rail is useful, put a narrow icon-based rail on the **right** in RTL. On mobile, show compact top branding/search, not a shrunken desktop dashboard. Keep the first actual resource findable within a few taps. No giant decorative heroes.

**Required design acceptance:** Home/موادي, course hub, anonymous resource deep link, and contribution form share a coherent family at 360/390/768/1280px. Validate category color consistency, WCAG contrast, touch targets, reduced motion, typography, and no horizontal overflow. Founder sign-off on these four screen previews before nonessential component expansion. Read the dedicated design system for exact recipes and test checklist.

### 2.10 RTL + bidirectional content implementation (release blocker)
- Root document `<html lang="ar" dir="rtl">`; account/admin areas Arabic too. Do not ship an English-first shell with Arabic text pasted into it.
- Use CSS **logical properties** (`padding-inline-start`, `margin-inline-end`, Tailwind `ps-*`, `pe-*`, `ms-*`, `me-*` as supported). Avoid layout hacks and indiscriminate `flex-row-reverse`.
- English labels, URL domains, email, code, filenames, and mixed-script texts must be **bidi-isolated** with `<bdi>`, `dir="auto"`, or explicit `dir="ltr"` where appropriate. Make inputs for URLs/emails `dir="ltr"` even in RTL forms.
- Ensure `lang`, accessible labels, focus order, keyboard navigation, popover positioning, chevron directions, breadcrumbs, and slider icons make sense in RTL. **Vote arrows remain up/down; they are not RTL-mirrored.**
- Use intentional numeral/date policy: `Intl.DateTimeFormat('ar-EG')` for localized date display where appropriate; don't allow mixed numeric glyph styles in one component unpredictably. Keep raw technical identifiers/URLs/English code unchanged.
- Avoid fixed-height text containers that clip Arabic diacritics; test 200% text scaling, long titles, emoji, English acronyms, numerals and screen-reader labels.
- All user-visible strings live in `src/i18n/ar-EG.ts` (or simple typed message dictionary), not scattered hardcoded English. Do not build a heavy i18n framework unless multilingual UI is actually requested. Keep architecture ready for future English support.
- Use Arabic metadata (`title`, `description`, social preview) and reliable copy/share text. Social previews for dynamic resource deep links must reflect the actual title without exposing restricted content.

### 2.11 Seed Arabic microcopy for implementation

| Context | Copy |
|---|---|
| Logo/brand | الزتونة. |
| Homepage hero | موادك، من غير دوشة. |
| Homepage explanation | كل اللي محتاجه في موادك، مترتب وسهل تلاقيه. |
| Course section | موادي |
| Add/remove courses | تعديل المواد |
| Empty courses | لسه مضفتش موادك |
| Add course CTA | اختار موادك |
| Search placeholder | بتدوّر على ملخص، امتحان، أو شرح؟ |
| Within course search | دور جوّه المادة… |
| Resources tab | المصادر |
| Discussions tab | المناقشات |
| Lecture section | المحاضرات والموضوعات |
| Highlight section | زتونة المادة |
| Highlight explanation | مصادر مختارة من مجتمع المادة |
| Add contribution | ضيف مصدر |
| Contribution intro | ضيف مصدر يفيد دفعتك |
| Primary resource action | افتح المصدر |
| Save | احفظ |
| Share | شارك |
| Helpful | مفيد |
| Not helpful | مش مفيد |
| Ask | اسأل دفعتك |
| Login gate for save | سجّل دخولك عشان تحفظ المصدر |
| Empty resources | لسه مفيش مصادر هنا. عندك حاجة تفيد؟ |
| Form success | اتضاف المصدر |
| Invalid link | اللينك مش صالح. جرّب لينك بيبدأ بـ https:// |
| Report | بلّغ عن مشكلة |

Copy should be revised after testing with Egyptian university students; these are **starting microcopy**, not sacred slogans.

### 2.12 UX acceptance tests (not optional)
1. Direct WhatsApp link opens the exact resource anonymously; **no initial onboarding**.
2. New anonymous user can reach the selected resource from initial click with zero unnecessary actions.
3. Signed-in user with 3 followed courses sees **موادي** on `/`; with zero courses sees real empty state and actual pilot courses.
4. Logged-out **احفظ** prompts authentication, preserves deep link/intent, returns to correct resource; no automatic unauthorized write.
5. Course hub finds a relevant topic’s resources with a small number of taps, while preserving sort/filter query when navigating back.
6. Arabic and English text remain legible together on 360px Android and at 200% text zoom; no horizontal overflow or clipped glyphs.
7. On course with zero curator picks, **زتونة المادة** is not a fake empty featured promotion.
8. A real student can submit a link within 60 seconds without filling in a long profile.

## 3. Architecture and repository layout

**Architecture:** Browser -> Next.js App Router (pages + Server Actions/route handlers) -> Supabase Auth/Postgres/Storage. Public reads may use server-side Supabase clients under anonymous RLS. Authenticated mutations always verify identity on server AND rely on RLS. Supabase Postgres is the source of truth. No duplicated JSON fixture data in production paths.

```
src/
  app/
    (public)/page.tsx                 # anonymous finder / signed-in موادي via auth
    (public)/courses/page.tsx
    (public)/courses/[slug]/page.tsx
    (public)/courses/[slug]/resources/[id]/page.tsx
    (public)/courses/[slug]/discussions/[id]/page.tsx
    (authenticated)/saved/page.tsx
    (authenticated)/my-courses/page.tsx
    (authenticated)/profile/page.tsx
    courses/[slug]/submit/page.tsx
    courses/[slug]/ask/page.tsx
    login/page.tsx
    auth/callback/route.ts
    admin/reports/page.tsx
    admin/highlights/page.tsx
    api/resources/[id]/open/route.ts   # signed private PDFs / safe source redirects
    layout.tsx
    loading.tsx
    error.tsx
  components/
    ui/                               # shadcn primitives
    layout/
    courses/
    resources/
    discussions/
    home/                             # موادي + empty/new user views
    shared/
  features/
    auth/
    my-courses/
    highlights/
    courses/
    resources/
    discussions/
    moderation/
    analytics/
  i18n/
    ar-EG.ts                          # typed Arabic-first UI microcopy
  lib/
    supabase/client.ts
    supabase/server.ts
    supabase/proxy.ts
    supabase/database.types.ts
    validators/
    format-ar.ts                       # dates/numbers and bidi helpers
    permissions.ts
    url-normalization.ts
    utils.ts
  proxy.ts
supabase/
  migrations/
  seed.sql
  tests/
tests/
  e2e/
docs/
  PRD.md
  DECISIONS.md
  DESIGN_SYSTEM.md
  UX_RESEARCH.md
  IMPLEMENTATION_STATUS.md
.env.example
README.md
```

*Directory conventions are guidance. Adapt to the chosen template without introducing conflicting route groups or parallel implementations of the same feature.*

### Recommended libraries
- `@supabase/supabase-js`, `@supabase/ssr` for data and cookie-auth.
- `zod` for request validation. Use React Hook Form for multi-field client-side forms if it meaningfully simplifies them; native form + Server Action is fine for simple screens.
- `lucide-react`, shadcn/ui primitives and Tailwind.
- `date-fns` if needed; avoid arbitrary libraries for simple formatting.
- Vitest for utility tests, Playwright for end-to-end journeys, Supabase pgTAP/SQL for RLS behavior.
- Optional PostHog (without session replay or personal document contents), behind env configuration and the appropriate consent controls.

### Rendering and caching
- Read mostly public course and resource data through Server Components; introduce specific Client Components for filters, voting, saves, file upload, and discussion replies.
- Keep personalized content (my courses, last-seen course updates, my vote, my saves, auth state) out of shared full-page caching. Do not cache session-specific HTML/CDN responses as if they were public.
- Paginate lists (12–20 at a time); use `loading.tsx`/skeletons; revalidate course and resource paths after writes. Avoid N+1 fetching of vote counts.

---

## 4. Database model (write real migrations, not only TypeScript interfaces)

Use PostgreSQL UUID PKs, `timestamptz`, `CHECK` constraints, FKs, indexes, and generated TypeScript types. Canonical column names below; minor migrations may split for clarity.

### Tables

**`universities`**
- `id uuid pk`, `slug text unique not null`, `name text not null`, `name_ar text null`, `created_at timestamptz`. `name` is canonical/official fallback, `name_ar` is friendly Arabic display label (must not invent a translation if not known).
- Seed one authorized pilot university record, configured in one seed file. Other universities not exposed in initial UI.

**`courses`**
- `id uuid pk`, `university_id uuid references universities`, `slug text unique`, `code text`, `title text` (official fallback), `title_ar text null`, `title_en text null`, `department text`, `department_ar text null`, `description text`, `year_level smallint null`, `is_active boolean default true`, `created_at`. Prefer `title_ar` in Arabic UI, fall back to `title` when not available; optional English subtitle is `title_en`.
- Unique `(university_id, code)` if codes uniquely identify courses at that university; otherwise scope with department. Index university and title/code.

**`topics`**
- `id uuid pk`, `course_id uuid references courses`, `title text` (may contain familiar English technical term), `title_ar text null`, `sort_order int`, `created_at`. Prefer `title_ar` only when genuinely maintained.
- `UNIQUE (course_id,title)`, `UNIQUE (id,course_id)` to permit a composite FK from resources; topic must belong to the selected course.

**`profiles`**
- `id uuid pk references auth.users(id) on delete cascade`, `display_name text`, `avatar_url text null`, `created_at timestamptz`, `updated_at timestamptz`.
- Never store private email in this public profile table; auth email belongs in Supabase Auth. Insert safely via vetted Auth trigger or idempotent server upsert. Users can edit only their own display name/avatar (no elevated fields).

**`user_courses` (NEW — core requirement for موادي)**
- `user_id uuid not null references auth.users(id) on delete cascade`, `course_id uuid not null references courses(id) on delete cascade`, `created_at timestamptz default now()`, `primary key (user_id,course_id)`.
- Users may follow/unfollow **only their own** active courses; anyone can see public course details but nobody can see another user's saved/followed course list. One indexed query fetches followed courses (with course display labels) for signed-in `/`.
- Never treat following a course as verified enrollment, registered student status or rights to restricted material. Signing in via resource link does not silently follow the course.

**`user_roles`**
- `user_id uuid references auth.users(id) pk`, `role text check (role in ('moderator','admin'))`, `created_at`.
- Absence of row means normal student. User-role changes are **not** available through browser CRUD or student RLS. Provision initial moderator/admin manually via protected SQL or separate audited administrator operation. Do not use `raw_user_meta_data` or profile edit controls for authority.

**`resources`**
- `id uuid pk`, `course_id uuid not null references courses`, `topic_id uuid null`, `author_id uuid not null references profiles`, `title text not null`, `description text null`, `type text not null check (type in ('notes','slides','past_exam','video','question_bank','reference','other'))`,
- `source_kind text check (source_kind in ('external','pdf'))`, `external_url text null`, `normalized_url text null`, `storage_path text null`,
- `semester_label text null`, `is_ai_assisted boolean default false`, `rights_confirmed boolean not null default false`,
- `status text check (status in ('pending','published','hidden'))`, `upvotes_count int not null default 0`, `downvotes_count int not null default 0`, `created_at`, `updated_at`.
- Database `CHECK` exactly one applicable source: external URL for external, storage path for PDF. Constrain title length 4–160, description max 2000, semester max 40. Add composite FK `(topic_id,course_id) -> topics(id,course_id)` when topic not null.
- Partial unique index `(course_id,normalized_url)` for external links when `normalized_url` not null (choose an explicit policy for hidden duplicates).
- Index `(course_id,status,created_at desc)`, `(course_id,type)`, `(topic_id)`, `(author_id)`. Vote counts are database-maintained, never directly client-modifiable.

**`course_highlights` (NEW — manually curated زتونة المادة)**
- `id uuid pk`, `course_id uuid not null references courses(id)`, `resource_id uuid not null references resources(id)`, `position smallint not null check (position between 1 and 3)`, `curator_id uuid not null references auth.users(id)`, `curator_note text null`, `created_at timestamptz`.
- `unique(course_id,resource_id)`, `unique(course_id,position)`; constrain that the selected resource is from the same course through composite FK or verified privileged database function. Only published resources appear in public highlights.
- Write operations restricted to moderators/admins with a narrow auditable path. No algorithm that auto-labels the most-upvoted resource as editorially checked. If zero records, hide section entirely.

**`resource_votes`**
- `resource_id uuid references resources on delete cascade`, `user_id uuid references auth.users`, `value smallint not null check (value in (-1,1))`, `created_at`, `updated_at`, `primary key (resource_id,user_id)`.
- Voting semantics: first click inserts, same click removes, opposite click switches. A user has at most one active vote per resource. DB trigger (or tightly controlled database function) updates `resources.upvotes_count` / `downvotes_count` transactionally; no client-sent totals. Recommended: disallow voting on hidden items and on your own resources.

**`resource_saves`**
- `(user_id uuid,resource_id uuid)` composite PK, `created_at`; FK references users/resources. Saves only visible to owner; counts not public in MVP.

**`discussions`**
- `id uuid pk`, `course_id uuid references courses`, `topic_id uuid null`, `resource_id uuid null references resources`, `author_id uuid references profiles`, `title text`, `body text`, `status text default 'published' check ('published','hidden')`, `created_at`, `updated_at`.
- Validate `topic_id` belongs to same course; when linked, the resource also belongs to same course. Title <=160, body <=5000. Index course/status/date and resource ID.

**`discussion_replies`**
- `id uuid pk`, `discussion_id uuid references discussions on delete cascade`, `author_id uuid references profiles`, `body text`, `status text default 'published' check ('published','hidden')`, `created_at`, `updated_at`.
- No nested replies in V1; chronological order, no separate voting system at first. Max body 3000.

**`reports`**
- `id uuid pk`, `reporter_id uuid references auth.users`, `resource_id uuid null`, `discussion_id uuid null`, `reply_id uuid null`, `reason text check (...)`, `details text null`, `status text default 'open' check ('open','resolved','dismissed')`, `created_at`.
- `CHECK (num_nonnulls(resource_id,discussion_id,reply_id)=1)`. Unique reporter+target partial indexes prevent repeated reports. Reasons: spam, inaccurate, copyright, abusive, other. Moderators see and resolve; reporter may see only their own. Add reasonable per-user throttling at mutation endpoints.

### Optional lightweight `product_events` / PostHog
Prefer one analytics provider and a small shared `track()` wrapper. If collecting first-party events, store a minimal action type, timestamp, coarse source/referrer and pseudonymous user ID; never capture note content, URLs containing sensitive tokens, email addresses, or discussion body. Document user privacy/consent.

### Full-text search
Initially use parameterized case-insensitive title/description matching with course scope and pagination; ensure the result set is small and responsive. When content grows, add a generated `tsvector` + GIN index and a parameterized `search_resources(course_id, query, filters...)` Postgres function, or Postgres full-text indexes. **Do not integrate embeddings/vector AI search in MVP.**

### Migrations and seeds
- `001_core_schema.sql`, `002_rls_and_grants.sql`, `003_vote_counts_and_helpers.sql`, `004_storage_and_moderation.sql`, `005_user_courses_highlights_localization.sql` (or equivalent well-organized numbering from scratch).
- Seed a demo Egyptian university label only if the actual university and permission are supplied by the founder; otherwise use a clearly fictional **Demo University / جامعة تجريبية**. Seed 3 courses, 6–12 generic topics each, Arabic UI/display labels alongside real English CS terms, and a small set of safe **explicitly authorized or clearly labeled demo** resources. No invented real past exam PDFs. Keep dev/test fixtures separate from production seed.
- Have repeatable `supabase db reset`, type regeneration and safe deployment procedures. Do not edit production schema by hand without a migration.

---

## 5. Authorization, storage, and safety (critical)

### Supabase Auth
- Google OAuth as primary login for student ease; retain a graceful “provider not configured” setup state in development. OAuth callback uses a validated relative `next`/return path, not arbitrary open redirects.
- Current SSR cookie helpers via `@supabase/ssr`; `getClaims()` (or a current verified Auth-server user check when needed) to protect server actions/pages, **not the unverified session user object**.
- Keep public browsing open; on attempted vote/save/post, preserve destination and ask user to sign in.
- Delete profile safely when Auth account is removed; no public email in profile view.

### RLS and database privileges matrix
- `universities`, `courses`, `topics`: public `SELECT` on active, administered content; inserts/edits through protected admin operations only.
- `profiles`: public read non-sensitive columns; insert own (or protected trigger); update only own editable profile columns. Explicit **column privileges** or verified RPC so the client cannot edit role/created_at/system values.
- `user_roles`: only trusted admin read/write; public/students cannot insert/update/delete. Expose a narrowly scoped `is_moderator()` check when needed, with safe fixed `search_path` and locked-down EXECUTE grants.
- `resources`: anonymous/public read **published** only; authors can read their own pending; mods read hidden/pending. Student may create own external published resource or create own pending PDF upload. Student editable only allowed metadata columns; cannot self-change `author_id`, course ID, `status`, score counters, or storage path after creation. Admin moderation uses a verified, narrow server/RPC operation; never grant unrestricted update to all authenticated users.
- `resource_votes`: auth required, only own vote inserted/updated/deleted; enforce visible resources and optional no-self-voting via database policy. Restrict read of user vote identities to the owner; aggregate totals are public on published resources.
- `resource_saves`: only owner read/write.
- `user_courses`: only owner read/write. Reading a public course is separate from following it.
- `course_highlights`: public reads only if linked resource is published; trusted moderator/admin only insert/update/delete; enforce course match, max 3 slots and position uniqueness.
- `discussions`/`discussion_replies`: published items publicly readable, author can create/edit own allowed content, moderators can hide. Restrict cross-course reference manipulation and system status changes.
- `reports`: reporter creates and views own; moderators view/resolve. A report doesn't automatically delete anything unless a conscious moderation rule is implemented.
- Write automated tests for forbidden operations **directly against Supabase as an unprivileged user**, not just via the UI.

### PDF upload lifecycle
1. Student submits PDF resource metadata; server creates a `resources` row with `source_kind='pdf'`, `status='pending'`, resource UUID and a unique user-scoped storage path such as `<user-uuid>/<resource-uuid>.pdf`.
2. Storage private bucket `course-pdfs`; object INSERT limited to authenticated user's own prefix; reject overwrite/upsert; maximum 15 MB and allow PDF only. Validate file header/server metadata as far as feasible; no executable documents. Prevent public arbitrary file listing.
3. Client uploads via Supabase storage, with progress and error state.
4. Call protected `finalizeUpload(resourceId)` operation that verifies authenticated author, file path, object ownership/existence, PDF size/type before transactionally transitioning resource to `published`. Do **not** permit generic UPDATE of status from the browser. If missing or invalid, remain pending and show retry/remove option.
5. On open, server verifies resource is published (or viewer is owner/moderator), then issues a **short-lived signed URL**. Never expose a permanent public URL for a moderated/private file.
6. Implement cleanup of stale pending metadata/orphan uploads as an admin maintenance action; document it. On moderation hide, new signed URLs must not be issued; note previously issued signed URLs may remain usable until expiration.
7. For rapid prototype work, initially implement external links first and add the upload lifecycle as its own milestone. Do not take the shortcut of making all uploaded material permanently public.

### Link safety, spam and content rights
- Only accept `https:` URLs; reject `javascript:`, `data:`, local/loopback/link-local addresses and unsafe redirects in server-owned requests. Do not fetch arbitrary submitted links from your server; just display them with safe target attributes. A future metadata fetcher needs strict SSRF defenses.
- Normalize obvious YouTube/Drive URLs where feasible, strip known tracking parameters; never strip access tokens needed for link function without testing.
- Users confirm rights to share/upload. Provide visible attribution, report content/copyright reasons, and a takedown workflow. Don't imply professors authorized uploads or public past exam publication.
- Basic mutation throttles (e.g. configurable max links/comments per student per hour, and submission caps during onboarding) implemented server-side, not merely by disabling buttons. Add moderator-controlled hide actions and log moderation decisions.
- Plain text rendering or carefully sanitized Markdown only. No arbitrary HTML in descriptions or discussion content; URLs rendered as safe links. Prevent XSS.
- Storage restrictions and RLS should be evaluated against current Supabase documented behaviors and covered in a browser + SQL smoke test.

---

## 6. Vertical-slice implementation roadmap

Every phase ends with a working, reviewable vertical slice and test evidence. **Quality gates:** real Supabase state, RTL QA, no fake UI affordances, no unsupported success claims.

### Phase 0 — Foundation + brand system
**Tasks:** Inspect repo; set up official Next.js/Supabase starter, TypeScript strict, Tailwind, shadcn, migrations, docs, lint/test. Build `<html lang="ar" dir="rtl">`; `ar-EG` typed copy dictionary; the locked Playful Academic semantic tokens, Alexandria/Tajawal typography; responsive app shell; logo as carefully typeset **الزتونة.**; Arabic loading/error/empty primitives; a 360px homepage wireframe.

**Acceptance:** Real text legibility (Arabic + English) on 360px and desktop, cohesive cheerful pastel design with no olive or random colors, no clipping/overflow; WCAG AA contrast check; env setup honest; dev/lint/typecheck/build pass where environment permits; design system documented with screenshots or review notes.

### Phase 1 — Real Supabase schema, auth + followed courses
**Tasks:** Migrations, RLS, authorized demo seeds, profiles/roles, all core tables plus `user_courses` and `course_highlights`. Google OAuth, callback and safe deep-link return; follow/unfollow course; anonymous pilot course finder; signed-in **موادي** with zero, one and many courses.

**Acceptance:** Logged-in `/` displays actual followed courses; visitor `/` shows finder rather than fake personalization; no accidental auto-follow; only owner may modify `user_courses`; all cross-user access tests pass. OAuth works only once human config is supplied; report blocked status honestly.

### Phase 2 — The core find/share-link journey
**Tasks:** Arabic course hub, lecture/topic organization, real resources, filters/search/sort, resource details, outbound source opening, public deep links, honest related resources, OG metadata and mobile share/copy. Make external link flow first. Use context preserving back links.

**Acceptance:** No-login WhatsApp deep link loads exact resource; user can open original source, find more from same topic and share URL; mixed-direction strings render; filter/search query persists; 360px Android no horizontal overflow or obscured CTAs.

### Phase 3 — Student contribution
**Tasks:** Auth-gated external URL submission, clear consent, duplicates, author edits, then pending private PDF upload/finalize and signed download. Arabic error/success states, single dominant CTA, source attribution and upload progress. Preserve auth return destination.

**Acceptance:** Real student submits valid link in <60 seconds; duplicate redirects to existing; unauthorized author/course edits fail; signed PDF access is appropriately scoped and moderated; failed upload recoverable.

### Phase 4 — Community feedback + زتونة المادة
**Tasks:** Votes, saves, saved page, public contributor profile. Moderators may manually pin 1–3 published resources as **زتونة المادة**, with honest editorial label. Auth gate for follows/votes/saves preserves intent but does not silently mutate data; no generic social feed.

**Acceptance:** Votes/counters consistent; saved data private; curator cannot highlight another course's resource or hidden content; highlights absent when uncurated; moderator decisions logged; Arabic cards reflect real data only.

### Phase 5 — Discussions + moderation
**Tasks:** Ask/reply/list/resource-linked Q&A, reporting, basic rate limits, moderator report queue and hide/resolve; privacy/community/copyright guidance in appropriate clear Arabic.

**Acceptance:** Another student can answer; question linked to right course/resource; hidden content unavailable to normal visitors; RLS and moderation tests pass.

### Phase 6 — Launch-hardening, analytics + real-user QA
**Tasks:** Loading states, RTL/mobile accessibility, Android slow-network verification, Vercel deployment setup, Arabic metadata, event instrumentation, RLS/Storage audit, migration reset, research scripts for first 100. Test local-to-staging with founder-supplied credentials.

**Acceptance:** 10 realistic first-time user sessions including WhatsApp → exact resource, signed-in home, save/login return, contribution; no false counters or blockers; zero critical security/privacy issues; honest test/deployment report.

### Phase 7 — Optional native quiz (only after the above)
**Scope:** Manual course/topic MCQ sets with reviewed answers. Use simple `quiz_sets`, `quiz_questions`, `quiz_options` with moderation and one correct answer. Responsive Arabic quiz player; technical text may remain English. No AI generation, streaks, or massive progress dashboard.

**Gate:** Implement only when resource-sharing release is stable and students show demonstrated demand for native practice; linked third-party authorized question banks work for launch.

## 7. Reusable UI components (build only as needed)

Implement `PlayfulAcademicAppShell`, `BrandWordmark`, `CourseTile`, `ResourceTypeChip`, `ZatonaPick`, and `ResourceRow` according to `ELZATONA_DESIGN_SYSTEM.md`. Components must consume semantic design tokens.

- `AppHeader`, `ArabicWordmark`, `CoursePicker`, `CourseHeader`, `MyCoursesSection`, `MyCourseRow`, `FollowCourseButton`, `FirstUseCoursePicker`, `CourseActivityLine`.
- `ResourceCard`, `ResourceTypeBadge`, `ResourceFilterBar`, `TopicNavigator`, `ResourceVoteButtons`, `ResourceSaveButton`, `ShareResourceButton`, `ExternalResourceLink`, `CourseHighlights`, `WhatsAppShareAction`.
- `ResourceSubmissionForm`, `PdfUploadDropzone`, `TopicSelector`, `ContributorLabel`.
- `DiscussionCard`, `AskQuestionForm`, `ReplyForm`, `ReportDialog`.
- `EmptyState`, `ErrorState`, `AuthGate`, `FormSubmitButton`, `LoadingSkeleton`, `BidiText`, `ArabicDate`, `ArabicMeta`, `ArabicFormField`.
- shadcn: button, input, textarea, form, select, tabs, badge, dialog, dropdown, toast/sonner, card, skeleton, sheet, avatar.

**Interaction rules:** Votes and saves should feel instant but reconcile server failure (optimistic UI with rollback). Submission should have single decisive CTA, prevent double submit, preserve filled values on errors, and navigate to the real record on success. Accessibility and focus state should be checked.

---

## 8. Server actions, database responsibilities and permissions

Avoid inventing a monolithic REST API. Prefer typed functions and server actions aligned with each feature:

```
getPilotCourses()
getMyCourses(userIdFromSession)
followCourse(courseId)
unfollowCourse(courseId)
getCourseUpdatesSinceLastVisit(courseId)  # only if honestly measurable; otherwise omit UI
getCourseBySlug(slug)
listCourseResources({ courseId, type?, topicId?, search?, sort?, page? })
getResource(resourceId)
getPublishedCourseHighlights(courseId)
setCourseHighlight(courseId, resourceId, position, note?)  # moderator-only
removeCourseHighlight(courseId, position)                  # moderator-only
submitExternalResource(validatedInput)
createPendingPdfResource(validatedMetadata)
finalizePdfUpload(resourceId)
updateOwnResourceMetadata(resourceId, validatedInput)
setResourceVote(resourceId, value | null)
toggleResourceSave(resourceId)
listCourseDiscussions({ courseId, topicId?, page? })
createDiscussion(validatedInput)
createReply(discussionId, validatedBody)
createReport({ targetType, targetId, reason, details? })
moderateContent({ targetType, targetId, action })
getUserPublicProfile(id)
```

The agent must specify which functions are server-only, which use browser Supabase with RLS, and which are database RPC. In every write: validate input (Zod), verify identity, ensure entity/course relation, rely on RLS, return typed outcome, then revalidate affected pages. Use short server action errors safe for user display, not raw SQL errors.

**Ranking:** `score = upvotes_count - downvotes_count`; order `score DESC, created_at DESC` for “most helpful”; show no fake 'verified by professor' stamps. Tie-break by date. If a resource is deleted/hidden, it is not eligible for normal browse/search/signed downloads.

**Moderation logging:** At minimum add `moderation_actions(id,actor_id,target_type,target_id,action,reason,created_at)` when implementing moderator controls. Mutations should run in a verified server/database boundary with audit trail; not editable by students.

---

## 9. Test plan and quality bar

### Unit tests
- URL normalization and unsafe URL rejection; YouTube and Google Drive variants.
- Form validation and duplicate identification.
- Vote toggle/change/count calculation helper.
- Course/topic cross-reference validation.
- Arabic strings and formatting helpers including mixed Arabic/English, URL bidi isolation and safe deep-link return.
- Following/unfollowing and course highlight course-match/position constraints.

### Supabase authorization/SQL tests (important)
1. Anonymous can read published course/resources/questions but not unpublished or reports.
2. Student A cannot edit/delete Student B's resource/discussion/reply/profile.
3. Student cannot set role=admin, modify resource author, status, upvote totals or storage path through direct API.
4. Student can't vote twice on same resource, vote their own resource if disallowed, or inject non ±1 values.
5. Student can't attach a topic/resource from Course B to a Course A post.
6. Student cannot read another user's Saved resources or reports.
7. An unauthorized Storage user cannot overwrite or list arbitrary private PDFs; published signed-download route honors visibility.
8. A moderator can hide reported content; regular students cannot call moderator operations.
9. `reports` accepts exactly one target; no arbitrary bulk submissions.
10. Vote insert/update/delete trigger never produces negative counts or permanently inconsistent totals during concurrent access.
11. Student cannot read another student's `user_courses`, forge follows, or self-promote to curator.
12. Student cannot curate `course_highlights`, cross-link resources from another course, highlight hidden content, or exceed 3 positions.

### Playwright critical-path tests
- Anonymous WhatsApp deep link -> exact resource -> open source -> related course resources -> copy/share; **no signup prompt blocking reading**.
- Anonymous root -> search pilot course -> topic -> find source.
- Signed-in student with zero courses -> choose course -> `/` shows **موادي**; unfollow removes course; no other student can view list.
- Unauthenticated save/vote -> explanatory Google login -> same resource/intent preserved -> user explicitly completes action (do not auto-cast vote on callback).
- Signed-in student -> submit external link -> view it -> edit own metadata -> other student cannot edit it.
- Student -> save -> Saved page -> unsave.
- Student -> ask question -> another student replies.
- Student -> report -> moderator hides -> content disappears from public lists.
- Signed-in PDF submit -> upload -> finalize -> open signed URL -> unauthorized resource blocked.
- Direct navigation to a nonexistent course/resource -> meaningful 404.

### Manual QA
- Actual Android/Chrome at 360 px, 200% font scaling, and a desktop browser, Arabic browser locale where possible.
- Loading and slow network, browser back, non-auth navigation, stale sign-in callback, URL copy/share, keyboard navigation, focus rings, truncation, long Arabic titles + English technical terms, RTL popovers, Arabic date formatting, no clipped glyphs, errors/empty lists.
- Test one real mobile WhatsApp deep link end-to-end; optimize for that referrer.
- Measure a user's ability to find a resource without your guidance.

**Release gate:** No high-severity auth/RLS vulnerabilities, broken primary action, misleading placeholders or data leakage. Pass build, typecheck, test suite, and migration reset before inviting actual students.

---

## 10. Instrumentation and learning loop

### Event definitions
- `landing_viewed`, `resource_deeplink_viewed`, `my_courses_viewed`, `course_followed`, `course_unfollowed`, `course_viewed`, `course_searched`, `resource_opened`, `resource_shared`, `resource_submitted`, `resource_voted`, `resource_saved`, `question_posted`, `reply_posted`, `report_submitted`, `signup_completed`.
- Properties: course_id, resource_type, topic_id, source category, actor pseudonymous ID; no raw document content or private URLs.
- Differentiate resource detail page view from actual outbound click/download (`resource_opened`).

### Manual research
- Before launch: interview 10–20 students; have them demonstrate the current search pain with WhatsApp/Drive.
- In pilot: recruit class representatives and strong note contributors to seed 3 courses using permissioned existing links.
- After launch: ask 10 Egyptian students to find one specific course resource in **Arabic**, with mixed English terminology, without instructions; include one WhatsApp deeplink and one signed-in موادي session; observe taps/time/confusion.
- Review top searched keywords, failed searches, most opened resources, percentage of shared links, submissions per active student, activation and 7-day retention.
- Keep one 2-week iteration backlog based on behavior, not new feature ideas.

### Decision thresholds (hypotheses, not guarantees)
- **If many browse but few click sources:** Resource relevance, link quality, search sorting, or metadata is wrong.
- **If many open but few sign up:** Make browse useful and put sign-in at the moment of voting/saving/contributing; test the exact ask.
- **If users download but never contribute:** Recruit champions; simplify submission further; test meaningful contributor recognition and direct appreciation.
- **If engagement spikes only at exam time:** Position and monetization may fit exam-season study, not year-round community; don't force artificial social behavior.
- **If many discussions occur in WhatsApp instead:** Make sharing deep links and resource-linked questions easier, not an imitation chat app.

---

## 11. Production setup checklist for the human owner

- [ ] Create GitHub repository, Supabase **development** and **production/staging** projects as appropriate, and Vercel project.
- [ ] Obtain Supabase project URL and publishable key; set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Use current official naming; adapt to starter if it uses a documented alias. Never commit secret/admin keys.
- [ ] Configure Google OAuth app/provider, approved redirect URIs and app hostnames in Google Cloud + Supabase Auth.
- [ ] Configure Supabase Auth Site URL and redirect allowlist for localhost, preview, and production domain. Avoid overly broad production redirect patterns.
- [ ] Create private `course-pdfs` bucket (or create through migration if supported), 15 MB cap, PDF MIME restriction, and documented Storage RLS rules.
- [ ] Put selected Egyptian university/department/courses and verified public/permissioned source links into production curation seed; dev/demo data clearly labeled. Add genuine Arabic title where known; do not invent campus affiliation.
- [ ] Verify brand/domain/trademark feasibility for “Elzatona / الزتونة” before buying brand assets or marketing heavily.
- [ ] Recruit 5–10 students to review Arabic voice, course names, RTL interaction and use of English subject terminology on actual Android phones.
- [ ] Set production environment variables in Vercel; do not expose server-only secrets with `NEXT_PUBLIC_` prefix.
- [ ] Add contact email, privacy information, community rules, copyright/takedown form, and basic reporting policy.
- [ ] Choose analytics consent settings and exclude private/student content from event payloads.
- [ ] Verify rate limits and backup/recovery settings appropriate to Supabase plan.
- [ ] Invite 10 contributors, then 30 initial students, then expand to 100 real sign-ups once reporting and basic operations work.

### `.env.example`
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
# Optional, only when PostHog tracking is configured with proper consent:
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

---

## 12. Commands and workflow for the coding agent

**Bootstrap:** Check current official starter command and generated scripts. Typical commands include:

```
# Adapt if using npm instead of pnpm; keep one package manager throughout
pnpm dlx shadcn@latest init
pnpm add zod lucide-react
pnpm add -D supabase vitest @playwright/test
pnpm exec supabase start
pnpm exec supabase db reset
pnpm exec supabase gen types typescript --local > src/lib/supabase/database.types.ts
pnpm exec playwright install chromium
pnpm dev
pnpm build
```

**Do not blindly run example commands if their syntax conflicts with the installed CLI or starter.** Initialize Supabase using the official local development workflow and track migrations in git. Add scripts for `lint`, `typecheck`, `test`, `test:e2e`, and `build`. If Docker/Supabase local is unavailable, document the blocker and keep schema/test work runnable when credentials are provided.

### Coding standards
- TypeScript strict, no pervasive `any`, no suppressing errors to get a green build.
- Keep components focused and server-first, file sizes manageable, shared zod schemas, typed function results.
- Use clear SQL ownership and RLS; no broad `USING (true)` write policies for authenticated users.
- No raw HTML injection, no trusting client-provided admin fields or vote counts.
- Semantic, accessible controls and explicit confirmation for destructive moderator actions.
- README describes setup from clean clone; `.env.example` uses empty placeholders only.
- At end of each phase write: delivered features, files/migrations touched, tests run and results, screenshots/test instructions, known blockers, next phase.

---

## 13. Suggested order of agent prompts (if the agent works best in short sessions)

**Session 1:** “Read Elzatona blueprint and repo. Implement Arabic-first `lang=ar` RTL shell, the Playful Academic pastel/blue token system from ELZATONA_DESIGN_SYSTEM.md and elzatona.tokens.css, typed Egyptian Arabic copy dictionary, Supabase schema including `user_courses`/`course_highlights`, auth/RLS, and first runnable 360px interface. Do not make a generic SaaS template.”

**Session 2:** “Implement real anonymous finder vs signed-in موادي homepage; followed courses, empty state; real course filters/topics, resource detail; WhatsApp deep-link open without signup and correct Arabic preview; Android/RTL tests.”

**Session 3:** “Implement fast Arabic resource submission with auth-return context, duplicates, author edits, votes/saves, contributor profile and readable errors; prove 60-second task end-to-end.”

**Session 4:** “Implement secure PDF pending/upload/finalize/signed-download lifecycle, error recovery and Storage policies. Prove unauthorized access fails with tests.”

**Session 5:** “Implement course/resource discussions and moderation plus honest hand-curated زتونة المادة picks, editor permissions, report queue, audit and rights/privacy pages in clear Arabic.”

**Session 6:** “Run Arabic RTL/Android/slow-network/200% zoom/accessibility/security audit; test anonymous WhatsApp entry and signed-in موادي; analytics without private payloads; deployment/runbooks.”

**Session 7 (optional):** “After core release gate, build the smallest useful native course question-bank quiz, no AI or unnecessary gamification. Link it into existing resource architecture.”

---

## 14. Strict definition of done for the first 100-user launch

- A prospective Egyptian student landing from WhatsApp on a direct resource URL can see the **exact** Arabic-context resource, open legitimate material, and browse related items **without registration**.
- A signed-in student sees **موادي** populated with their explicitly followed courses; an account with no courses gets a useful course-picker empty state. Student can add a real external link within 60 seconds and later see it under correct course/topic.
- A signed-in student can share a PDF safely and recover from failed uploads.
- Someone else can vote, save, ask a question, and reply; state survives refresh and is correctly restricted by RLS.
- A moderator can review, hide and resolve reported contributions, including unauthorized uploaded content.
- No system relies on fake engagement data; realistic seeded content is explicitly permitted.
- Search/filter/links work on 360 px Android with real Arabic UI, mixed English topic names, RTL-aware navigation and 200% text zoom; keyboard accessible; primary controls have understandable Arabic loading/empty/error states.
- Generated TS database types are in sync; clean migration works; RLS and core E2E tests pass.
- `README.md` allows another engineer to run locally and deploy given their own credentials.
- Telemetry can answer: How many registered? How many followed courses? How many WhatsApp entrants actually opened sources? How many activated, contributed, shared, and returned?

---

## 15. Detailed UX deliverables required from agent

Before polishing, create a **working three-screen prototype backed by real pilot/dummy-safe data** and get founder feedback:

1. **Logged-in `/` — موادي:** Search, followed course list, one truthful line of useful updates, quiet contribute CTA; compare zero/three-course states.
2. **Course hub:** Course/lecture organization, source filters, real resource rows, hand-curated **زتونة المادة** only if approved picks exist, discussion entry.
3. **Direct resource link:** Arabic course breadcrumb, genuine resource metadata, single dominant open action, save/share/vote affordances and same-topic recommendations; anonymous state is complete.

For each, document: 360px mobile screenshot, 768px tablet, desktop; empty/loading/error versions; copy review; contrast result; RTL/BiDi audit; time-to-find task observations. If screenshot automation is unavailable, provide manual reproducible QA steps instead of claiming screenshots.

**Anti-AI-slop review criteria (fail any generic look):**
- Can the Elzatona screen be mistaken for an arbitrary purple student dashboard? If yes, redesign.
- Are there meaningless widgets, fake stats, decorative 3D illustrations, sparkles, oversized welcome sections or student “productivity scores”? Remove.
- Is the Arabic natural, consistent and concise? Would classmates actually use those terms?
- Does a resource title and primary action appear on the first phone screen without scrolling past marketing filler?
- Are course names, subject terms and bilingual file titles readable without bidi glitches?
- Do interactive controls provide actual working outcomes and honest states?
- Do all decisions help the real tasks **Find / Share / Discuss**?

### First-week moderated usability script (Arabic)
- “افتح اللينك ده من جروب واتساب وورّيني هتفتح الملخص إزاي.”
- “أنت مسجل دخول. ادخل على مادة هياكل البيانات من موادي.”
- “عايز تعرف فين شرح الـ Binary Trees، تلاقيه إزاي؟”
- “معاك فيديو حلو للمحاضرة. ضيفه على الزتونة من غير ما أساعدك.”
- “في ملخص فيه معلومة غلط، هتعمل إيه؟”
- “احفظ المصدر، وبعدين ارجع افتحه تاني.”

Collect actual number of taps, time-to-source, success/failure, confusion quotes, device widths and weak-network pain. Do not hide friction by coaching participants.

---

## 16. Primary reference documentation (check for changes while implementing)

- Official Supabase Next.js starter: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
- Supabase SSR client and verified auth: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Supabase Postgres RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase private Storage and signed URLs: https://supabase.com/docs/guides/storage/buckets/fundamentals
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Supabase local migrations and types: https://supabase.com/docs/guides/local-development
- Supabase Google OAuth: https://supabase.com/docs/guides/auth/social-login/auth-google
- Next.js App Router: https://nextjs.org/docs/app
- shadcn/ui Next.js installation: https://ui.shadcn.com/docs/installation/next
- Next.js + Playwright: https://nextjs.org/docs/app/guides/testing/playwright

## Final note to the agent

The test is not “how many impressive screens can you draw?” It is “can an Egyptian student using a real Android phone find the correct resource faster than in WhatsApp/Drive, and share something useful without friction?” Protect the Arabic-first experience, the course information structure, the permission model, and the distinctly student-owned character of **الزتونة**. Ship the smallest coherent and secure slice, then iterate from observed behavior, not AI-generated feature lists.
