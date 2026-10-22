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
