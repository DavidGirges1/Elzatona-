# Elzatona / الزتونة — Playful Academic Design System

**Status:** Proposed visual direction approved for implementation exploration, pending founder review of real screens. **Version:** 1.0 | 22 October 2026  
**Audience:** Egyptian university students; Arabic-first, RTL-first, mobile-first.  
**Visual reference:** Founder-provided colorful dashboard screenshot. Use the *principles* (confident color blocking, rounded modules, lively icon accents, tight visual hierarchy), not its composition, robot illustrations, fake metrics, economy mechanics, or leaderboard.

## 1. Brand thesis and tone

**Personality:** optimistic, clever, friendly, confident, helpful, academic without being institutional. “A good Egyptian student friend who organizes everything” — not “childish edtech game” and not “enterprise admin SaaS.”

**Product hierarchy:** usefulness first, delight second. Each screen answers a practical question in 5–10 seconds. Homepage = **موادي**, course = organized materials by topic, resource detail = **افتح المصدر**, contribution = **ضيف مصدر**. Group chat remains the distribution channel; Elzatona remains the permanent home.

**Four visual rules:**
1. A **cool, airy base** (white and near-white blue) carries most reading and navigation surfaces.
2. **Pastel panels create orientation**, not decoration. Use colored fills for a small number of course tiles, type badges, empty states, and a curated feature; dense lists stay white.
3. **Strong ink and one primary dark teal-blue** give the interface an adult anchor and accessible action hierarchy.
4. **Playful details have a job**: custom document illustration, tiny geometric accent, specific icon or helpful microinteraction. No random 3D robots, sparkles, coin counters, cartoon pyramids, or fake scoreboards.

## 2. Exact color system — no olive

Use `/styles/elzatona.tokens.css` or the provided `elzatona.tokens.css`. Avoid arbitrary hex values in components; use semantic tokens. All foreground/background pairs below are selected to target >=4.5:1 for normal text, but audit rendered states and mixtures in the browser.

| Name | Hex | Role |
|---|---|---|
| Canvas | `#EDF3FB` | External canvas, soft chrome |
| Page | `#F6FAFD` | Main page background |
| Surface | `#FFFFFF` | Primary cards, text areas, lists |
| Ink | `#172533` | Titles/body |
| Muted ink | `#5C6878` | Secondary text |
| Border | `#DFE8F1` | Dividers/card outlines |
| Primary | `#176B87` | Main CTA, active control, focus-adjacent UI |
| Primary hover | `#12556D` | Hover/pressed CTA |
| Sky | `#D5EDF7` | Video/learning references or highlighted navigation |
| Lavender | `#E1E3FA` | Student notes |
| Pink | `#F7DDF4` | Videos |
| Sunshine | `#FFF0C5` | Past exams |
| Mint | `#DFF3E1` | Practice/question banks |
| Peach | `#FFE0D2` | Discussions/feedback |
| Sky ink | `#185776` | On sky |
| Lavender ink | `#453BA2` | On lavender |
| Pink ink | `#92246C` | On pink |
| Sunshine ink | `#815000` | On sunshine |
| Mint ink | `#256642` | On mint |
| Peach ink | `#A14927` | On peach |
| Success | `#237C4B` | Positive feedback, never use alone |
| Danger | `#B9384B` | Report/destructive/errors |

**Roles:** Dark teal-blue, NOT bright gradients, is the only main-action fill. Reserve warm saturated accents for small category identifiers and special states. Never write white text directly on any pastel. Never use a tinted chip alone to signify resource type; pair with icon and label.

**Distribution guide:** ~75% neutral white/page/ink, ~20% pastel panels, ~5% strong dark primary/accent. This is an art-direction heuristic, not a measurable design requirement.

**Category mapping (deterministic):** `student_notes -> lavender`, `slides -> sky`, `past_exams -> sunshine`, `videos -> pink`, `question_bank -> mint`, `discussion -> peach`; `references/other -> neutral`. Use the same mapping in filters, cards and resource details. For course tiles, assign 1 of 4 pastels deterministically by stable course ID; never randomize per render. No color-only communication.

## 3. Typography and Arabic rendering

- Headings + wordmark: **Alexandria** (600–700). Its geometric personality is the brand voice. Body/UI: **Tajawal** (400/500/700); this pair must be visually tested in actual Arabic screens before locking. Do not introduce additional decorative fonts. If bundle/load performance is poor, use Alexandria for headings only and a lean system Arabic fallback; no FOIT/blank screens.
- Never apply English-style letter-spacing/tracking to Arabic copy. Keep Arabic baseline/line height roomy: body `1.6–1.75`, headings `1.35–1.5`. Test diacritics and increased text size.
- Roles: display 30/36 mobile (34/43 desktop); H1 24/34; H2 20/30; title 17/27; body 15–16/25–28; secondary 13–14/22; overline 12/18. Never use micro 10px text for essential information.
- English CS terminology, filenames, code and URLs: `<bdi dir="auto">` or a controlled `dir="ltr"`; URL and email inputs LTR. Don't force academic terminology into unnatural Arabic. Root `<html lang="ar" dir="rtl">`.
- Copy examples: “موادك، من غير دوشة.”, “ضيف مصدر”, “اسأل دفعتك”, “زتونة المادة”. Friendly, not slang-saturated. No hollow gamified cheerleading.

## 4. Shape, depth and spacing

- Spacing scale (CSS pixels): `4, 8, 12, 16, 20, 24, 32, 40, 48`. Use 8px baseline, 4px adjustments.
- Rounding: input/small action **12px**, standard button **14px**, resource card **18px**, course panel **24px**, hero/feature **28px**, icon badge **14px**, pills **999px**. Do not vary radius randomly.
- Outlines: `1px solid var(--ez-border)`; shadows: extremely light `0 6px 24px rgba(24,56,88,.055)` for elevated popover/feature only. The screenshot is soft, not glassmorphic. No neon outlines or blur backgrounds.
- Mobile horizontal gutters: **16px** (>=360px), vertical section gap **24px**. Desktop content max **1100px**.
- Touch targets >=44x44px; buttons 48px high primary. Focus-visible needs clear 3px outline with sufficient contrast; respect `prefers-reduced-motion`.

## 5. Layout architecture

### Mobile (primary, 360–430px)
- Top: compact RTL brand on right, search/accessory icons on left, no giant header ornament.
- Home: distinct copy heading, single prominent search bar, **موادي** title, 2–6 course tiles (one column), course updates only when true, small “ضيف مصدر” invitation. Do not put decorative stats before the courses.
- Course: colorful but compact hero (pastel panel with course name and one visible action), topical filters scroll horizontally with visible affordances, resource list primarily white with category icon chips. On 360px, the resource title and **افتح المصدر** remain obvious.
- Resource: title/context above fold, primary open-source CTA visible without signin; 2–3 secondary actions; related materials below.
- Contribution: one-page link or authorized PDF flow; fields no more than required; no cartoon form tour.
- No sidebar. Add bottom bar only if usability studies require it; <=3 items.

### Tablet/desktop
- A **slim right-side rail** (RTL mirror of visual reference’s left rail), logo at top and 3–4 useful navigation icons with tooltips/labels. NOT a large admin sidebar.
- Main content `max-width: 1100px`, 2-column course grid where space allows; never force 3 data columns on study pages.
- Optional companion panel only when useful (e.g., real course updates, **زتونة المادة**), not fake leaderboard, total-hours card, revenue chart or vanity progress.
- Pastel tile rhythm creates movement; most content cards remain white for reading.

## 6. Component recipes (build only what the product uses)

**`ElzatonaWordmark`**: Arabic script **الزتونة.** with bold typography and one tiny custom typographic accent. Use SVG only when you can draw crisp native shapes. No random books/grad caps/3D robots glued to the logo.

**`AppShell`**: cool page background, semantic header, navigation. One visual accent bar or sticker-like tiny shape can recur, but do not add arbitrary geometric doodles on every screen.

**`SearchBar`**: 48px, white, 12px radius, search icon, subdued placeholder. Clearly scoped search; don't add a decorative AI sparkle.

**`CourseTile`**: pastel fill (one per course, deterministic), 24px radius, dark title in Arabic, short familiar English label, small actual resource count or true update only if computed. One arrow/action, not 5 icons. Full tile clickable.

**`ResourceRow`**: white 18px radius, fine outline, category icon in 42px tinted square with semantic type, bold title, muted metadata (course/topic · type · uploader) and voting or open action. Dense mobile layout with no clipped text. On hover only subtle 1–2px lift; keyboard focus visible.

**`ResourceTypeChip`**: category background & contrasting ink with icon and text. Never use color by itself.

**`CourseHero`**: pastel headline panel with course info and **ضيف لموادي** or context navigation; can include one line-art motif drawn as simple SVG/CSS, not an illustration illustration-gallery. No fake KPIs.

**`ZatonaPick`**: small sunshine/mint/sky panel with curated label **زتونة المادة**, 1–3 actual picks. Never imply professor certification. Don't show if nothing curated.

**`PrimaryButton`**: solid `--ez-primary` with white text, 14px radius; only one dominant button per screen/section. `SecondaryButton`: white outlined or muted neutral. Danger only for destructive.

**`EmptyState`**: friendly 1–2 sentence helpful copy + one specific action, optional small custom mini illustration tied to student materials. Avoid generic space astronaut cartoons.

**`IconBadge`**: single-colored vector icons from one icon family, matching visual weight. Per-resource type background determined by tokens; do not mix emoji with multiple 3D icon packs.

## 7. Signature visual motif: “the useful sticker”

Elzatona's unique visual character can be **a small, tilted sticky-label / paper tab with a bold Arabic phrase** attached to an *actual useful* featured resource, e.g. **زتونة المادة**. Use it sparingly (one per screen maximum), consistently: slight 4° tilt, 12px corners, sunshine pastel, ink label. Never use confetti, gamification flames or meaningless motivational stickers. Icons can borrow small notched paper corners. Prototype on mobile and remove if it harms scanning.

## 8. Screen specs to approve before full build

**A. `/` Signed-in / موادي**: brand, compact heading, search, section title and three real/pilot course tiles, 0/1/many states, subtle contributor CTA. Demonstrate narrow mobile viewport and desktop right rail.

**B. Course hub**: course title, course context, scoped search, topic/lecture pills, type filter, optionally curated picks, white resource list with stable type colors, contribution action. No resource on screen should require interpreting a random icon.

**C. Resource detail deep link**: content displayed without login or onboarding; main **افتح المصدر** in first viewport, clear source identity/type and link domain, relevant course context, helpful voting and save as secondary, related materials. Show an anonymous and signed-in state.

**D. Add resource**: paste HTTPS/authorized PDF, select course/topic when needed, clear inline errors in natural Arabic; no fake success. Functional auth-return flow.

All four screens need 360px, 390px, 768px, 1280px screenshots, plus tests for long titles, English code, and at 200% text zoom. The screenshot reference is an aesthetic inspiration only, NOT permission to copy its leaderboard, widgets, graphic assets or exact structure.

## 9. States and accessibility

- Provide dark ink on light surfaces and white text on dark blue primary. Text contrast >=4.5:1 for standard text, >=3:1 for large text/icons where applicable. Automated check + manual browser audit.
- Error (`--ez-danger`) must include readable instructions, not just a red border. Success does not rely on green alone.
- Loading: same card shape and skeleton sizes to prevent layout shift. Avoid animation-heavy shimmer on low-end Android.
- Disabled buttons: clear disabled labels, do not decrease opacity until text becomes unreadable.
- Motion: 120–180ms with `ease-out`, purposeful state transition only; honor reduced-motion.
- Use semantic links/buttons for keyboard/screen readers; correct focus order in RTL; custom illustrations are `aria-hidden` unless informative.
- No CSS `min-height` that clips multi-line Arabic. Check Arabic numerals, technical English, `@` handles, domains, and code.

## 10. Implementation guardrails for AI coding agents

1. Read `Elzatona_Implementation_Blueprint_v3.md`, this design system and `AGENTS.md` before coding.
2. Adopt **all** color, type, shape and spacing values as tokens in one CSS file. No arbitrary hex values or randomly selected component radii.
3. First deliver **four real screen previews with reusable components**, not ten unrelated mockups. Founder should review responsive designs *before* broad feature development.
4. Build responsive **product UI**, not dashboard cosplay. Pastel tiles should support useful scanning and organization; don't add coins/XP/hours/leaderboards.
5. Original product logic, Supabase RLS/queries, accessibility, and anonymous WhatsApp deep-link behavior from the blueprint are unchanged.
6. No claim that the visual system is final until it is reviewed with 3–5 actual Egyptian students on phone.
7. If a design conflict is found, update this one source of truth, explain the difference, and then propagate tokens/components. Never add one-off CSS overrides per screen.

## 11. Acceptance criteria

- [ ] 0 olive/forest-green branding tokens or old visual descriptions remain in repo docs/CSS.
- [ ] Colors are semantic token references, not inline arbitrary hex values in screen components.
- [ ] Wordmark, home, course, resource, and contribution screens have recognizable visual family.
- [ ] All category colors keep the same meaning throughout the product.
- [ ] 360px no overflow; Arabic/English long labels wrap or isolate correctly; all primary targets >=44px.
- [ ] Real dark-on-pastel text contrast passes checks; primary CTA white-on-blue contrast passes.
- [ ] No borrowed characters, robots, badges, fake XP, revenue, or leaderboards from reference screenshot.
- [ ] Student completes WhatsApp → exact resource → open link without sign-in.
- [ ] Student can find/submit useful content with no extra decorative friction.
