# Elzatona semester materials — ZIP handoff format v1

Use this folder layout when sending a semester collection to the Elzatona development assistant. It is a handoff convention for a validated import, not an existing website ZIP-upload feature. This template contains no real course materials, no PDF placeholders and no populated link CSVs.

## 1. Choose courses

`COURSE_CATALOG.csv` lists the 122 active Capital University / Faculty of Computers courses currently in the database, with codes, Arabic/English titles, year and exact folder names. Semester values are not assigned in the live catalog, so choose the subjects you are actually taking; the two template courses are examples, not a semester recommendation.

Put each course under `courses/`, using the exact `folder_name` from the catalog or the final part of its website URL. Example: `https://elzatona.tech/courses/capital-cs-316` → `courses/capital-cs-316/`.

Keep only the courses you need. Empty folders are ignored. Do not put materials directly in the catalog/guide area.

## 2. Organize topics

Create one folder per topic/lecture inside the course:

```
courses/
  capital-cs-316/
    01 - Divide and Conquer/
      study/
        slides/
          Lecture slides.pdf
        notes/
          My revision notes.pdf
        reference/
        other/
        links.csv
      solve/
        question_bank/
          Practice questions.pdf
        past_exam/
        quizzes/
          Reviewed questions.quiz.json
        links.csv
    02 - Dynamic Programming/
      ...
    _general/
      ...
```

- Topic names may be English or Arabic. Number prefixes such as `01 -` communicate the intended topic sequence and are not part of the displayed topic title.
- If a topic already exists in Elzatona, use its existing displayed name so it can be reused. Ambiguous course/topic matches will be flagged for review instead of guessed.
- `_general` is optional. It means the resource covers the whole course and has no topic assignment; it does not create a topic called “General.”
- The website still offers its normal latest/helpful material sorting; topic folder numbering does not invent a new material ranking.

## 3. Add PDFs to the right folder

| Folder within a topic  | Display purpose | Resource type |
| ---------------------- | --------------- | ------------- |
| `study/slides/`        | مذاكرة          | slides        |
| `study/notes/`         | مذاكرة          | notes         |
| `study/reference/`     | مذاكرة          | reference     |
| `study/other/`         | مذاكرة          | other         |
| `solve/question_bank/` | حل              | question_bank |
| `solve/past_exam/`     | حل              | past_exam     |

Use clear filenames: `Binary search lecture slides.pdf` becomes the material title `Binary search lecture slides`. Arabic filenames are equally valid. Titles need 4–160 characters. The topic/course already provides context, so filenames do not need to repeat the university and department.

Current app uploads support genuine PDF files only, maximum **3 MiB (3,145,728 bytes) per file**. For larger files, add a publicly accessible HTTPS file/Drive link to the appropriate `links.csv`, or supply a smaller PDF. The in-app PDF reader covers permitted uploaded PDFs; a linked Drive/PDF resource keeps the ordinary external-link behavior.

For DOCX/PPTX, export to PDF or provide an HTTPS link. Supply videos as links rather than MP4 files.

## 4. Add video and website links with CSV

Each topic can contain `study/links.csv` and `solve/links.csv`. Open them in Excel, Google Sheets or a text editor. Add one row per link. Save as **CSV UTF-8** (comma separated). The template files contain only the correct header.

```csv
title,url,type,description
```

Required fields: `title`, `url`, `type`. `description` is optional; it can credit the original lecturer/source or say which pages/ideas the resource covers. Quote fields containing commas; Excel/Sheets handles this when exporting CSV. Descriptions are limited to 2,000 characters.

Examples below are documentation only. Replace the placeholder links with your real links; do not copy placeholders into an import.

`study/links.csv`:

```csv
title,url,type,description
"BFS and DFS explained","https://youtu.be/YOUR_VIDEO_ID","video","English explanation"
"Course reference website","https://YOUR_REFERENCE_SITE/path","reference","Chapter 3"
```

`solve/links.csv`:

```csv
title,url,type,description
"Recursion practice questions","https://YOUR_QUESTION_SITE/path","question_bank","With worked answers"
```

Allowed study types: `video`, `slides`, `notes`, `reference`, `other`.
Allowed solve types: `question_bank`, `past_exam`.
Use HTTPS links accessible to your intended student audience. Individual YouTube video links support inline playback; playlists are not automatically expanded into individual videos.

## 5. Interactive quizzes are optional

Put a valid native question document in `solve/quizzes/*.json`. It must use the existing `format: "elzatona.quiz", version: 1` contract. For English banks, use `language: "en"`; mixed content remains supported.

- Full guide/conversion prompt: https://elzatona.tech/quiz-format
- `_guides/quiz-example.json` is a valid educational example. It is outside the material tree and must not be published as part of the semester pack.
- Maximum 100 questions and 256 KiB per quiz. Review all questions/keys before publication.
- A PDF question bank stays a PDF. It does not automatically become an interactive quiz merely by being placed under `solve/`; provide a reviewed quiz JSON when you want practice/exam modes.

## 6. Optional import notes

Add a root `IMPORT_NOTES.txt` if needed, with:

- The existing admin/trusted contributor username that should receive contributor attribution.
- Any topic-name aliases, source credits, exceptions or files that should be skipped.
- Whether you want everything published after validation, or want to review the proposed list first.

Include only materials you have permission to share. Do not include account passwords, API keys or private student records.

## 7. Send the ZIP

Zip this root folder and upload it in the conversation. For large collections, split by subject into manageable ZIPs (around 25 MB is convenient).

On receipt, the assistant can validate the file tree, match exact courses, reuse/create topics, check duplicate URLs/files, validate quiz documents and report oversized/invalid files before preparing the actual authorized database/Storage import. Publication uses the chosen account under the current [four-layer quality rules](COMMUNITY_ROLES.md): admin/trusted contributions publish directly; ordinary/leader contributions wait for a separate eligible reviewer. Topic creation requires an admin or leader assigned to that course. This template does not execute an import or change live data by itself.

Root README/catalog/guide files, empty directories, hidden system files, and `_guides/` are not resources. Avoid nested ZIP/RAR archives inside the course folders.
