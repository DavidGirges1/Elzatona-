import { beforeAll, afterAll, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { database } from "../../scripts/database.mjs";
let db, U, F, first, third, fourth;
const A = "73000000-0000-4000-8000-000000000001",
  B = "73000000-0000-4000-8000-000000000002",
  O = "73000000-0000-4000-8000-000000000003";
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
beforeAll(async () => {
  db = await database();
  await owner(
    `insert into auth.users(id,raw_user_meta_data) values('${A}','{"full_name":"Curriculum QA A","username":"curriculum_a"}'),('${B}','{"full_name":"Curriculum QA B","username":"curriculum_b"}'),('${O}','{"full_name":"Incomplete QA","username":"curriculum_o"}')`,
  );
  U = (
    await owner(
      "select id from public.universities where slug='capital-university'",
    )
  ).rows[0].id;
  F = (await owner("select id from public.faculties where slug='computers'"))
    .rows[0].id;
  for (const id of [A, B])
    await as(id, `select public.set_academic_context('${U}','${F}',3)`);
  const rows = (
    await owner(
      "select id,code from public.courses where curriculum_source='capital-computing-2021'",
    )
  ).rows;
  first = rows.find((c) => c.code === "CS 111").id;
  third = rows.find((c) => c.code === "CS 316").id;
  fourth = rows.find((c) => c.code === "CS 419").id;
  await owner(
    `insert into public.community_roles(user_id,role) values('${A}','trusted'),('${B}','trusted')`,
  );
});
afterAll(async () => await db?.close());
it("imports all 122 courses into the existing faculty without invented semesters", async () => {
  const rows = (
    await as(
      null,
      `select * from public.courses where university_id='${U}' and faculty_id='${F}'`,
    )
  ).rows;
  expect(rows).toHaveLength(122);
  expect(rows.every((c) => c.semester === null)).toBe(true);
  expect(
    (await as(null, "select * from public.course_requirements")).rows,
  ).toHaveLength(160);
});
it("anonymous and ordinary students cannot alter curriculum classifications", async () => {
  await expect(
    as(
      null,
      `insert into public.course_requirements values('${first}','cs','elective',14)`,
    ),
  ).rejects.toThrow();
  await expect(
    as(A, `update public.course_requirements set kind='elective'`),
  ).rejects.toThrow();
});
it("anonymous and incomplete accounts cannot bulk-add courses", async () => {
  await expect(
    as(null, `select public.add_courses(array['${first}']::uuid[])`),
  ).rejects.toThrow();
  await expect(
    as(O, `select public.add_courses(array['${first}']::uuid[])`),
  ).rejects.toThrow("complete academic onboarding");
});
it("third-year student can add a mixed-year group and repeated adds never remove follows", async () => {
  const sql = `select public.add_courses(array['${first}','${third}','${fourth}','${first}']::uuid[]) n`;
  expect((await as(A, sql)).rows[0].n).toBe(3);
  expect((await as(A, sql)).rows[0].n).toBe(0);
  expect((await as(A, "select * from public.user_courses")).rows).toHaveLength(
    3,
  );
});
it("another student cannot read or forge the first student course list", async () => {
  expect((await as(B, "select * from public.user_courses")).rows).toEqual([]);
  await expect(
    as(
      B,
      `insert into public.user_courses(user_id,course_id) values('${A}','${first}')`,
    ),
  ).rejects.toThrow();
  expect(
    (await as(B, `select public.add_courses(array['${first}']::uuid[]) n`))
      .rows[0].n,
  ).toBe(1);
  expect(
    (await as(B, "select * from public.user_courses")).rows.every(
      (r) => r.user_id === B,
    ),
  ).toBe(true);
});
it("invalid groups fail atomically without partial follows", async () => {
  await as(B, `select public.follow_course('${first}')`);
  await expect(
    as(
      B,
      `select public.add_courses(array['${first}',gen_random_uuid()]::uuid[])`,
    ),
  ).rejects.toThrow("course unavailable");
  expect((await as(B, "select * from public.user_courses")).rows).toEqual([]);
  for (const arr of [
    "null",
    "array[]::uuid[]",
    "array[null]::uuid[]",
    `array_fill('${first}'::uuid,array[101])`,
  ])
    await expect(as(B, `select public.add_courses(${arr})`)).rejects.toThrow();
});
it("inactive courses cannot be added and their curriculum metadata is not public", async () => {
  await owner(`update public.courses set is_active=false where id='${fourth}'`);
  await expect(
    as(B, `select public.add_courses(array['${first}','${fourth}']::uuid[])`),
  ).rejects.toThrow("course unavailable");
  expect(
    (
      await as(
        null,
        `select * from public.course_requirements where course_id='${fourth}'`,
      )
    ).rows,
  ).toEqual([]);
  await owner(`update public.courses set is_active=true where id='${fourth}'`);
});
it("cross-year contribution, questions, votes and saves remain normal community actions", async () => {
  const resource = (
    await as(
      A,
      `select public.submit_material('${first}','general',array[]::uuid[],'Cross-year test resource','A temporary reference','reference','https://example.org/cross-year',true,false) id`,
    )
  ).rows[0].id;
  expect(
    (
      await as(
        null,
        `select id from public.resource_cards where id='${resource}'`,
      )
    ).rows,
  ).toHaveLength(1);
  await as(B, `select public.set_vote('${resource}',1);`);
  await as(B, `select public.toggle_save('${resource}')`);
  const question = (
    await as(
      B,
      `select public.ask_question('${first}','${resource}','Cross year question','Can students in another year discuss this course?') id`,
    )
  ).rows[0].id;
  await as(
    A,
    `select public.reply_question('${question}','Yes, this remains a shared course community.')`,
  );
  await expect(
    as(
      B,
      `select public.edit_material('${resource}','Stolen resource title','not allowed','general',array[]::uuid[])`,
    ),
  ).rejects.toThrow();
});
it("existing individual unfollow still removes exactly one course", async () => {
  await as(A, `select public.follow_course('${first}')`);
  expect(
    (await as(A, "select course_id from public.user_courses")).rows
      .map((r) => r.course_id)
      .sort(),
  ).toEqual([third, fourth].sort());
});
it("editing the year changes context without dropping cross-year selections", async () => {
  const before = (
    await as(A, "select course_id from public.user_courses order by course_id")
  ).rows;
  await as(A, `select public.set_academic_context('${U}','${F}',4)`);
  expect(
    (
      await as(
        A,
        "select course_id from public.user_courses order by course_id",
      )
    ).rows,
  ).toEqual(before);
  expect(
    (await as(A, "select public.student_context() c")).rows[0].c.academic_year,
  ).toBe(4);
});
it("suspended accounts cannot bulk-add even with an existing session", async () => {
  await owner(
    `update public.account_states set status='suspended' where user_id='${B}'`,
  );
  await expect(
    as(B, `select public.add_courses(array['${first}']::uuid[])`),
  ).rejects.toThrow("active account required");
});
it("replaying the catalogue preserves stable IDs, follows and editorial deactivation", async () => {
  await owner(`update public.courses set is_active=false where id='${first}'`);
  await owner(
    await readFile(
      "supabase/migrations/20261023181732_capital_computing_curriculum.sql",
      "utf8",
    ),
  );
  const rows = (
    await owner(
      `select id,is_active from public.courses where curriculum_source='capital-computing-2021'`,
    )
  ).rows;
  expect(rows).toHaveLength(122);
  expect(rows.find((c) => c.id === first)?.is_active).toBe(false);
  expect((await as(A, "select * from public.user_courses")).rows).toHaveLength(
    2,
  );
});
