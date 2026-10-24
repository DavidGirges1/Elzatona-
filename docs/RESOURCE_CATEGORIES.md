# Resource types and placement

The nine content types remain `video`, `slides`, `notes`, `reference`, `other`, `sheets`, `question_bank`, `past_exam`, `sections`. They describe the source format/purpose; the separate required **area** describes where students find it.

| Area       | Location                              | Permitted types                                     |
| ---------- | ------------------------------------- | --------------------------------------------------- |
| `lecture`  | Numbered lecture, studying + practice | study types, `sheets`, `question_bank`              |
| `general`  | ملفات المادة                          | `video`, `slides`, `notes`, `reference`, `other`    |
| `revision` | المراجعة والامتحانات                  | study types, `sheets`, `question_bank`, `past_exam` |
| `sections` | المزيد → السكاشن واللابات             | `sections` only                                     |

**شيتات** are professor exercise sheets, distinct from question banks. **سكاشن** covers lab/section teaching content and is deliberately separate from lecture navigation. Both support permitted PDF/link formats; neither silently becomes a native quiz. Interactive sets retain `question_bank`, lecture/revision placement and existing JSON question formats.

`typesForArea` and database validation enforce the same placement compatibility. Study/practice grouping remains a metadata helper; it no longer creates a crowded course filter bar or places sections in lectures. Existing pastel type chips/icons stay consistent. Roles, verified file publication, public reading, voting and discussion follow [COMMUNITY_ROLES.md](COMMUNITY_ROLES.md).

The earlier 12-file reclassification and import manifests are historical evidence: all 66 outdated materials and 65 stored PDFs were removed at the owner's explicit request during this architecture change. No obsolete files were mapped or reimported. See [the v2 materials handoff](MATERIAL_PACK_FORMAT.md) and [architecture](LECTURE_FIRST_ARCHITECTURE.md).
