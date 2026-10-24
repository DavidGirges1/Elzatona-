// Runs only with isolated, explicitly provisioned QA accounts. Never uses a real user's password.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { quizPdf } from "./support/quiz-pdf.mjs";
import { randomUUID } from "node:crypto";
if (
  process.env.TEST_ALLOW_WRITES !== "1" ||
  !process.env.TEST_QUIZ_ACCOUNTS ||
  !process.env.TEST_QUIZ_STATE
)
  throw Error("Explicit QA accounts/state and TEST_ALLOW_WRITES=1 required");
const people = JSON.parse(readFileSync(process.env.TEST_QUIZ_ACCOUNTS, "utf8"));
if (
  people.length !== 3 ||
  people.some((p) => !p.email.startsWith("ez-publishing-"))
)
  throw Error("Non-QA accounts refused");
const fresh = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
let checks = 0;
const ok = (r) => {
  assert.equal(r.error, null);
  checks++;
  return r.data;
};
const denied = (r) => {
  assert.ok(r.error);
  checks++;
};
const eq = (a, b) => {
  assert.deepEqual(a, b);
  checks++;
};
const guest = fresh();
for (const person of people) {
  person.db = fresh();
  ok(
    await person.db.auth.signInWithPassword({
      email: person.email,
      password: person.password,
    }),
  );
}
const [author, reader, admin] = people;
const course = ok(
  await guest.from("courses").select("*").eq("slug", "capital-ai-310").single(),
);
for (const p of [author, reader])
  ok(
    await p.db.rpc("set_academic_context", {
      p_university: course.university_id,
      p_faculty: course.faculty_id,
      p_year: 3,
    }),
  );
const doc = JSON.parse(readFileSync("tests/fixtures/quiz.json", "utf8"));
const state = {
  slug: course.slug,
  course: course.id,
  run: author.username,
  resources: [],
};
const persist = () =>
  writeFileSync(process.env.TEST_QUIZ_STATE, JSON.stringify(state), {
    mode: 0o600,
  });
persist();
const grant = (person, publish = false, organize = false) =>
  admin.db.rpc("admin_assign_community_role", {
    p_user: person.id,
    p_role: organize ? "class_leader" : publish ? "trusted" : "student",
    p_courses: organize ? [course.id] : [],
    p_reason: "Isolated question-bank QA",
    p_confirm: true,
  });
const save = (db, d = doc, id = null, publish = false, rights = false) =>
  db.rpc("save_quiz", {
    p_course: course.id,
    p_topic: null,
    p_document: d,
    p_resource: id,
    p_publish: publish,
    p_rights: rights,
  });
const add = (id) => {
  state.resources.push(id);
  persist();
  return id;
};
try {
  eq(ok(await guest.rpc("material_access")).open_to_all, false);
  denied(await save(guest));
  const draft = add(ok(await save(reader.db)));
  eq(ok(await guest.rpc("read_quiz", { p_resource: draft })), null);
  eq(ok(await guest.rpc("export_quiz", { p_resource: draft })), null);
  eq(
    ok(await author.db.from("quiz_sets").select("*").eq("resource_id", draft)),
    [],
  );
  ok(await save(reader.db, doc, draft, true, true));
  eq(ok(await guest.rpc("read_quiz", { p_resource: draft })), null);
  ok(await grant(author, true));
  const incomplete = structuredClone(doc);
  incomplete.questions[0].correctOptionIds = null;
  const incompleteId = add(
    ok(await save(author.db, incomplete, null, false, true)),
  );
  denied(
    await admin.db.rpc("admin_manage_resource", {
      p_resource: incompleteId,
      p_title: incomplete.title,
      p_status: "published",
      p_reason: "Isolated incomplete QA",
      p_confirm: true,
    }),
  );
  const quiz = add(ok(await save(author.db, doc, null, true, true)));
  state.quiz = quiz;
  persist();
  const read = ok(await guest.rpc("read_quiz", { p_resource: quiz }));
  eq(read.questions.length, 4);
  for (const field of [
    "correctOptionIds",
    "answer",
    "modelAnswer",
    "acceptedAnswers",
    "explanation",
  ]) {
    assert.ok(!JSON.stringify(read).includes('"' + field + '"'));
    checks++;
  }
  eq(
    ok(await guest.rpc("export_quiz", { p_resource: quiz })).questions[1]
      .answer,
    false,
  );
  const answer = [
    { id: "mc", answer: ["b", "a"] },
    { id: "tf", answer: false },
    { id: "ex", answer: "  lifo " },
    { id: "wr", answer: "my explanation" },
  ];
  const grade = (answers = answer, revision = 1) =>
    guest.rpc("grade_quiz", {
      p_resource: quiz,
      p_revision: revision,
      p_answers: answers,
    });
  eq(
    ok(await grade()).map((q) => q.status),
    ["correct", "correct", "correct", "self"],
  );
  eq(ok(await grade([{ id: "tf", answer: true }])).length, 1);
  for (const malformed of [
    [
      { id: "tf", answer: false },
      { id: "tf", answer: false },
    ],
    [{ id: "tf", answer: "false" }],
    [{ id: "mc", answer: ["unknown"] }],
    [{ id: "wr", answer: true }],
  ])
    denied(await grade(malformed));
  denied(await save(reader.db, doc, quiz, true, true));
  denied(
    await reader.db
      .from("quiz_sets")
      .update({ document: {} })
      .eq("resource_id", quiz),
  );
  ok(await grant(reader, false, true));
  ok(
    await reader.db.rpc("edit_resource", {
      p_resource: quiz,
      p_title: "QA arranged quiz title",
      p_description: doc.description,
      p_topic: null,
    }),
  );
  eq(
    ok(await guest.rpc("read_quiz", { p_resource: quiz })).title,
    "QA arranged quiz title",
  );
  denied(await save(reader.db, doc, quiz, true, true));
  ok(await save(author.db, doc, quiz, true, true));
  denied(await grade());
  eq(ok(await grade(answer, 2)).length, 4);
  ok(await grant(reader));
  ok(await reader.db.rpc("set_vote", { p_resource: quiz, p_value: 1 }));
  ok(await reader.db.rpc("toggle_save", { p_resource: quiz }));
  const question = ok(
    await reader.db.rpc("ask_question", {
      p_course: course.id,
      p_resource: quiz,
      p_title: "QA quiz discussion",
      p_body: "Can someone explain this answer?",
    }),
  );
  state.discussion = question;
  persist();
  ok(
    await admin.db.rpc("admin_manage_resource", {
      p_resource: quiz,
      p_title: doc.title,
      p_status: "hidden",
      p_reason: "Isolated hidden QA",
      p_confirm: true,
    }),
  );
  eq(ok(await guest.rpc("read_quiz", { p_resource: quiz })), null);
  eq(ok(await guest.rpc("export_quiz", { p_resource: quiz })), null);
  denied(await grade(answer, 2));
  ok(
    await admin.db.rpc("admin_manage_resource", {
      p_resource: quiz,
      p_title: doc.title,
      p_status: "published",
      p_reason: "Isolated restored QA",
      p_confirm: true,
    }),
  );
  // Solve links and real private-bucket PDF upload use the existing secure pipeline.
  const base = {
    p_course: course.id,
    p_topic: null,
    p_type: "question_bank",
    p_rights: true,
    p_ai: false,
    p_description: "Temporary quiz QA fixture",
  };
  state.link = add(
    ok(
      await author.db.rpc("submit_resource", {
        ...base,
        p_title: "QA website question bank",
        p_url: "https://example.org/quiz-" + randomUUID(),
      }),
    ),
  );
  const pdf = add(
    ok(
      await author.db.rpc("prepare_pdf", {
        ...base,
        p_title: "QA PDF question bank",
      }),
    ),
  );
  state.pdf = pdf;
  persist();
  const path = ok(
    await author.db
      .from("resources")
      .select("storage_path")
      .eq("id", pdf)
      .single(),
  ).storage_path;
  ok(
    await author.db.storage
      .from("course-pdfs")
      .upload(path, quizPdf(), { contentType: "application/pdf" }),
  );
  ok(
    await author.db.functions.invoke(
      process.env.SUPABASE_STORAGE_FUNCTION || "resource-files",
      { body: { action: "finalize", resource_id: pdf } },
    ),
  );
  eq(
    ok(
      await guest
        .from("resources")
        .select("status,source_kind,type")
        .eq("id", pdf)
        .single(),
    ),
    { status: "published", source_kind: "pdf", type: "question_bank" },
  );
  eq(ok(await reader.db.storage.from("course-pdfs").remove([path])), []);
  eq(
    ok(await author.db.storage.from("course-pdfs").list(author.id)).filter(
      (o) => path === author.id + "/" + o.name,
    ).length,
    1,
  );
  // Leave author approved for browser contribution tests; reader unapproved, global mode remains closed.
  eq(ok(await guest.rpc("material_access")).open_to_all, false);
  state.checks = checks;
  persist();
  console.log(
    `Hosted Supabase quiz checks: ${checks} passed. Temporary QA fixtures ready for browser tests.`,
  );
} finally {
  ok(await grant(reader));
}
