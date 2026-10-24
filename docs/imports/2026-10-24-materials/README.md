# Imported semester materials — 24 October 2026

Imported the owner's public Drive archive into the real Elzatona Supabase project and verified it on https://elzatona.tech. This is an operator-run data import, not a new public ZIP-upload feature.

| Course                                                                           | Imported PDFs |
| -------------------------------------------------------------------------------- | ------------: |
| [Artificial Intelligence — AI 310](https://elzatona.tech/courses/capital-ai-310) |            27 |
| [Parallel Processing — CS 471](https://elzatona.tech/courses/capital-cs-471)     |            11 |
| [Database Systems 2 — IS 312](https://elzatona.tech/courses/capital-is-312)      |            10 |
| [Big Data Technologies — IS 365](https://elzatona.tech/courses/capital-is-365)   |             6 |
| [Convex Optimization — AI 320](https://elzatona.tech/courses/capital-ai-320)     |             4 |
| [Machine Learning — AI 330](https://elzatona.tech/courses/capital-ai-330)        |             6 |

**64 PDFs, 35 created topics, 1,673 readable pages, 53,209,212 original PDF bytes.** Purpose/type counts: 30 slides, 22 PDF question banks, 6 past exams, 5 notes and 1 reference. Topic number prefixes become sort order; `_general` stays a whole-course resource without an artificial General topic. Contributor attribution uses the owner's existing administrator account, `davedelks1d`; original PDF author/content attribution remains in the unchanged documents. No lecturer endorsement or platform quiz was invented.

## Source and validation

The attachment transfer exceeded 32 MiB; the owner then authorized a public Drive folder download. Downloaded archive: 45,201,678 bytes, SHA-256 `a8d01ba9e4f7f82f34c2e34ac523a3ab288072ec6cf578a551877c9b17066c1e`. ZIP CRC and safe paths checked before extraction. All 64 PDFs parsed across every page; all fit the existing 3 MiB file limit; 64 unique SHA-256 values. Six course slug/code/year mappings matched the active live Capital University catalog. All link CSVs were empty; there were no native quiz JSONs.

The supplied [agent report](migration_report.agent.md) is supporting data. Its stated `migration_manifest.csv` was **absent** from the ZIP; [the reconstructed manifest](migration_manifest.csv) records the actual 64 files, hashes, sizes, topics, resource IDs and live URLs. The three oversized files mentioned by that report were not supplied and were not imported. The original 72-file source and excluded duplicates/oversized bytes cannot be independently audited from this ZIP.

## Authorized operation and security

The owner requested population of the platform. A checked server-operator transaction verifies the existing active, confirmed, academically ready administrator and all active course/university mappings, then creates private draft resources/topics with audit provenance. This explicit admin batch does not alter student mutation quotas, role grants or RLS. `prepare.sql` is an operator record, not SQL exposed through a browser endpoint.

The temporary `materials-import-a8d01ba9` function required a random 256-bit capability. Only its hash, expiry and an exact 64-file allowlist were deployed; the raw capability was local, never committed/logged, and has been deleted. Each request verifies the owner's current admin/readiness, exact resource/course/topic/path, size, MIME, PDF signature and SHA-256. Files upload without overwrite to private `course-pdfs`, then use the existing service-only `finalize_pdf_checked` path. Revocation or a changed context fails closed. No Supabase service key was retrieved, logged or committed; only the managed function environment uses that key.

After completion the function was replaced with a credential-free HTTP **410 import_closed** tombstone (v2). No usable import capability or privileged import endpoint remains. The normal `resource-files` function is unchanged. No Auth accounts or roles were created/changed. A ninth real profile appeared during the operation; it was left untouched. Both original published resources remain, for **66 total published resources and zero pending uploads**.

## Verification evidence

- **311/311 automated tests in 17 files passed (15.33s)**, including **14 new import-handler cases**. Strict TypeScript and lint pass. This import changes operational scripts/data, not the product interface or schema; a new local frontend build was not required.
- Live import rejects a wrong capability (401) and altered file bytes (422). A completed-resource replay returns `alreadyImported` without rewriting. Re-running preparation reports 64 existing publications and does not create duplicates.
- **64/64 anonymous resource metadata and signed-download checks passed**, comparing every stored PDF byte count and SHA-256 against the local original. Unsigned public-bucket access is denied. [Detailed results](guest-verification.json).
- **6/6 live browser tests passed (2.0 minutes)** at **390/768/1440px**: all six course hubs, topic/type filtering, 18 actual in-platform PDF renders, guest detail access, search, study/solve sections, and AI pagination (20 + 8 unique resources, including its original video). Asserted no horizontal overflow or page errors. Actual captures: `docs/screenshots/material-import-*`; mobile course and desktop reader images were visually inspected.
- The existing self-approval milestone's pending authenticated browser/Storage checks are separate; these guest import tests do not claim to finish them.

## Files and reproduction

`manifest.json` and `migration_manifest.csv` are the durable import ledger. `preflight.json` records actual final counts; the name is retained from the initial blocked preflight. `prepare.sql`, `validate_pack.py` and `prepare_plan.py` preserve this operator run's code and deterministic IDs. Their local scratch paths and date are specific to this run: review before reuse. The archive, extracted PDFs, generated one-time capability/configuration and active Supabase keys are not in Git.

Operator templates/tests live under `scripts/material-import`, `tests/material-import.test.ts` and `tests/e2e/material-import.spec.ts`. The Deno entry template is `.txt` so Next.js does not compile it; an authorized deployment injects a fresh exact-file config. Never redeploy a completed import or expose a generic unauthenticated upload route. Future identical resources use the same course/content identifiers and should be skipped. Always verify checksums/publication and retire the temporary endpoint after any authorized batch.

## Subsequent category organization

The owner requested distinct section/lab content (سكاشن) and professor sheets (شيتات). Five notes were reviewed as sections/labs, and seven faculty exercise sheets were separated from general question banks. [category-updates.json](category-updates.json) records the exact 12 old/new types and original file hashes. Resource IDs, URLs, contributors, topics and PDF bytes are unchanged. Other MCQ banks, practice questions, slides and exams were not guessed into these categories.

The original import manifests/preparation SQL above describe the taxonomy at import time. Use [current-manifest.json](current-manifest.json) for current metadata checks; `type_at_import` preserves the old classification. The SHA-256 results in [category-verification.json](category-verification.json) confirm all 64 original PDFs still match. Replaying the historical `prepare.sql` after legitimate type changes will correctly refuse the outdated metadata expectations; do not use it to overwrite classification decisions. The separate checked reclassification transaction is recorded in `reclassify-sections-sheets.sql`.

Six live category browser journeys passed at 390/768/1440px: ordinary authenticated submissions stay private, then approved categorized PDFs are readable by guests; six actual original-PDF previews and both course filters were checked after test cleanup. Additional direct API checks covered two private external links. Nine temporary uploaded PDFs (including the first selector-test fixture), two temporary links and one ordinary QA account were deleted. The real library remains 66 published resources; the imported 64 now include 5 sections, 7 sheets, 15 general question banks, 30 slides, 6 exams and 1 reference. No permissions or file formats changed.
