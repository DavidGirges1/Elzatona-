# Materials pack v2 — explicit lecture placement

This format supersedes v1's generic topic folders. The outdated first import was removed at the owner's request; old manifests and ZIPs are historical and must not be reimported.

Use [the empty v2 template](import-templates/Elzatona_Materials_Template_v2.zip). This is a handoff format for a reviewed operator import; uploading a ZIP in the website does not automatically publish it.

```text
Elzatona_Materials/
  README.md
  courses/
    capital-cs-316/                 # exact live course slug
      lectures.csv
      materials.csv
      files/
        lecture-01-slides.pdf
        full-course-reference.pdf
```

Use any clear Arabic/English filenames. Optional subfolders under `files/` are allowed. The CSV manifest determines placement, not inferred filenames.

## lectures.csv

```csv
number,title
1,Introduction
3,SQL Joins
```

Numbers 1–999, unique within a course, with gaps allowed. Title optional, at most 120 characters. One current sequence per course; no semester/class folders. Existing lecture UUIDs remain stable when organizers change a number/title. Ambiguous existing matches require review.

## materials.csv

```csv
key,title,area,lecture_numbers,type,file,url,rights_confirmed
intro-slides,Introduction slides,lecture,1,slides,files/lecture-01-slides.pdf,,true
shared-notes,Notes for two lectures,lecture,1|3,notes,files/shared-notes.pdf,,true
reference,Course reference,general,,reference,,https://example.org/reference,true
revision,Comprehensive questions,revision,,question_bank,files/questions.pdf,,true
lab,Lab handout,sections,,sections,files/lab.pdf,,true
```

- One row per actual resource; unique `key` within the pack. Reuse the same row with `lecture_numbers=1|3` instead of copying its file. One title, URL, votes, saves and discussion.
- Exactly one of `file` and `url`. UTF-8 CSV, properly quote comma-containing values. No invented permission: `rights_confirmed=true` means you have authority to share the actual content.
- Required explicit `area`: `lecture`, `general`, `revision`, or `sections`. Lecture numbers required only for `lecture`; other areas must leave them empty. All listed numbers must exist in this course's lecture map.
- Lecture types: `video`, `slides`, `notes`, `reference`, `other`, `sheets`, `question_bank`.
- General types: `video`, `slides`, `notes`, `reference`, `other`.
- Revision types: general types plus `sheets`, `question_bank`, `past_exam`.
- Sections area: only `sections`. Keep labs separate even when their titles resemble lectures.
- Professor sheets use `sheets`; native interactive sets use `question_bank` with the existing `elzatona.quiz` v1 JSON document in `file`, only in lecture/revision placement. Questions/keys still require validation before publication.
- PDFs: genuine PDF, maximum **3 MiB (3,145,728 bytes)**. Larger files → a permitted publicly reachable HTTPS link or a smaller PDF. Videos → HTTPS links; no MP4 upload.
- Titles 4–160 characters. Optional additional `description` column up to 2,000 characters. Do not include lecture names repeatedly in resource titles when placement already makes them obvious.
- Only admin/scoped leaders curate a main study source after publication. Do not fabricate rankings/endorsements in pack metadata.

Operator preflight must validate ZIP paths, size/type, PDF header, SHA-256, unique identities, course/lecture matches, area/type compatibility, rights and URL safety. Produce a reviewable ledger before importing. Use the same placement-aware transactions and verified PDF lifecycle as the app; do not use the retired v1 topic RPCs. Do not auto-publish normal-user proposals or assume a private draft is reviewed.

The example manifest illustrates the format; it is not a claim that these example files exist or that these are your current lectures.
