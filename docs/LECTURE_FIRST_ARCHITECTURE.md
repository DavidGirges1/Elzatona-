# Lecture-first study experience

Owner-approved plan, implemented 24 October 2026. This supersedes the flat resource/filter and generic-topic navigation. Existing brand tokens, fonts, RTL, role assignment and canonical resource URLs remain authoritative.

## Student journeys

- Course → numbered lecture → exact resource. Uploaded PDFs load their one-page reader automatically. YouTube loads only after Play. Guests can use either without signing in.
- Each lecture has **المذاكرة** and **الشيتات والتدريب**. One published study item may be manually marked **ابدأ هنا**. Other study items collapse under **شروحات إضافية**. Without a pick, show three items, then **اعرض الباقي**. Sheets precede question banks/quizzes.
- Course-wide study/reference content lives in **ملفات المادة**. Comprehensive notes, question banks/sheets and past exams live in **المراجعة والامتحانات**, with grouped headings and a link back to lecture-specific practice.
- **السكاشن واللابات** is a separate page under **المزيد**, never a parallel curriculum or a category inside a lecture.
- Two course tabs: **المحتوى / النقاشات**. General questions need no lecture. Asking about a lecture/resource preserves that context in the same course forum. Posting never creates a folder.
- Search is an expandable **دور داخل المادة**, not a permanent filter toolbar. Results include actual placement context. Legacy filter links fall back to the lecture map.
- Contribution starts with an explicit location. Deep links preselect it. Choose study/practice, then the appropriate type and link/PDF/native quiz. Missing lecture → ask organizers; no “unsure” inbox or silent General fallback.
- Saved resources, votes and discussion stay attached to one resource even when it is useful in several lectures. Resource detail links back to its lecture/area and exposes links to every associated lecture.

## Data and authorization

`lectures(id, course_id, number, title)` uses unique explicit numbers per course, optional titles, stable UUIDs and intentional gaps. `resources.area` is `lecture | general | revision | sections`. `resource_lectures(resource_id, lecture_id, course_id, is_main)` supports reuse with same-course composite foreign keys. `discussions.lecture_id` is optional and same-course constrained.

All new tables enable RLS. Public reads follow active courses and resource visibility; pending joins are private exactly like pending resources. Browsers have no direct map/association/curation writes. Required placement is validated in every submission, PDF prepare, quiz save, edit and review RPC. Deferred constraint triggers validate the complete final transaction state, including private drafts and multi-lecture joins. Types are constrained by area; quizzes only belong in lectures or revision.

- Admin: global operations and private review access; assigns all roles.
- Leader: assigned courses only; creates/renumbers/removes empty lectures, organizes placement and main picks, reviews submissions **including their own**.
- Trusted: own material publishes directly with valid placement; cannot organize maps or other authors' content.
- Ordinary: proposals require review; browsing, voting, saving and discussions stay available. Signup never exposes a role choice.
- Review checks the expected version **before** correcting placement. A correction and decision are atomic; the version increments and the decision ledger records the resulting version. Stale approval fails without changing placement.
- Reviewers can inspect quiz keys; only their author can edit them, including when the reviewer is an admin. Moderation can still hide an unsafe quiz.
- A main pick must be published study content in that lecture. Unique index allows one pick. Locks serialize it with source moderation; hiding, moving or deleting content clears the invalid pick.
- A populated lecture cannot be deleted. Organizers must first move/detach resources without deleting files. Discussion text survives an empty-lecture deletion, with its optional context detached.

`resource_cards` stays a security-invoker view with **one row per resource**. Its compatibility display column `topic_title` now contains placement context; no application query relies on a single `topic_id`. Retired topics stay as an empty historical table and legacy routines stay inaccessible in the private schema, preserving reproducible old migration history without a live topic interface. No old content is mapped or reimported.

## Reset and rollout

The owner explicitly requested removal of **all uploaded platform materials** while retaining accounts, roles, course/academic catalog and saved courses. The bounded reset inventory was 66 resource records, 65 private PDFs, 52 topics, 9 profiles, 125 courses and 12 saved-course memberships.

1. Apply additive schema after fresh-migration tests and production build.
2. A shared advisory transaction lock guards material/lecture/association writes and Storage insertion. The operator acquires its exclusive counterpart to drain in-flight writes, then pauses them. Auth, profile reads, catalog, follows and general discussion remain accessible. Vote counter updates are briefly paused too because they update material rows.
3. Hide only the exact inventoried resources in an owner transaction. Remove only those exact objects via the Storage API. An expiring, hash-capability-protected managed operator job keeps service credentials inside Supabase; no browser reset route or secret key export.
4. After confirming Storage empty, delete bounded resource dependencies, detach any resource/topic discussion context, remove old topics, retain audit history and verify preserved counts. Never delete `storage.objects` via SQL.
5. Reopen writes, verify with isolated temporary QA accounts/materials, deploy the UI, recheck production, remove fixtures and retire the temporary operator function.

Failure keeps old material hidden and writes paused until the operator safely resumes. Storage removal is idempotent; the database portion is transactional. Reset audit entries record quantities and intent. Historic import manifests are evidence of a removed batch, **not a current catalog or restore queue**.

## Acceptance and boundaries

Automated tests cover role scope, privacy, reuse, deferred placement, stale reviews, leader self-approval, main picks, general/context forum, quizzes, verified PDF publication and maintenance. Browser checks cover 360/390/768/1440px, mixed English/Arabic, exact guest links and the two-tap reader path. Actual results and limitations are recorded in IMPLEMENTATION_STATUS.md.

No semester/class versions, progress tracking, nested lab curriculum, scheduled exams, AI placement or auto-inference. Organizers start with an empty real map and add current lecture numbers/titles.
