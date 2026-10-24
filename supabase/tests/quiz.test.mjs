import { beforeAll, beforeEach, afterAll, it, expect } from "vitest";
import { database } from "../../scripts/database.mjs";
let db, C, R, D;
const A = "75000000-0000-4000-8000-000000000001",
  B = "75000000-0000-4000-8000-000000000002",
  M = "75000000-0000-4000-8000-000000000003",
  I = "75000000-0000-4000-8000-000000000004";
const doc = {
  format: "elzatona.quiz",
  version: 1,
  title: "Quiz testing bank",
  description: "",
  language: "mixed",
  aiAssisted: false,
  questions: [
    {
      id: "mc",
      type: "mcq",
      prompt: "Pick both",
      options: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
        { id: "c", text: "C" },
      ],
      correctOptionIds: ["a", "b"],
      points: 2,
      explanation: "Both A and B",
    },
    { id: "tf", type: "true_false", prompt: "False statement", answer: false },
    {
      id: "ex",
      type: "written",
      prompt: "Short name",
      grading: "exact",
      modelAnswer: "Hello World",
      acceptedAnswers: ["Hello World"],
    },
    {
      id: "wr",
      type: "written",
      prompt: "Explain",
      grading: "self",
      modelAnswer: "Compare with this model.",
    },
  ],
};
const json = (v) => `'${JSON.stringify(v).replaceAll("'", "''")}'::jsonb`;
async function owner(sql) {
  await db.exec("reset role");
  return (await db.exec(sql)).at(-1);
}
async function as(id, sql) {
  await db.exec(
    `reset role;select set_config('request.jwt.claim.sub','${id || ""}',false);set role ${id ? "authenticated" : "anon"}`,
  );
  return db.query(sql);
}
const save = (d = doc, id = null, publish = false, rights = false) =>
  `select public.save_quiz('${C}',null,${json(d)},${id ? `'${id}'` : "null"},${publish},${rights}) id`;
const grade = (answers, revision = 1) =>
  `select public.grade_quiz('${R}',${revision},${json(answers)}) result`;
beforeAll(async () => {
  db = await database();
  for (const [id, name] of [
    [A, "quiz_author"],
    [B, "quiz_reader"],
    [M, "quiz_admin"],
    [I, "quiz_incomplete"],
  ])
    await owner(
      `insert into auth.users(id,email,raw_user_meta_data)values('${id}','${name}@example.test','{"full_name":"${name}","username":"${name}"}')`,
    );
  await owner(
    `select public.provision_admin('quiz_admin@example.test','quiz_admin');update public.student_academics set university_id=(select id from universities where slug='capital-university'),faculty_id=(select id from faculties where slug='computers'),academic_year=3,completed_at=now() where user_id in('${A}','${B}')`,
  );
  C = (await owner("select id from courses where code='CS 316'")).rows[0].id;
});
beforeEach(async () => {
  await owner(
    `delete from public.product_events;delete from public.discussions;delete from public.resources where source_kind='quiz';delete from public.mutation_limits;delete from public.material_permissions;update public.material_publishing_settings set open_to_all=false;update public.account_states set status='active';update public.courses set is_active=true where id='${C}'`,
  );
  D = (await as(B, save())).rows[0].id;
  await as(
    M,
    `select public.admin_set_material_permissions('${A}',true,false,'QA only',true)`,
  );
  R = (await as(A, save(doc, null, true, true))).rows[0].id;
});
afterAll(async () => await db?.close());
it("guest cannot create a private or public quiz", async () => {
  await expect(as(null, save())).rejects.toThrow();
});
it("unapproved students save private sets but cannot publish", async () => {
  expect(D).toBeTruthy();
  await expect(as(B, save(doc, D, true, true))).rejects.toThrow("restricted");
});
it("private drafts and keys are isolated from other students and guests", async () => {
  expect(
    (await as(A, `select * from quiz_sets where resource_id='${D}'`)).rows,
  ).toHaveLength(0);
  expect(
    (await as(B, `select * from quiz_sets where resource_id='${D}'`)).rows,
  ).toHaveLength(1);
  expect(
    (await as(null, `select * from resources where id='${D}'`)).rows,
  ).toHaveLength(0);
  await expect(as(null, "select * from quiz_sets")).rejects.toThrow();
  for (const f of ["read_quiz", "export_quiz"])
    expect(
      (await as(null, `select public.${f}('${D}') x`)).rows[0].x,
    ).toBeNull();
  await expect(
    as(
      null,
      `select public.grade_quiz('${D}',1,'[{"id":"mc","answer":["a"]}]')`,
    ),
  ).rejects.toThrow();
});
it("published play projection is anonymous and contains no keys; explicit export does", async () => {
  const p = (await as(null, `select public.read_quiz('${R}') x`)).rows[0].x;
  expect(p.questions).toHaveLength(4);
  const text = JSON.stringify(p);
  for (const k of [
    "correctOptionIds",
    "answer",
    "modelAnswer",
    "acceptedAnswers",
    "explanation",
  ])
    expect(text).not.toContain('"' + k + '"');
  expect(
    (await as(null, `select public.export_quiz('${R}') x`)).rows[0].x
      .questions[0].correctOptionIds,
  ).toEqual(["a", "b"]);
});
it("private draft payload table cannot be written directly by author or stranger", async () => {
  for (const id of [A, B])
    await expect(
      as(id, `update quiz_sets set document='{}' where resource_id='${R}'`),
    ).rejects.toThrow();
});
it("author IDs/course ownership cannot be forged, even with publisher or organizer rights", async () => {
  await expect(as(B, save(doc, R, true, true))).rejects.toThrow();
  await as(
    M,
    `select public.admin_set_material_permissions('${B}',true,true,'QA only',true)`,
  );
  await expect(as(B, save(doc, R, true, true))).rejects.toThrow(
    "not authorized",
  );
});
it("organizer can arrange metadata without rewriting quiz keys", async () => {
  await as(
    M,
    `select public.admin_set_material_permissions('${B}',false,true,'QA only',true)`,
  );
  await as(
    B,
    `select public.edit_resource('${R}','Organized quiz title','A better summary',null)`,
  );
  expect(
    (await as(null, `select public.read_quiz('${R}') x`)).rows[0].x.title,
  ).toBe("Organized quiz title");
  expect(
    (await as(null, `select public.export_quiz('${R}') x`)).rows[0].x.title,
  ).toBe("Organized quiz title");
  await expect(as(B, save(doc, R, true, true))).rejects.toThrow();
});
it("publishing requires explicit sharing rights", async () => {
  await expect(as(A, save(doc, null, true, false))).rejects.toThrow();
});
it("pending incomplete sets stay private; admin cannot bypass completeness by setting status", async () => {
  const d = structuredClone(doc);
  d.questions[0].correctOptionIds = null;
  const rid = (await as(A, save(d, null, false, true))).rows[0].id;
  await expect(
    as(
      M,
      `select public.admin_manage_resource('${rid}','Incomplete quiz title','published','QA review',true)`,
    ),
  ).rejects.toThrow();
  expect(
    (await as(null, `select public.read_quiz('${rid}') x`)).rows[0].x,
  ).toBeNull();
});
it("admin can review private keys and hide incomplete drafts without rights", async () => {
  expect(
    (await as(M, `select * from quiz_sets where resource_id='${D}'`)).rows,
  ).toHaveLength(1);
  await owner(`update resources set status='hidden' where id='${D}'`);
  await expect(as(B, save(doc, D))).rejects.toThrow();
});
it("MCQ exact set, false, whitespace-normalized exact text, long written self assessment", async () => {
  expect(
    (
      await as(
        null,
        grade([
          { id: "mc", answer: ["b", "a"] },
          { id: "tf", answer: false },
          { id: "ex", answer: " hello   WORLD " },
          { id: "wr", answer: "my own explanation" },
        ]),
      )
    ).rows[0].result.map((q) => q.status),
  ).toEqual(["correct", "correct", "correct", "self"]);
});
it("practice returns only the submitted question feedback", async () => {
  const feedback = (await as(null, grade([{ id: "tf", answer: true }]))).rows[0]
    .result;
  expect(feedback).toHaveLength(1);
  expect(feedback[0]).toMatchObject({
    id: "tf",
    status: "incorrect",
    answer: false,
  });
});
it("unanswered questions are separate from incorrect answers", async () => {
  expect(
    (
      await as(
        null,
        grade([
          { id: "mc", answer: null },
          { id: "tf", answer: null },
          { id: "ex", answer: "" },
          { id: "wr", answer: "  " },
        ]),
      )
    ).rows[0].result.map((q) => q.status),
  ).toEqual(Array(4).fill("unanswered"));
});
it("duplicate, unknown and malformed submissions fail", async () => {
  for (const answers of [
    [],
    [
      { id: "tf", answer: false },
      { id: "tf", answer: true },
    ],
    [{ id: "unknown", answer: false }],
    [{ id: "mc", answer: ["x"] }],
    [{ id: "mc", answer: ["a", "a"] }],
    [{ id: "tf", answer: "false" }],
    [{ id: "wr", answer: true }],
    [{ id: "ex", answer: "x".repeat(3001) }],
  ])
    await expect(as(null, grade(answers))).rejects.toThrow();
});
it("revision mismatch rejects grading after an author edit", async () => {
  await as(A, save(doc, R, true, true));
  await expect(as(null, grade([{ id: "tf", answer: false }]))).rejects.toThrow(
    "revision changed",
  );
  expect(
    (await as(null, grade([{ id: "tf", answer: false }], 2))).rows[0].result[0]
      .status,
  ).toBe("correct");
});
it("published quiz cannot be silently converted to an incomplete draft", async () => {
  await expect(as(A, save(doc, R, false, false))).rejects.toThrow(
    "published changes",
  );
});
it("hidden and inactive-course resources disappear from read/export/grade", async () => {
  for (const sql of [
    `update resources set status='hidden' where id='${R}'`,
    `update resources set status='published' where id='${R}';update courses set is_active=false where id='${C}'`,
  ]) {
    await owner(sql);
    for (const f of ["read_quiz", "export_quiz"])
      expect(
        (await as(null, `select public.${f}('${R}') x`)).rows[0].x,
      ).toBeNull();
    await expect(
      as(null, grade([{ id: "tf", answer: false }])),
    ).rejects.toThrow();
  }
});
it("suspension and incomplete onboarding deny private drafts too", async () => {
  await expect(as(I, save())).rejects.toThrow("onboarding");
  await owner(
    `update account_states set status='suspended' where user_id='${B}'`,
  );
  await expect(as(B, save())).rejects.toThrow();
});
it("publishing approval revocation blocks public-key edits but preserves private drafting", async () => {
  await as(
    M,
    `select public.admin_set_material_permissions('${A}',false,false,'QA revoke',true)`,
  );
  await expect(as(A, save(doc, R, true, true))).rejects.toThrow();
  expect((await as(A, save())).rows[0].id).toBeTruthy();
});
it("database rejects unsupported fields, types, key references and excessive size", async () => {
  const variants = [
    { ...doc, version: 2 },
    { ...doc, description: {} },
    { ...doc, questions: [] },
    {
      ...doc,
      questions: [{ ...doc.questions[0], correctOptionIds: ["absent"] }],
    },
    { ...doc, questions: [{ ...doc.questions[0], points: 1.5 }] },
    {
      ...doc,
      questions: [{ ...doc.questions[0], image: "https://example.org" }],
    },
    {
      ...doc,
      questions: Array.from({ length: 100 }, (_, i) => ({
        ...doc.questions[3],
        id: "q" + i,
        prompt: "أ".repeat(3000),
      })),
    },
  ];
  for (const d of variants) await expect(as(B, save(d))).rejects.toThrow();
});
it("raw quiz source/payload mismatch and missing public rights cannot bypass constraints", async () => {
  await expect(
    owner(
      `update resources set external_url='https://example.org' where id='${R}'`,
    ),
  ).rejects.toThrow();
  await expect(
    owner(`update resources set rights_confirmed=false where id='${R}'`),
  ).rejects.toThrow();
});
it("quiz readers retain votes, saves, and discussions without publishing approval", async () => {
  for (const sql of [
    `select public.set_vote('${R}',1)`,
    `select public.toggle_save('${R}')`,
    `select public.ask_question('${C}','${R}','Question about this quiz','Can someone explain the first answer?')`,
  ])
    await as(B, sql);
});

it("database rejects reserved imported question and option identifiers", async () => {
  for (const id of ["__proto__", "constructor", "toString"]) {
    let d = structuredClone(doc);
    d.questions[0].id = id;
    await expect(as(B, save(d))).rejects.toThrow("reserved");
    d = structuredClone(doc);
    d.questions[0].options[0].id = id;
    d.questions[0].correctOptionIds = [id];
    await expect(as(B, save(d))).rejects.toThrow("reserved");
  }
});
