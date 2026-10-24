// Explicitly provisioned isolated QA identities only. Never a real student's or founder's credentials.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { quizPdf } from "./support/quiz-pdf.mjs";
if (
  process.env.TEST_ALLOW_WRITES !== "1" ||
  !process.env.TEST_COMMUNITY_ACCOUNTS ||
  !process.env.TEST_COMMUNITY_STATE
)
  throw Error("Explicit QA accounts/state and TEST_ALLOW_WRITES=1 required");
const people = JSON.parse(
  readFileSync(process.env.TEST_COMMUNITY_ACCOUNTS, "utf8"),
);
if (
  people.length !== 5 ||
  people.some((p) => !p.email.startsWith("ez-community-"))
)
  throw Error("Non-QA identities refused");
const fresh = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
const guest = fresh();
let checks = 0;
const ok = (r) => {
  assert.equal(r.error, null, r.error?.message);
  checks++;
  return r.data;
};
const denied = (r) => {
  assert.ok(r.error, "Expected permission/input failure");
  checks++;
};
const eq = (a, b) => {
  assert.deepEqual(a, b);
  checks++;
};
for (const p of people) {
  p.db = fresh();
  ok(
    await p.db.auth.signInWithPassword({
      email: p.email,
      password: p.password,
    }),
  );
}
const [student, trusted, leader, outsider, manager] = people;
const c = ok(
    await guest
      .from("courses")
      .select("*")
      .eq("slug", "capital-ai-310")
      .single(),
  ),
  d = ok(
    await guest
      .from("courses")
      .select("*")
      .eq("slug", "capital-cs-316")
      .single(),
  );
const state = {
  course: c.id,
  slug: c.slug,
  otherCourse: d.id,
  otherSlug: d.slug,
  run: student.username,
  resources: [],
};
const persist = () =>
  writeFileSync(process.env.TEST_COMMUNITY_STATE, JSON.stringify(state), {
    mode: 0o600,
  });
persist();
const assign = (p, role, courses = []) =>
  manager.db.rpc("admin_assign_community_role", {
    p_user: p.id,
    p_role: role,
    p_courses: courses,
    p_reason: "Isolated community role QA",
    p_confirm: true,
  });
const material = (db, course = c.id, title = "QA community material") =>
  db.rpc("submit_resource", {
    p_course: course,
    p_topic: null,
    p_title: title,
    p_description: "Temporary community quality-control QA fixture",
    p_type: "notes",
    p_url: "https://example.org/community-" + randomUUID(),
    p_rights: true,
    p_ai: false,
  });
const save = (id) => {
  state.resources.push(id);
  persist();
  return id;
};
const row = (db, id) => db.from("resources").select("*").eq("id", id).single();
const review = (db, id, version, decision = "approved") =>
  db.rpc("review_material", {
    p_resource: id,
    p_version: version,
    p_decision: decision,
    p_reason: "QA review decision and source check",
  });
const fileFunction = process.env.SUPABASE_STORAGE_FUNCTION || "resource-files";
const invoke = (db, action, id) =>
  db.functions.invoke(fileFunction, { body: { action, resource_id: id } });
const doc = JSON.parse(readFileSync("tests/fixtures/quiz.json", "utf8"));
const quiz = (db, publish = true, rights = true) =>
  db.rpc("save_quiz", {
    p_course: c.id,
    p_topic: null,
    p_document: doc,
    p_resource: null,
    p_publish: publish,
    p_rights: rights,
  });
const pdf = async (p, title) => {
  const id = save(
    ok(
      await p.db.rpc("prepare_pdf", {
        p_course: c.id,
        p_topic: null,
        p_title: title,
        p_description: "Temporary real Storage QA",
        p_type: "notes",
        p_rights: true,
        p_ai: false,
      }),
    ),
  );
  const path = ok(await row(p.db, id)).storage_path;
  ok(
    await p.db.storage
      .from("course-pdfs")
      .upload(path, quizPdf(), { contentType: "application/pdf" }),
  );
  return { id, path };
};
eq(ok(await student.db.rpc("is_admin")), false);
eq(
  ok(await student.db.rpc("material_access", { p_course: c.id })).can_publish,
  false,
);
for (const p of [student, trusted, leader, outsider]) {
  denied(
    await p.db.rpc("admin_assign_community_role", {
      p_user: p.id,
      p_role: "admin",
      p_courses: [],
      p_reason: "forged self elevation",
      p_confirm: true,
    }),
  );
  denied(
    await p.db
      .from("community_roles")
      .insert({ user_id: p.id, role: "trusted" }),
  );
}
ok(await assign(trusted, "trusted"));
ok(await assign(leader, "class_leader", [c.id]));
ok(await assign(outsider, "class_leader", [d.id]));
eq(
  ok(await leader.db.rpc("material_access", { p_course: c.id })).can_review,
  true,
);
eq(
  ok(await leader.db.rpc("material_access", { p_course: d.id })).can_review,
  false,
);
eq(
  ok(await trusted.db.rpc("material_access", { p_course: c.id })).can_review,
  false,
);
const link = save(ok(await material(student.db)));
state.link = link;
persist();
eq(ok(await row(student.db, link)).review_state, "submitted");
eq(ok(await guest.from("resources").select("id").eq("id", link)), []);
eq(ok(await trusted.db.from("resources").select("id").eq("id", link)), []);
denied(await review(student.db, link, 1));
denied(await review(trusted.db, link, 1));
denied(await review(outsider.db, link, 1));
eq(ok(await leader.db.from("resources").select("id").eq("id", link)).length, 1);
ok(await review(leader.db, link, 1, "rejected"));
eq(
  ok(
    await student.db
      .from("latest_resource_reviews")
      .select("reason")
      .eq("resource_id", link),
  ).length,
  1,
);
eq(
  ok(
    await trusted.db
      .from("resource_reviews")
      .select("*")
      .eq("resource_id", link),
  ),
  [],
);
ok(
  await student.db.rpc("edit_proposed_resource", {
    p_resource: link,
    p_title: "QA corrected community material",
    p_description: "Corrected after feedback",
    p_topic: null,
    p_url: "https://example.org/corrected-" + randomUUID(),
  }),
);
denied(await review(leader.db, link, 1));
ok(await review(leader.db, link, 2));
eq(ok(await row(guest, link)).status, "published");
denied(
  await student.db.rpc("edit_resource", {
    p_resource: link,
    p_title: "Unreviewed edit attack",
    p_description: "",
    p_topic: null,
  }),
);
const direct = save(ok(await material(trusted.db)));
state.trustedLink = direct;
persist();
eq(ok(await row(guest, direct)).review_state, "approved");
ok(await student.db.rpc("set_vote", { p_resource: direct, p_value: 1 }));
ok(await student.db.rpc("toggle_save", { p_resource: direct }));
ok(await student.db.rpc("follow_course", { p_course: c.id }));
state.discussion = ok(
  await student.db.rpc("ask_question", {
    p_course: c.id,
    p_resource: direct,
    p_title: "QA ordinary discussion",
    p_body: "An ordinary student can still ask about this source.",
  }),
);
persist();
ok(
  await student.db.rpc("reply_question", {
    p_discussion: state.discussion,
    p_body: "Ordinary discussion and reply still work.",
  }),
);
const own = save(ok(await material(leader.db, c.id, "QA leader own material")));
eq(ok(await leader.db.rpc("can_review_material", { p_resource: own })), true);
ok(await review(leader.db, own, 1));
eq(
  ok(await guest.from("resources").select("status").eq("id", own).single())
    .status,
  "published",
);
const ownOutside = save(
  ok(await material(leader.db, d.id, "QA leader out-of-scope own material")),
);
eq(
  ok(await leader.db.rpc("can_review_material", { p_resource: ownOutside })),
  false,
);
denied(await review(leader.db, ownOutside, 1));
const other = save(
  ok(await material(student.db, d.id, "QA other course material")),
);
denied(await review(leader.db, other, 1));
ok(await review(outsider.db, other, 1));
const topic = ok(
  await leader.db.rpc("add_material_topic", {
    p_course: c.id,
    p_title: "QA scoped topic " + randomUUID().slice(0, 8),
  }),
);
state.topic = topic;
persist();
ok(
  await leader.db.rpc("organize_topic", {
    p_topic: topic,
    p_title: "QA renamed scoped topic " + randomUUID().slice(0, 8),
    p_order: 2,
  }),
);
ok(
  await leader.db.rpc("edit_resource", {
    p_resource: link,
    p_title: "QA organized accepted material",
    p_description: "Organized by the assigned reviewer",
    p_topic: topic,
  }),
);
denied(
  await outsider.db.rpc("edit_resource", {
    p_resource: link,
    p_title: "Out of scope attack",
    p_description: "",
    p_topic: null,
  }),
);
denied(
  await trusted.db.rpc("add_material_topic", {
    p_course: c.id,
    p_title: "Unauthorized topic",
  }),
);
const privateQuiz = save(ok(await quiz(student.db, false, false)));
eq(
  ok(
    await leader.db
      .from("quiz_sets")
      .select("*")
      .eq("resource_id", privateQuiz),
  ),
  [],
);
eq(ok(await guest.rpc("read_quiz", { p_resource: privateQuiz })), null);
const proposedQuiz = save(ok(await quiz(student.db)));
state.quiz = proposedQuiz;
persist();
eq(ok(await guest.rpc("read_quiz", { p_resource: proposedQuiz })), null);
eq(
  ok(
    await leader.db
      .from("quiz_sets")
      .select("*")
      .eq("resource_id", proposedQuiz),
  ).length,
  1,
);
eq(
  ok(
    await outsider.db
      .from("quiz_sets")
      .select("*")
      .eq("resource_id", proposedQuiz),
  ),
  [],
);
denied(
  await guest.rpc("grade_quiz", {
    p_resource: proposedQuiz,
    p_revision: 1,
    p_answers: [{ id: "tf", answer: false }],
  }),
);
ok(await review(leader.db, proposedQuiz, 2));
eq(
  ok(await guest.rpc("read_quiz", { p_resource: proposedQuiz })).questions
    .length,
  4,
);
eq(
  ok(
    await guest.rpc("grade_quiz", {
      p_resource: proposedQuiz,
      p_revision: 1,
      p_answers: [{ id: "tf", answer: false }],
    }),
  )[0].status,
  "correct",
);
const normalPdf = await pdf(student, "QA ordinary reviewed PDF");
state.pdf = normalPdf.id;
persist();
denied(await invoke(guest, "open", normalPdf.id));
const final = ok(await invoke(student.db, "finalize", normalPdf.id));
eq(final.published, false);
eq(final.submitted, true);
eq(ok(await row(student.db, normalPdf.id)).review_state, "submitted");
denied(await invoke(guest, "open", normalPdf.id));
denied(await invoke(outsider.db, "review", normalPdf.id));
const preview = ok(await invoke(leader.db, "review", normalPdf.id));
const bytes = await fetch(preview.url);
eq(bytes.status, 200);
eq(
  Buffer.from(await bytes.arrayBuffer())
    .subarray(0, 5)
    .toString(),
  "%PDF-",
);
ok(await invoke(student.db, "review", normalPdf.id));
eq(
  ok(await student.db.storage.from("course-pdfs").remove([normalPdf.path])),
  [],
);
denied(
  await student.db.storage
    .from("course-pdfs")
    .upload(normalPdf.path, quizPdf(), {
      contentType: "application/pdf",
      upsert: true,
    }),
);
ok(await review(leader.db, normalPdf.id, 1));
eq(ok(await row(guest, normalPdf.id)).status, "published");
ok(await invoke(guest, "open", normalPdf.id));
const trustedPdf = await pdf(trusted, "QA trusted direct PDF");
eq(ok(await invoke(trusted.db, "finalize", trustedPdf.id)).published, true);
const revokedPdf = await pdf(trusted, "QA trust revoked during upload");
ok(await assign(trusted, "student"));
eq(ok(await invoke(trusted.db, "finalize", revokedPdf.id)).published, false);
eq(ok(await row(trusted.db, revokedPdf.id)).review_state, "submitted");
ok(await assign(trusted, "trusted"));
const revokeLink = save(
  ok(await material(student.db, c.id, "QA revoke scope material")),
);
ok(await assign(leader, "class_leader", [d.id]));
denied(await review(leader.db, revokeLink, 1));
denied(await invoke(leader.db, "review", revokedPdf.id));
ok(await assign(leader, "class_leader", [c.id]));
ok(await assign(outsider, "admin"));
eq(ok(await outsider.db.rpc("is_admin")), true);
ok(await assign(outsider, "class_leader", [d.id]));
eq(ok(await outsider.db.rpc("is_admin")), false);
denied(
  await manager.db.rpc("admin_set_publishing_mode", {
    p_open: true,
    p_reason: "obsolete bypass",
    p_confirm: true,
  }),
);
const waiting = save(
  ok(await material(student.db, c.id, "QA queue item for browser review")),
);
state.waiting = waiting;
persist();
state.checks = checks;
persist();
console.log(
  `Hosted community-role verification: ${checks} assertions passed. Temporary fixtures ready for browser journeys.`,
);
