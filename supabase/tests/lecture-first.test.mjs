import { beforeAll, beforeEach, afterAll, it, expect } from "vitest";
import { database } from "../../scripts/database.mjs";
let db, C, D, L1, L2, L3, R;
const A = "89000000-0000-4000-8000-000000000001",
  B = "89000000-0000-4000-8000-000000000002",
  L = "89000000-0000-4000-8000-000000000003",
  M = "89000000-0000-4000-8000-000000000004";
const json = (v) => `'${JSON.stringify(v).replaceAll("'", "''")}'::jsonb`;
const arr = (ids) => `array[${ids.map((id) => `'${id}'`).join(",")}]::uuid[]`;
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
const submit = (
  area = "lecture",
  ids = [L1],
  type = "notes",
  url = "https://example.org/lecture",
) =>
  `select public.submit_material('${C}','${area}',${arr(ids)},'Lecture source title','','${type}','${url}',true,false) id`;
const review = (id = R, version = 1, area = "lecture", ids = [L1]) =>
  `select public.review_placed_material('${id}',${version},'approved','Verified source', '${area}',${arr(ids)})`;
beforeAll(async () => {
  db = await database();
  for (const [id, name] of [
    [A, "lf_author"],
    [B, "lf_trusted"],
    [L, "lf_leader"],
    [M, "lf_admin"],
  ])
    await owner(
      `insert into auth.users(id,email,raw_user_meta_data) values('${id}','${name}@example.test','{"full_name":"${name}","username":"${name}"}')`,
    );
  await owner(
    `select public.provision_admin('lf_admin@example.test','lf_admin');update student_academics set university_id=(select id from universities where slug='capital-university'),faculty_id=(select id from faculties where slug='computers'),academic_year=3,completed_at=now() where user_id in('${A}','${B}','${L}','${M}')`,
  );
  C = (await owner("select id from courses where code='CS 316'")).rows[0].id;
  D = (await owner("select id from courses where code='CS 111'")).rows[0].id;
  await as(
    M,
    `select public.admin_assign_community_role('${B}','trusted',array[]::uuid[],'QA setup',true)`,
  );
  await as(
    M,
    `select public.admin_assign_community_role('${L}','class_leader',array['${C}']::uuid[],'QA setup',true)`,
  );
  L1 = (await as(L, `select public.save_lecture('${C}',1,'Introduction') id`))
    .rows[0].id;
  L2 = (await as(L, `select public.save_lecture('${C}',3,'SQL Joins') id`))
    .rows[0].id;
  L3 = (await as(M, `select public.save_lecture('${D}',1,'Other course') id`))
    .rows[0].id;
});
beforeEach(async () => {
  await owner(
    `update material_maintenance set paused=false;delete from product_events where actor_id in('${A}','${B}','${L}','${M}');delete from discussions where author_id in('${A}','${B}','${L}','${M}');delete from resources where author_id in('${A}','${B}','${L}','${M}');delete from mutation_limits where user_id in('${A}','${B}','${L}','${M}')`,
  );
  R = (await as(A, submit())).rows[0].id;
});
afterAll(async () => await db?.close());
it("lecture numbers have gaps and renumbering preserves stable IDs", async () => {
  await as(L, `select public.save_lecture('${C}',5,'Renumbered','${L2}')`);
  expect(
    (await as(null, `select id,number from lectures where id='${L2}'`)).rows[0],
  ).toEqual({ id: L2, number: 5 });
  await expect(
    as(L, `select public.save_lecture('${C}',1,'Duplicate')`),
  ).rejects.toThrow();
});
it("ordinary/trusted cannot create lectures; leader cannot create outside scope", async () => {
  for (const [actor, course] of [
    [A, C],
    [B, C],
    [L, D],
  ])
    await expect(
      as(actor, `select public.save_lecture('${course}',20,'Forbidden')`),
    ).rejects.toThrow();
});
it.each([
  ["lecture", [], "notes"],
  ["general", [null], "notes"],
  ["general", [], "sheets"],
  ["lecture", [], "sections"],
  ["sections", [], "notes"],
  ["revision", [], "sections"],
])("invalid placement %s %j %s denied", async (area, ids, type) => {
  await expect(as(A, submit(area, ids, type))).rejects.toThrow();
});
it("null area, cross-course and duplicate lectures fail at RPC", async () => {
  await expect(as(A, submit("lecture", [L3]))).rejects.toThrow(
    "outside course",
  );
  await expect(as(A, submit("lecture", [L1, L1]))).rejects.toThrow(
    "placement required",
  );
  await expect(as(A, submit().replace("'lecture'", "null"))).rejects.toThrow(
    "placement required",
  );
});
it("pending placement and material are private to author and scoped reviewers", async () => {
  expect(
    (await as(null, `select * from resource_lectures where resource_id='${R}'`))
      .rows,
  ).toEqual([]);
  expect((await as(B, `select * from resources where id='${R}'`)).rows).toEqual(
    [],
  );
  expect(
    (await as(L, `select * from resource_lectures where resource_id='${R}'`))
      .rows,
  ).toHaveLength(1);
});
it("same resource belongs to multiple lectures with one canonical card, vote and save", async () => {
  const r = (
    await as(
      B,
      submit("lecture", [L1, L2], "notes", "https://example.org/shared"),
    )
  ).rows[0].id;
  const row = (await as(null, `select * from resource_cards where id='${r}'`))
    .rows;
  expect(row).toHaveLength(1);
  expect(row[0].lecture_ids).toEqual([L1, L2]);
  await as(A, `select public.set_vote('${r}',1)`);
  await as(A, `select public.toggle_save('${r}')`);
  expect(
    (await as(null, `select score from resource_cards where id='${r}'`)).rows[0]
      .score,
  ).toBe(1);
  expect(
    (await as(A, `select * from resource_saves where resource_id='${r}'`)).rows,
  ).toHaveLength(1);
});
it("duplicate URL does not change original placement or author", async () => {
  const id = (
    await as(B, submit("lecture", [L1], "notes", "https://example.org/dup"))
  ).rows[0].id;
  const result = (
    await as(A, submit("revision", [], "notes", "https://example.org/dup"))
  ).rows[0].id;
  expect(result).toBe(id);
  expect(
    (
      await as(
        null,
        `select area,author_id,lecture_ids from resource_cards where id='${id}'`,
      )
    ).rows[0],
  ).toMatchObject({ area: "lecture", author_id: B, lecture_ids: [L1] });
});
it("review can correct placement atomically and logs resulting version", async () => {
  await as(L, review(R, 1, "lecture", [L2]));
  expect(
    (await as(null, `select lecture_ids from resource_cards where id='${R}'`))
      .rows[0].lecture_ids,
  ).toEqual([L2]);
  expect(
    (
      await as(
        A,
        `select submission_version from resource_reviews where resource_id='${R}'`,
      )
    ).rows[0].submission_version,
  ).toBe(2);
});
it("stale approval cannot change placement", async () => {
  await as(
    A,
    `select public.edit_proposed_material('${R}','Updated source','','lecture',${arr([L1])},'https://example.org/updated')`,
  );
  await expect(as(L, review(R, 1, "lecture", [L2]))).rejects.toThrow(
    "submission changed",
  );
  expect(
    (
      await as(
        A,
        `select lecture_id from resource_lectures where resource_id='${R}'`,
      )
    ).rows[0].lecture_id,
  ).toBe(L1);
});
it("class leader can approve their own valid submitted resource", async () => {
  const r = (
    await as(L, submit("lecture", [L1], "slides", "https://example.org/self"))
  ).rows[0].id;
  await as(L, review(r));
  expect(
    (await as(null, `select id from resources where id='${r}'`)).rows,
  ).toHaveLength(1);
});
it("ordinary and trusted cannot approve someone else or edit someone else", async () => {
  for (const actor of [A, B])
    await expect(as(actor, review())).rejects.toThrow();
  await expect(
    as(
      B,
      `select public.edit_proposed_material('${R}','Stolen source','','lecture',${arr([L2])},'https://example.org/stolen')`,
    ),
  ).rejects.toThrow();
});
it("main pick limited to one published study source in the selected lecture", async () => {
  const x = (
    await as(B, submit("lecture", [L1], "notes", "https://example.org/main1"))
  ).rows[0].id;
  const y = (
    await as(B, submit("lecture", [L1], "slides", "https://example.org/main2"))
  ).rows[0].id;
  await expect(
    as(L, `select public.set_lecture_main('${L1}','${R}')`),
  ).rejects.toThrow();
  await as(L, `select public.set_lecture_main('${L1}','${x}')`);
  await as(L, `select public.set_lecture_main('${L1}','${y}')`);
  expect(
    (
      await as(
        null,
        `select resource_id from resource_lectures where lecture_id='${L1}' and is_main`,
      )
    ).rows,
  ).toEqual([{ resource_id: y }]);
  await expect(
    as(L, `select public.set_lecture_main('${L2}','${y}')`),
  ).rejects.toThrow();
  await expect(
    as(B, `select public.set_lecture_main('${L1}','${x}')`),
  ).rejects.toThrow();
});
it("hidden, moved, removed source clears main; practice cannot be selected", async () => {
  const x = (
    await as(B, submit("lecture", [L1], "notes", "https://example.org/main"))
  ).rows[0].id;
  const q = (
    await as(B, submit("lecture", [L1], "sheets", "https://example.org/sheet"))
  ).rows[0].id;
  await expect(
    as(L, `select public.set_lecture_main('${L1}','${q}')`),
  ).rejects.toThrow();
  await as(L, `select public.set_lecture_main('${L1}','${x}')`);
  await as(
    B,
    `select public.edit_material('${x}','Moved main source','','general',array[]::uuid[])`,
  );
  expect(
    (await as(null, `select * from resource_lectures where resource_id='${x}'`))
      .rows,
  ).toEqual([]);
  await as(
    L,
    `select public.edit_material('${x}','Return main source','','lecture',${arr([L1])})`,
  );
  await as(L, `select public.set_lecture_main('${L1}','${x}')`);
  await as(
    M,
    `select public.admin_manage_resource('${x}','Hide main source','hidden','QA hide source',true)`,
  );
  expect(
    (
      await owner(
        `select is_main from resource_lectures where resource_id='${x}'`,
      )
    ).rows[0].is_main,
  ).toBe(false);
});
it("populated lecture deletion fails until sources are moved, preserving discussion", async () => {
  const temp = (
    await as(L, `select public.save_lecture('${C}',33,'Temporary') id`)
  ).rows[0].id;
  const r = (
    await as(B, submit("lecture", [temp], "notes", "https://example.org/temp"))
  ).rows[0].id;
  const d = (
    await as(
      A,
      `select public.ask_lecture_question('${C}',null,'${temp}','Lecture question','A question about this lecture') id`,
    )
  ).rows[0].id;
  await expect(
    as(L, `select public.delete_lecture('${temp}')`),
  ).rejects.toThrow("move materials");
  await as(
    B,
    `select public.edit_material('${r}','Moved source title','','general',array[]::uuid[])`,
  );
  await as(L, `select public.delete_lecture('${temp}')`);
  expect(
    (await as(null, `select lecture_id from discussions where id='${d}'`))
      .rows[0].lecture_id,
  ).toBeNull();
});
it("free course questions, contextual questions and replies work without creating lectures", async () => {
  const d = (
    await as(
      A,
      `select public.ask_lecture_question('${C}',null,null,'General question','Any tips for studying this course?') id`,
    )
  ).rows[0].id;
  await as(B, `select public.reply_question('${d}','A useful suggestion')`);
  const l = (
    await as(
      A,
      `select public.ask_lecture_question('${C}',null,'${L1}','Lecture question','Can someone explain the lecture?') id`,
    )
  ).rows[0].id;
  expect(
    (await as(null, `select lecture_id from discussions where id='${l}'`))
      .rows[0].lecture_id,
  ).toBe(L1);
  await expect(
    as(
      A,
      `select public.ask_lecture_question('${C}',null,'${L3}','Cross course','A forbidden context question')`,
    ),
  ).rejects.toThrow();
});
it("private quiz drafts require lecture/revision placement", async () => {
  const doc = {
    format: "elzatona.quiz",
    version: 1,
    title: "A private quiz",
    questions: [
      {
        id: "q1",
        type: "true_false",
        prompt: "A private question",
        answer: true,
      },
    ],
  };
  for (const area of ["general", "sections"])
    await expect(
      as(
        A,
        `select public.save_material_quiz('${C}','${area}',array[]::uuid[],${json(doc)})`,
      ),
    ).rejects.toThrow();
  const q = (
    await as(
      A,
      `select public.save_material_quiz('${C}','revision',array[]::uuid[],${json(doc)}) id`,
    )
  ).rows[0].id;
  expect(
    (await as(null, `select * from resources where id='${q}'`)).rows,
  ).toEqual([]);
});
it("even admin cannot edit another author quiz answers", async () => {
  const doc = {
    format: "elzatona.quiz",
    version: 1,
    title: "Private author quiz",
    questions: [
      {
        id: "q1",
        type: "true_false",
        prompt: "A valid question",
        answer: true,
      },
    ],
  };
  const q = (
    await as(
      A,
      `select public.save_material_quiz('${C}','revision',array[]::uuid[],${json(doc)}) id`,
    )
  ).rows[0].id;
  await expect(
    as(
      M,
      `select public.save_material_quiz('${C}','revision',array[]::uuid[],${json(doc)},'${q}',false,false)`,
    ),
  ).rejects.toThrow("only author");
});
it("PDF placement survives verification; pending bytes cannot bypass review", async () => {
  const p = (
    await as(
      A,
      `select public.prepare_material_pdf('${C}','lecture',${arr([L1, L2])},'Lecture PDF source','','slides',true,false) id`,
    )
  ).rows[0].id;
  await owner(`select public.finalize_pdf_checked('${p}','${A}')`);
  expect(
    (await as(null, `select * from resources where id='${p}'`)).rows,
  ).toEqual([]);
  await as(L, review(p, 1, "lecture", [L1, L2]));
  expect(
    (await as(null, `select lecture_ids from resource_cards where id='${p}'`))
      .rows[0].lecture_ids,
  ).toEqual([L1, L2]);
});
it("maintenance blocks material submissions, associations, curation, service finalization, Storage inserts; browsing/discussion remain", async () => {
  const p = (
    await as(
      A,
      `select public.prepare_material_pdf('${C}','general',array[]::uuid[],'Pending upload','','notes',true,false) id`,
    )
  ).rows[0].id;
  await owner("update material_maintenance set paused=true");
  for (const sql of [
    submit(),
    review(),
    `select public.save_lecture('${C}',40,'Paused')`,
    `select public.set_lecture_main('${L1}',null)`,
    `insert into storage.objects(bucket_id,name)values('course-pdfs','${A}/${p}.pdf')`,
  ])
    await expect(as(L, sql)).rejects.toThrow();
  await expect(
    owner(`select public.finalize_pdf_checked('${p}','${A}')`),
  ).rejects.toThrow("maintenance");
  await as(
    A,
    `select public.ask_lecture_question('${C}',null,null,'During maintenance','General discussion is still available')`,
  );
  expect(
    (await as(null, `select id from lectures where course_id='${C}'`)).rows
      .length,
  ).toBeGreaterThan(0);
});
it("no direct browser writes to new tables or private/retired entrypoints", async () => {
  for (const sql of [
    `insert into lectures(course_id,number)values('${C}',89)`,
    `insert into resource_lectures values('${R}','${L2}','${C}',true)`,
    `select elzatona_private.place_resource('${R}','general',array[]::uuid[])`,
    `select public.add_material_topic('${C}','Old topic')`,
    `select public.submit_resource('${C}',null,'Legacy bypass','','notes','https://example.org/old',true,false)`,
  ])
    await expect(as(A, sql)).rejects.toThrow();
});
