# Capital University computing curriculum

The owner supplied `capital-computing-regulations-2021.pdf` and explicitly requested importing it into **Capital University → Computers and Information**. The PDF itself uses the historical **Helwan University / كلية الحاسبات والذكاء الاصطناعي** name. This mapping follows the owner's instruction; it is not independent confirmation of a current university study plan.

## Source and coverage

- The unmodified source PDF is retained here. Its SHA-256 is recorded and checked in `data/curriculum/capital-computing-2021.json`.
- Article 18, printed page 13 / PDF page 16, explicitly defines the hundreds digit of a course code as its study level. That rule supplies levels 1–4. The document does not supply a semester timetable, live course offerings, or each student's passed prerequisites.
- All course tables in articles 19–21, printed pages 14–29 / PDF pages 17–32, are transcribed: **122 distinct courses**, **160 requirement mappings**. Courses appearing under several departments share one course hub.
- Unique courses by level: **13 first**, **15 second**, **40 third**, **54 fourth**.
- The 160 mappings retain general/faculty requirements and compulsory/elective requirements for **CS, IT, IS, AI**. The source mentions Software Engineering and Medical Informatics, but provides no separate course tables for those programs; none are invented.
- Printed source page numbers are stored per mapping. Cross-checking the actual rightmost PDF code columns against the transcription found an exact match on all 16 table pages.
- Prerequisite notes and credit hours are informational. The platform neither verifies passed courses nor registers students with the university.
- Obvious Arabic presentation-form/spacing and English typography errors are normalized. English III replaces the source's typographic `English 111`. Department names distinguish the four projects. **IS 450** retains the table's Arabic title `اختبار وتكامل البيانات` alongside its English `Software Testing and Integration`; this source discrepancy needs faculty review.
- Existing Cairo pilot records, resources, follows, and real accounts are retained. They are not reattributed to Capital University.

## Student behavior

1. The student's persisted university/faculty scope the discovery list.
2. Default discovery includes **every year** in that faculty and places the student's own level first. Required courses precede electives within the same level; other levels remain accessible.
3. Name/code search supports Arabic, English, Arabic code prefixes, optional code spaces, common Arabic alef variants, and diacritics.
4. The `السنة والتخصص` disclosure contains year and optional department filters, keeping the initial mobile view focused on courses. Active filters reopen it. A department filter also includes shared general/faculty requirements. Department selection is a discovery filter, not a claimed or saved student specialization.
5. A course may be compulsory for one department and elective for another. The classification follows the selected department; the all-departments view labels mixed cases `حسب التخصص`.
6. Results paginate at 20 courses. Selection applies to the **current page**, explicitly labeled. Select individual rows or `تحديد مواد الصفحة`, then press the add button. Changing page/filter starts a new selection; already added courses remain saved.
7. Bulk addition is additive and idempotent: it never toggles a followed course off. Invalid/inactive IDs cause the whole batch to fail. Authentication, live active-account/onboarding checks, and rate limits remain enforced in PostgreSQL.
8. `موادي` reads explicit follows independently of current year. Editing academic context preserves that library. Suggestions change to the new year; courses disappear only when explicitly unfollowed or deactivated.
9. Each imported course is an ordinary course group: the same public resource links, private PDF lifecycle, votes, saves, questions, replies and reporting apply. Adding a group does not create resources or members artificially.
10. Dashboard updates query followed course IDs directly, so older updates are not lost merely because other faculty courses have newer resources.

## Reproduction and security

```bash
node scripts/import-capital-curriculum.mjs --check
# Regenerate SQL from the reviewed JSON only when intentionally revising the import:
node scripts/import-capital-curriculum.mjs
npm run db:types
npm test
npm run typecheck
npm run lint
npm run build
```

For the original table-column audit, `python scripts/verify-curriculum-source.py` compares the actual PDF codes with every mapped source page (optional Python/PyMuPDF tooling; no effect on application runtime).

`import-capital-curriculum.mjs` only generates/verifies SQL; it does not connect to a project. The catalog migration resolves the existing university/faculty by slug and reuses matching course IDs. It does not overwrite editorial deactivation or auto-follow anyone. Future source revisions should use a new reviewed migration rather than editing applied migrations.

Applied additive migrations:

- `20261023181713_course_selection.sql`: course metadata, public/read-only curriculum mappings with RLS, authenticated bulk-add function.
- `20261023181732_capital_computing_curriculum.sql`: reviewed catalog, generated from the checked-in JSON/PDF.
- `20261023182035_preserve_selected_courses.sql`: academic-context changes preserve explicit follows.
- `20261023182301_curriculum_readonly_grants.sql`: revoke Supabase default write grants on the new mapping table; regrant public SELECT only.

No project secret key is needed by the website. The add function accepts course IDs only and derives the user from the session. Other students' course lists remain private. Anonymous/incomplete/suspended users cannot add courses.

Hosted tests require operator-provisioned **temporary QA accounts**, explicit `TEST_ALLOW_WRITES=1`, `TEST_AUTH_ACCOUNTS_FILE`, and `TEST_CURRICULUM_STATE_FILE`. Run `tests/curriculum-hosted.mjs`, then `tests/e2e/curriculum.spec.ts` at the configured preview/domain. Never use real students' accounts. Tests intentionally create labeled temporary resources and files; remove only those fixtures after testing. Embedded PostgreSQL checks are separate from actual Supabase Auth/Storage/browser checks.
