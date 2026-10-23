# Published-domain update — 23 October 2026

The owner’s actual app is now deployed at **https://elzatona.tech/test**. The root continues to return the exact original Coming Soon page. The published domain/routing suite passed **15 browser checks at 390/768/1440**. Six mobile page captures in `screenshots/hosted-*-mobile-390.png` were refreshed from the deployed app using temporary QA content; all six were visible and passed RTL/no-overflow checks. The remaining tablet/desktop populated captures are from the local actual app against the same hosted backend. Temporary content is removed after verification, and no founder approval is implied.

The deployed authenticated contribution/vote/discussion/moderation flow passed. The PDF form uploaded/published but its 5-second browser assertion timed out; a separate live app → signed Storage check verified exact downloaded bytes. The interrupted browser rerun is not counted as passing. Full details are in IMPLEMENTATION_STATUS.md.

The earlier visual reviews below are historical and document local/unconfigured states.

# Actual connected visual review — 23 October 2026

The actual production Next.js app now renders against the owner’s Elzatona Supabase project. Captures use existing courses and temporary QA contributions (clearly labeled as tests); the temporary content is removed after verification. No query mocks or sample fallback data were introduced. Local preview: `http://localhost:3000`. This is not the owner’s Vercel deployment.

## Connected screen captures

All six requested screens were captured at **390×844**, **768×1024**, and **1440×1000**. Home is authenticated موادي with a followed course; discovery/course/resource are real public reads; submission is authenticated with the PDF input enabled; login truthfully shows that Google is unavailable. There is no separate enrollment wizard. Actual Google consent and new-account onboarding remain blocked by the disabled provider.

| Screen           | Mobile 390                                            | Tablet 768                                            | Desktop 1440                                            |
| ---------------- | ----------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| موادي            | [image](screenshots/hosted-home-mobile-390.png)       | [image](screenshots/hosted-home-tablet-768.png)       | [image](screenshots/hosted-home-desktop-1440.png)       |
| Course discovery | [image](screenshots/hosted-discovery-mobile-390.png)  | [image](screenshots/hosted-discovery-tablet-768.png)  | [image](screenshots/hosted-discovery-desktop-1440.png)  |
| Course hub       | [image](screenshots/hosted-course-mobile-390.png)     | [image](screenshots/hosted-course-tablet-768.png)     | [image](screenshots/hosted-course-desktop-1440.png)     |
| Resource detail  | [image](screenshots/hosted-resource-mobile-390.png)   | [image](screenshots/hosted-resource-tablet-768.png)   | [image](screenshots/hosted-resource-desktop-1440.png)   |
| Contribution     | [image](screenshots/hosted-submission-mobile-390.png) | [image](screenshots/hosted-submission-tablet-768.png) | [image](screenshots/hosted-submission-desktop-1440.png) |
| Login            | [image](screenshots/hosted-login-mobile-390.png)      | [image](screenshots/hosted-login-tablet-768.png)      | [image](screenshots/hosted-login-desktop-1440.png)      |

## Review findings

Visually inspected connected mobile home/course/submission/resource, tablet discovery and desktop login. Alexandria headings and Tajawal body text remain legible; RTL navigation, semantic blue-white/teal/pastel tokens, spacing and mobile resource actions retain Design System v3. No new palette or identity was introduced. Contribution HTTPS helper text now isolates the protocol for correct mixed RTL/LTR reading. Google unavailable state is clear and keeps browsing accessible. Automated assertions check every captured screen for the RTL root, expected heading, no horizontal overflow and no uncaught browser errors.

The actual app browser suite verifies course selection, link submission and second-student visibility, voting, question/reply, resource-report moderation and real PDF publication/anonymous download at all three widths. It does not certify actual Android behavior, a real WhatsApp in-app browser, Google consent, upload recovery, complete accessibility or human task-completion times. Ten canonical token contrast pairs continue to pass local automated tests. Founder/student visual approval is still needed.

## Earlier unconfigured review (historical)

The following records the previous milestone and remains useful for unavailable/404 states. Its credential blockers have been partially resolved by the connected run above.

# Actual visual review — 22 October 2026

Preview: `http://localhost:3000`, production Next.js server in the managed environment's `elzatona-preview` Node 24 container. It is local verification, not a Vercel deployment. Screenshots are real browser captures, never static HTML references or injected production data.

## Screen coverage

| Requested screen     | Captured actual state                                                 | Populated/signed-in state                                                      |
| -------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Homepage / موادي     | Anonymous finder, honest unconfigured empty state                     | Blocked on Supabase credentials; authenticated موادي is not visually certified |
| Course discovery     | Search and empty directory                                            | Populated real courses blocked                                                 |
| Individual course    | Meaningful missing-course 404                                         | Course hero/topics/resources/curation blocked                                  |
| Resource detail      | Meaningful missing-resource 404                                       | Exact published resource/open-source action blocked                            |
| Resource submission  | Actual sign-in gate with return destination                           | Authenticated form and PDF upload blocked                                      |
| Login and onboarding | Unconfigured-provider notice; privacy explanation; safe browse return | Google consent/callback and first followed course blocked                      |

Every captured state exists at **390×844**, **768×1024**, and **1440×1000**. Full-page images may be taller than the viewport. There are 18 screenshots: six states × three widths. Do not treat missing-content screenshots as approval of the implemented populated screen designs. The connected Playwright suite captures all six requested populated screens when genuine backend configuration is available.

## Open the screenshots

| State                | Mobile 390                                               | Tablet 768                                               | Desktop 1440                                               |
| -------------------- | -------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------- |
| Home                 | [image](screenshots/home-mobile-390.png)                 | [image](screenshots/home-tablet-768.png)                 | [image](screenshots/home-desktop-1440.png)                 |
| Discovery            | [image](screenshots/discovery-mobile-390.png)            | [image](screenshots/discovery-tablet-768.png)            | [image](screenshots/discovery-desktop-1440.png)            |
| Course unavailable   | [image](screenshots/course-unavailable-mobile-390.png)   | [image](screenshots/course-unavailable-tablet-768.png)   | [image](screenshots/course-unavailable-desktop-1440.png)   |
| Resource unavailable | [image](screenshots/resource-unavailable-mobile-390.png) | [image](screenshots/resource-unavailable-tablet-768.png) | [image](screenshots/resource-unavailable-desktop-1440.png) |
| Submission auth gate | [image](screenshots/submission-auth-gate-mobile-390.png) | [image](screenshots/submission-auth-gate-tablet-768.png) | [image](screenshots/submission-auth-gate-desktop-1440.png) |
| Login                | [image](screenshots/login-mobile-390.png)                | [image](screenshots/login-tablet-768.png)                | [image](screenshots/login-desktop-1440.png)                |

## Review findings

Visually inspected the actual mobile home, desktop home, and tablet login captures. The remaining captures are available for founder review and covered by the layout assertions. Alexandria headings and Tajawal body text loaded; Arabic text is legible and RTL. Cool page/surface colors, dark teal actions, pastel sky and sunshine, logical spacing, and the desktop right rail retain the supplied identity. No replacement brand, new palette, decorative statistics or invented course content was added.

Clear usability corrections made during verification:

- Discovery and saved-resource navigation now remain reachable when the desktop rail disappears on mobile. Icon controls have Arabic accessible names and 44px targets.
- Resource voting/saving use secondary buttons so opening the source keeps visual priority.
- Moderators can inspect reported text and follow its contextual link rather than being asked to judge an opaque UUID.
- The PDF label and validation now agree on a Vercel-compatible 3 MiB maximum.

Automated checks: Arabic `lang`/RTL root, expected headings, no horizontal overflow at all three requested widths, no uncaught page errors, and a 360px large-text stress check. Ten canonical foreground/background token pairs meet WCAG AA normal-text contrast. These are not a complete accessibility audit or an actual Android 200% OS font-scaling test.

## Remaining visual gate

Run connected screenshots with permissioned pilot data; inspect long mixed Arabic/English titles, topic filters, first-viewport resource CTA, real validation errors, upload retry and moderator screens. Test an Android phone and a WhatsApp deep link. Obtain founder/student review; no final visual approval or observed task-completion time is claimed.

## Expanded identity/admin/landing review — 23 October 2026

Thirty actual local production screenshots backed by the hosted Supabase project are saved as `academic-{landing,login,signup,onboarding,home,discovery,course,resource,submission,admin}-{mobile-390,tablet-768,desktop-1440}.png`. The landing screenshots were subsequently refreshed against the real deployed domain. `academic-landing-mobile-360.png` verifies the narrower reduced-motion view. QA names/content in populated screenshots are explicitly temporary and have been removed from the database.

Visual inspection preserved Alexandria/Tajawal, dark teal-blue actions and the established sky/lavender/sunshine accents. Student surfaces remain simple; admin controls use a separate denser layout. The interactive product illustration is labeled explanatory, with no fabricated counts. Arabic/English names and inputs use bidi isolation/LTR controls.

Scroll-reveal screenshots were captured after actual scrolling and completion of transitions; reduced-motion and keyboard arrow navigation are checked. Full-page screenshots initially captured offscreen reveal sections as blank; those captures were replaced after proper scrolling. Radio selection cards were checked for complete clickable coverage. No horizontal document overflow was detected at 360/390/768/1440 widths. Tables and mobile admin navigation intentionally scroll inside their own bounded regions.

Browser checks: 56 local production passes, plus 27 successful deployed-domain checks. Real WhatsApp on a physical Android, actual system font scaling, first-inbox verification and Google consent remain manual gates. The enlarged-text automation increases base type; it does not establish complete real-device accessibility certification.
