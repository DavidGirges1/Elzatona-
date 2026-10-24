# Question sets and material purposes

Owner requested native interactive question sets on 24 October 2026. This supersedes the original MVP blueprint's deferral of native quizzes. The [four-layer quality-control system](COMMUNITY_ROLES.md) governs publication: ready ordinary students submit complete banks for review; trusted contributors/admins publish directly. Private drafts remain available without publication approval.

## Student flow

1. Open a course → **اعمل أسئلة خاصة**, or contribution → choose **مذاكرة** / **حل** first.
2. Study: video / slides / sections and labs / notes / reference / other, then a link or permitted PDF (videos use links). Solve: choose question banks or professor sheets; banks support interactive sets, PDFs and website links, while sheets support a PDF or external link. Sheets stay separate from general banks and exams in course filters.
3. For a set, write questions manually or paste/upload JSON. The import replacement requires confirmation. Imported content is plain text; URLs in question text are not fetched or embedded.
4. Save a private draft. Reopen via **حسابك → مجموعات أسئلتي**. Ordinary/leader submissions with sharing rights and complete keys enter a private review queue; trusted/admin submissions publish directly. A scoped leader/admin must approve queued banks before guest access. Leaders may explicitly approve their own submitted bank within an admin-assigned course. Follow rejection notes and resubmit through **إضافاتي وحالة المراجعة**.
5. Preview a complete draft locally with the same player; keys stay in authorized author/admin editing or scoped submitted-bank review. Private drafts are not readable by leaders. A JSON export is available for backup. The editor warns on browser unload and when changing material format with unsaved changes; save before navigating elsewhere.
6. A published resource has two explicit starting choices. **تدرّب** checks one question at a time and allows another try. **اختبر نفسك** defers feedback until the final confirmation; questions may be visited freely and flagged for review.
7. The result distinguishes incorrect/unanswered answers and written self-assessment. Weighted points total 1–10 per question. The final score remains provisional until written self-assessments are made. Retry clears the attempt.
8. Answers/position/flags recover from the current tab's session for up to 24 hours. They are separate per resource/revision/mode. Feedback and results are not permanent records or synced between devices. An author revision invalidates grading of the older question set, with a reload explanation.

## Portable JSON v1

- Identifier: `format: "elzatona.quiz"`, `version: 1`.
- Reference structure: [quiz-format.schema.json](quiz-format.schema.json), generated from the draft Zod schema. Additional runtime/database checks enforce unique IDs, safe non-reserved IDs, key references, total UTF-8 size, and publication completeness; JSON Schema alone does not express all these conditions.
- Example: [../tests/fixtures/quiz.json](../tests/fixtures/quiz.json) is explicitly labeled QA material. The in-app `/quiz-format` page has a separate small educational example plus a downloadable JSON and full copyable conversion prompt.
- Top level: `title` 4–160 characters, `description` ≤2000, `language` ar/en/mixed, `aiAssisted` boolean, `questions` 1–100. Maximum document/file size 256 KiB. Unknown properties and future versions are rejected.
- Common question fields: `id` unique 1–64 ASCII letters/numbers/underscore/hyphen (JS prototype names reserved), `type`, `prompt` ≤3000, optional `explanation` ≤2000, `points` integer 1–10 (default 1), `source` ≤500. Publication requires nonblank prompts.
- `mcq`: `options` 2–8 `{id,text}` (unique IDs, text ≤500), `correctOptionIds` array of existing option IDs. One or several correct options; exact set match, no partial points. Missing draft key can be null. Publication requires at least one key and nonblank options.
- `true_false`: boolean `answer`; false is a real answer, not “unanswered.” Draft unknown can be null.
- `written`: `grading` self/exact, `modelAnswer` ≤3000, `acceptedAnswers` ≤20 strings, each 1–500 characters. Long answers use self-assessment. Exact answers compare case-insensitively after trimming/collapsing whitespace (including tabs, newlines and Unicode/nonbreaking PDF spaces), **not semantic/AI grading**. Publication requires a model; exact mode also requires accepted variants.
- Preserve the original language/source. Plain Arabic/English text and Unicode mathematics are supported; image questions, rich tables, embedded HTML and LaTeX rendering are outside v1.
- Conversion is a copyable prompt for the student's chosen tool, not an integrated AI service. It tells the converter not to invent missing keys and to split long banks. Review every question before sharing; importing never auto-publishes.

## Backend boundaries

`resources.source_kind='quiz'` and `type='question_bank'` reuse resource URLs, attribution, votes, saves, topic assignment, reporting, moderation, discussions and highlights. No external URL or Storage path is allowed. A pending quiz can lack sharing consent; a published quiz cannot.

- `quiz_sets`: RLS author/admin-only SELECT; no direct client writes. Full answer documents never enter public course/resource/player reads.
- `save_quiz`: authenticated active/onboarded actor, hourly mutation limit, active course/university, valid course topic, author/admin ownership. The existing `p_publish` flag requests publication/submission; the database determines direct publication versus pending review from current roles. Complete validated keys and sharing rights are required to submit; private drafts stay outside the queue. Revocation applies immediately. Published updates must remain complete/public; other students and cross-author organizers cannot rewrite questions/keys.
- `read_quiz`: public **answerless** projection for published active resources only.
- `grade_quiz`: public bounded input validation, revision check, typed answer matching; feedback only for submitted question IDs.
- `export_quiz`: explicit public full JSON download for published active resources only, including keys. This is a reusable self-study bank, **not a secure/proctored exam or academic grading service**. Exam mode controls the learning flow; it cannot prevent someone requesting answers/export separately.
- Publication trigger revalidates a private draft when an admin attempts generic publication, preventing incomplete drafts from bypassing the editor. Identifier trigger protects imported question/option IDs at the database boundary.
- Existing private `course-pdfs` bucket/finalization path handles PDF question banks, including the existing 3 MiB upload limit. No storage bucket, service key, OAuth redirect or environment change is required for native quizzes.
- No personal submitted answers or self-assessed marks are sent to a model or stored as official grades.

## Verification commands

```sh
npm run verify
npm run format:check
# Explicit temporary QA accounts and state only; see the test's guards.
TEST_ALLOW_WRITES=1 TEST_QUIZ_ACCOUNTS=/secure/qa-accounts.json TEST_QUIZ_STATE=/secure/qa-state.json node --env-file=.env.local tests/quiz-hosted.mjs
TEST_QUIZ_ACCOUNTS=/secure/qa-accounts.json TEST_QUIZ_STATE=/secure/qa-state.json npx playwright test tests/e2e/quiz.spec.ts
```

`tests/quiz.test.ts`, `supabase/tests/quiz.test.mjs`, and `tests/e2e/quiz.spec.ts` cover schema, permissions/visibility, grading, import/manual creation, private preview, public discovery, real PDF rendering, guest practice/exam, session recovery, flags and results at 390/768/1440px. See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for actual execution counts, deployment evidence and remaining limits. Never provision or retain QA credentials in the repository.

## Arabic navigation with English question content

English-led content reads LTR, including controls at the left of answer rows, English True/False, model answers, explanations and results. Arabic-led content stays RTL. Each question/answer block is independent; formulas and numeric-only choices default to LTR. UI labels remain Arabic and sit outside the answer paragraph. Empty author/player writing fields inherit their question or bank language, then follow the actual typed text. The `language` field is a fallback, not a command to reverse Arabic content.

For local-only layout reproduction, copy `tests/fixtures/quiz-bidi-page.tsx` to `src/app/qa-loading-check/bidi/page.tsx`, build/run locally, then use `TEST_QUIZ_DIRECTION_HARNESS=1 npx playwright test tests/e2e/quiz-direction.spec.ts`. Remove that temporary route and rebuild before deployment. The test refuses HTTPS deployment URLs and writes no backend data.
