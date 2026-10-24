# Resource categories

| Purpose | Type     | Student label | Use                                                             |
| ------- | -------- | ------------- | --------------------------------------------------------------- |
| مذاكرة  | sections | سكاشن         | Section explanations, lab guides and practical teaching content |
| حل      | sheets   | شيتات         | Exercise sheets supplied by the professor                       |

These are content categories, not new file formats or privileges. Both support permitted PDF uploads and external URLs. General question banks and previous exams keep their own types; native quiz sets remain `question_bank`. Student notes and lecture slides keep their existing types.

`resourceTypesForPurpose` supplies the same grouping to database queries and course filter options. The database allowlist and Zod validate all nine types. Contribution choices show sections under studying and professor sheets under solving; a sheet cannot silently become a student-authored interactive quiz. The source summary shows the chosen category and format before submission. Existing palette, typography, type chips and compact resource rows are reused.

Ordinary users still submit for review. Trusted contributors publish their own submissions, leaders review within assigned courses including their own, and only admins assign roles. File verification, rights confirmation, voting/discussion permissions and guest reads are unchanged.

The first reclassification is an explicit reviewed list of 12 imported PDFs: five section/lab documents and seven faculty exercise sheets. Other question banks, lecture MCQs, practice questions and exams remain separate. Only metadata changes: resource IDs, source bytes, topics, contributors, publication state and community interactions are retained. The original import ledger remains historical; [category-updates.json](imports/2026-10-24-materials/category-updates.json) records old/new values and original hashes.

Future packs may use `study/sections/`, `solve/sheets/` and the same values in `links.csv`. The existing empty template was updated accordingly without adding fake resources. See [MATERIAL_PACK_FORMAT.md](MATERIAL_PACK_FORMAT.md).
