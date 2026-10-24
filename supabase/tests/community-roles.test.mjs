import { beforeAll, beforeEach, afterAll, it, expect } from "vitest";
import { database } from "../../scripts/database.mjs";
let db, C, D, R, P, Q;
const A = "76000000-0000-4000-8000-000000000001",
  B = "76000000-0000-4000-8000-000000000002",
  L = "76000000-0000-4000-8000-000000000003",
  M = "76000000-0000-4000-8000-000000000004",
  I = "76000000-0000-4000-8000-000000000005";
const doc = {
  format: "elzatona.quiz",
  version: 1,
  title: "Quiz role verification",
  questions: [
    {
      id: "tf",
      type: "true_false",
      prompt: "A correct statement",
      answer: true,
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
const assign = (id, role, courses = []) =>
  as(
    M,
    `select public.admin_assign_community_role('${id}','${role}',array[${courses.map((id) => `'${id}'`).join(",")}]::uuid[],'QA role decision',true)`,
  );
const submit = (course = C, url = "https://example.org/material") =>
  `select public.submit_resource('${course}',null,'Student material title','','notes','${url}',true,false) id`;
const review = (id = R, version = 1, decision = "approved") =>
  `select public.review_material('${id}',${version},'${decision}','Reviewed test material')`;
const quiz = (resource = "null", publish = true, rights = true) =>
  `select public.save_quiz('${C}',null,${json(doc)},${resource},${publish},${rights}) id`;
beforeAll(async () => {
  db = await database();
  for (const [id, name] of [
    [A, "role_author"],
    [B, "role_trusted"],
    [L, "role_leader"],
    [M, "role_manager"],
    [I, "role_incomplete"],
  ])
    await owner(
      `insert into auth.users(id,email,raw_user_meta_data) values('${id}','${name}@example.test','{"full_name":"${name}","username":"${name}"}')`,
    );
  await owner(
    `select public.provision_admin('role_manager@example.test','role_manager');update public.student_academics set university_id=(select id from universities where slug='capital-university'),faculty_id=(select id from faculties where slug='computers'),academic_year=3,completed_at=now() where user_id in('${A}','${B}','${L}','${M}')`,
  );
  C = (await owner("select id from courses where code='CS 316'")).rows[0].id;
  D = (await owner("select id from courses where code='CS 111'")).rows[0].id;
});
beforeEach(async () => {
  await owner(
    `delete from public.product_events;delete from public.discussions;delete from public.resource_reviews;delete from public.resources where author_id in('${A}','${B}','${L}');delete from public.community_roles;delete from public.mutation_limits;update public.account_states set status='active';update auth.users set email_confirmed_at=now();update public.courses set is_active=true where id in('${C}','${D}')`,
  );
  await assign(B, "trusted");
  await assign(L, "class_leader", [C]);
  R = (await as(A, submit())).rows[0].id;
  P = (
    await as(
      A,
      `select public.prepare_pdf('${C}',null,'Pending student PDF','','notes',true,false) id`,
    )
  ).rows[0].id;
  Q = (await as(A, quiz())).rows[0].id;
});
afterAll(async () => await db?.close());
it("signup has no role assignment and ordinary access has no organization or direct publishing", async () => {
  expect(
    (await as(A, "select public.material_access() x")).rows[0].x,
  ).toMatchObject({
    can_submit: true,
    can_publish: false,
    can_organize: false,
    can_review: false,
    open_to_all: false,
  });
  expect(
    (await as(A, `select * from community_roles where user_id='${A}'`)).rows,
  ).toEqual([]);
});
it("ordinary link and quiz proposals stay private until reviewed", async () => {
  for (const id of [R, Q]) {
    expect(
      (
        await as(
          A,
          `select status,review_state from resources where id='${id}'`,
        )
      ).rows[0],
    ).toEqual({ status: "pending", review_state: "submitted" });
    expect(
      (await as(null, `select * from resources where id='${id}'`)).rows,
    ).toEqual([]);
  }
  expect(
    (await as(null, `select public.read_quiz('${Q}') x`)).rows[0].x,
  ).toBeNull();
});
it("trusted contributors publish links and quizzes immediately without organization privileges", async () => {
  const r = (await as(B, submit(C, "https://example.org/trusted"))).rows[0].id;
  const q = (await as(B, quiz())).rows[0].id;
  for (const id of [r, q])
    expect(
      (await as(null, `select status from resources where id='${id}'`)).rows[0]
        .status,
    ).toBe("published");
  expect(
    (await as(B, "select public.material_access() x")).rows[0].x,
  ).toMatchObject({
    can_publish: true,
    can_review: false,
    can_organize: false,
  });
});
it("assigned leader reads pending submissions but not private quiz/PDF drafts or other courses", async () => {
  const other = (await as(A, submit(D, "https://example.org/other"))).rows[0]
    .id;
  const draft = (await as(A, quiz("null", false, false))).rows[0].id;
  expect(
    (
      await as(
        L,
        `select id from resources where id in('${R}','${Q}','${P}','${other}','${draft}')`,
      )
    ).rows
      .map((r) => r.id)
      .sort(),
  ).toEqual([R, Q].sort());
  expect(
    (await as(L, `select resource_id from quiz_sets where resource_id='${Q}'`))
      .rows,
  ).toHaveLength(1);
  expect(
    (await as(L, `select * from quiz_sets where resource_id='${draft}'`)).rows,
  ).toEqual([]);
});
it("leader can approve a link and complete quiz for guest access", async () => {
  await as(L, review());
  await as(L, review(Q, 2));
  expect(
    (await as(null, `select status from resources where id='${R}'`)).rows[0]
      .status,
  ).toBe("published");
  expect(
    (await as(null, `select public.read_quiz('${Q}') x`)).rows[0].x.questions,
  ).toHaveLength(1);
});
it("leader can approve their own submitted link and the decision is audited", async () => {
  const id = (await as(L, submit(C, "https://example.org/leader-own"))).rows[0]
    .id;
  expect(
    (await as(L, `select public.can_review_material('${id}') x`)).rows[0].x,
  ).toBe(true);
  expect(
    (await as(null, `select id from resources where id='${id}'`)).rows,
  ).toEqual([]);
  await as(L, review(id));
  expect(
    (await as(null, `select status from resources where id='${id}'`)).rows[0]
      .status,
  ).toBe("published");
  expect(
    (
      await as(
        L,
        `select reviewer_id,decision from resource_reviews where resource_id='${id}'`,
      )
    ).rows[0],
  ).toMatchObject({ reviewer_id: L, decision: "approved" });
});
it("self-review does not extend a leader's assigned courses", async () => {
  const id = (
    await as(L, submit(D, "https://example.org/leader-outside-scope"))
  ).rows[0].id;
  expect(
    (await as(L, `select public.can_review_material('${id}') x`)).rows[0].x,
  ).toBe(false);
  await expect(as(L, review(id))).rejects.toThrow("not authorized");
});
it("leader cannot self-review after role or course scope is revoked", async () => {
  const id = (await as(L, submit(C, "https://example.org/leader-revoked")))
    .rows[0].id;
  await assign(L, "class_leader", [D]);
  await expect(as(L, review(id))).rejects.toThrow("not authorized");
  await assign(L, "student");
  await expect(as(L, review(id))).rejects.toThrow("not authorized");
});
it("self-review preserves stale-version checks", async () => {
  const id = (await as(L, submit(C, "https://example.org/leader-version")))
    .rows[0].id;
  await as(
    L,
    `select public.edit_proposed_resource('${id}','Updated leader material','',null,'https://example.org/leader-version')`,
  );
  await expect(as(L, review(id, 1))).rejects.toThrow("submission changed");
  await as(L, review(id, 2));
});
it("leader can approve their own submitted quiz but cannot publish a private draft", async () => {
  const id = (await as(L, quiz("null", false))).rows[0].id;
  await expect(as(L, review(id))).rejects.toThrow("not authorized");
  await as(L, quiz(`'${id}'`, true));
  const version = (
    await as(L, `select submission_version from resources where id='${id}'`)
  ).rows[0].submission_version;
  await as(L, review(id, version));
  expect(
    (await as(null, `select public.read_quiz('${id}') x`)).rows[0].x.questions,
  ).toHaveLength(1);
});
it("leader can approve their own PDF only after verified submission", async () => {
  const id = (
    await as(
      L,
      `select public.prepare_pdf('${C}',null,'Leader own PDF','','notes',true,false) id`,
    )
  ).rows[0].id;
  await expect(as(L, review(id))).rejects.toThrow("not authorized");
  await owner(`select public.finalize_pdf_checked('${id}','${L}')`);
  await as(L, review(id));
  expect(
    (await as(null, `select status from resources where id='${id}'`)).rows[0]
      .status,
  ).toBe("published");
});
it("leader cannot review another course even by guessing the submission ID", async () => {
  const id = (await as(A, submit(D, "https://example.org/out-of-scope")))
    .rows[0].id;
  await expect(as(L, review(id))).rejects.toThrow("not authorized");
});
it("ordinary and trusted accounts cannot approve, assign roles or access admin account data", async () => {
  for (const id of [A, B]) {
    await expect(as(id, review())).rejects.toThrow();
    await expect(
      as(
        id,
        `select public.admin_assign_community_role('${id}','admin',array[]::uuid[],'attack',true)`,
      ),
    ).rejects.toThrow();
    await expect(as(id, "select public.admin_users()")).rejects.toThrow();
  }
});
it("role metadata and old publishing switches cannot grant privileges", async () => {
  await owner(
    `update auth.users set raw_user_meta_data=raw_user_meta_data||'{"role":"admin","can_publish":true}' where id='${A}';insert into material_permissions(user_id,can_publish,can_organize)values('${A}',true,true);update material_publishing_settings set open_to_all=true`,
  );
  expect(
    (await as(A, "select public.material_access() x")).rows[0].x,
  ).toMatchObject({ can_publish: false, can_review: false });
  await expect(
    as(M, "select public.admin_set_publishing_mode(true,'obsolete',true)"),
  ).rejects.toThrow();
  await expect(
    as(
      M,
      `select public.admin_set_material_permissions('${A}',true,true,'obsolete',true)`,
    ),
  ).rejects.toThrow();
});
it("raw privilege, resource visibility and scope table writes are denied", async () => {
  for (const sql of [
    `insert into community_roles(user_id,role)values('${A}','trusted')`,
    `insert into class_leader_courses values('${A}','${D}')`,
    `update resources set status='published' where id='${R}'`,
    `update user_roles set role='admin'`,
  ])
    await expect(as(A, sql)).rejects.toThrow();
});
it("only admin assigns explicit active course scopes, with reason and confirmation", async () => {
  for (const sql of [
    `select public.admin_assign_community_role('${A}','class_leader',array[]::uuid[],'QA valid',true)`,
    `select public.admin_assign_community_role('${A}','class_leader',array['${C}','${C}']::uuid[],'QA valid',true)`,
    `select public.admin_assign_community_role('${A}','trusted',array['${C}']::uuid[],'QA valid',true)`,
    `select public.admin_assign_community_role('${A}','trusted',array[]::uuid[],'',true)`,
    `select public.admin_assign_community_role('${A}','trusted',array[]::uuid[],'QA valid',false)`,
  ])
    await expect(as(M, sql)).rejects.toThrow();
  await owner(`update courses set is_active=false where id='${D}'`);
  await expect(assign(A, "class_leader", [D])).rejects.toThrow();
});
it("last active admin cannot be demoted; a second active admin permits a handover", async () => {
  await expect(assign(M, "student")).rejects.toThrow("last active admin");
  await assign(B, "admin");
  await assign(M, "student");
  expect((await as(B, "select public.is_admin() x")).rows[0].x).toBe(true);
  await as(
    B,
    `select public.admin_assign_community_role('${M}','admin',array[]::uuid[],'restore manager',true)`,
  );
  await assign(B, "trusted");
});
it("scopes and role assignments are auditable and private from other students", async () => {
  expect((await as(A, "select * from community_roles")).rows).toEqual([]);
  expect((await as(A, "select * from class_leader_courses")).rows).toEqual([]);
  await expect(as(null, "select * from community_roles")).rejects.toThrow();
  expect(
    (
      await as(
        M,
        "select * from admin_audit_log where action='community.role_assigned'",
      )
    ).rows.length,
  ).toBeGreaterThan(0);
});
it("revoking a leader scope immediately blocks pending approval and topic changes", async () => {
  await assign(L, "class_leader", [D]);
  await expect(as(L, review())).rejects.toThrow();
  await expect(
    as(L, `select public.add_material_topic('${C}','Revoked scope topic')`),
  ).rejects.toThrow();
});
it("revoking trust routes future submissions to review and blocks own published edits", async () => {
  const id = (await as(B, submit(C, "https://example.org/before-revoke")))
    .rows[0].id;
  await assign(B, "student");
  await expect(
    as(B, `select public.edit_resource('${id}','New title','',null)`),
  ).rejects.toThrow();
  const next = (await as(B, submit(C, "https://example.org/after-revoke")))
    .rows[0].id;
  expect(
    (await as(B, `select review_state from resources where id='${next}'`))
      .rows[0].review_state,
  ).toBe("submitted");
});
it("suspension, unverified email and incomplete onboarding override role grants", async () => {
  await owner(
    `update account_states set status='suspended' where user_id='${L}'`,
  );
  await expect(as(L, review())).rejects.toThrow();
  await owner(`update auth.users set email_confirmed_at=null where id='${B}'`);
  await expect(
    as(B, submit(C, "https://example.org/unverified")),
  ).rejects.toThrow();
  await expect(
    as(I, submit(C, "https://example.org/incomplete")),
  ).rejects.toThrow();
});
it("reject with reason, edit and resubmit; stale reviews are rejected", async () => {
  await as(L, review(R, 1, "rejected"));
  expect(
    (
      await as(
        A,
        `select reason from latest_resource_reviews where resource_id='${R}'`,
      )
    ).rows[0].reason,
  ).toContain("Reviewed");
  await as(
    A,
    `select public.edit_proposed_resource('${R}','Corrected resource','Corrected description',null,'https://example.org/corrected')`,
  );
  await expect(as(L, review(R, 1))).rejects.toThrow("submission changed");
  await as(L, review(R, 2));
  expect(
    (await as(null, `select title from resources where id='${R}'`)).rows[0]
      .title,
  ).toBe("Corrected resource");
});
it("another student cannot edit proposed material or inspect review notes", async () => {
  await as(L, review(R, 1, "rejected"));
  await expect(
    as(
      B,
      `select public.edit_proposed_resource('${R}','Attack resource','',null,'https://example.org/attack')`,
    ),
  ).rejects.toThrow();
  expect(
    (await as(B, `select * from resource_reviews where resource_id='${R}'`))
      .rows,
  ).toEqual([]);
});
it("ordinary authors cannot alter already approved content without publishing permission", async () => {
  await as(L, review());
  await expect(
    as(
      A,
      `select public.edit_resource('${R}','After approval attack','',null)`,
    ),
  ).rejects.toThrow();
});
it("approval cannot publish an unverified PDF or private quiz draft, even through generic admin moderation", async () => {
  await expect(
    as(
      M,
      `select public.admin_manage_resource('${P}','Pending PDF title','published','QA decision',true)`,
    ),
  ).rejects.toThrow();
  const draft = (await as(A, quiz("null", false, true))).rows[0].id;
  await expect(
    as(
      M,
      `select public.admin_manage_resource('${draft}','Private quiz title','published','QA decision',true)`,
    ),
  ).rejects.toThrow();
});
it("service verification sends normal PDF to review and direct readers remain denied", async () => {
  await expect(
    as(A, `select public.finalize_pdf_checked('${P}','${A}')`),
  ).rejects.toThrow();
  await owner(`select public.finalize_pdf_checked('${P}','${A}')`);
  expect(
    (
      await as(
        A,
        `select status,review_state,file_verified_at from resources where id='${P}'`,
      )
    ).rows[0],
  ).toMatchObject({ status: "pending", review_state: "submitted" });
  expect(
    (await as(null, `select * from resources where id='${P}'`)).rows,
  ).toEqual([]);
  await as(L, review(P));
  expect(
    (await as(null, `select status from resources where id='${P}'`)).rows[0]
      .status,
  ).toBe("published");
});
it("trust revoked while bytes upload cannot cause auto publication", async () => {
  const p = (
    await as(
      B,
      `select public.prepare_pdf('${C}',null,'Trusted pending PDF','','notes',true,false) id`,
    )
  ).rows[0].id;
  await assign(B, "student");
  await owner(`select public.finalize_pdf_checked('${p}','${B}')`);
  expect(
    (await as(B, `select status from resources where id='${p}'`)).rows[0]
      .status,
  ).toBe("pending");
});
it("trusted PDF verification publishes directly", async () => {
  const p = (
    await as(
      B,
      `select public.prepare_pdf('${C}',null,'Trusted complete PDF','','notes',true,false) id`,
    )
  ).rows[0].id;
  await owner(`select public.finalize_pdf_checked('${p}','${B}')`);
  expect(
    (await as(null, `select status from resources where id='${p}'`)).rows[0]
      .status,
  ).toBe("published");
});
it("submitted PDF objects cannot be deleted or replaced by their author during review", async () => {
  const path = (
    await as(A, `select storage_path from resources where id='${P}'`)
  ).rows[0].storage_path;
  await as(
    A,
    `insert into storage.objects(bucket_id,name)values('course-pdfs','${path}')`,
  );
  await owner(`select public.finalize_pdf_checked('${P}','${A}')`);
  expect(
    (
      await as(
        A,
        `delete from storage.objects where name='${path}' returning id`,
      )
    ).rows,
  ).toEqual([]);
  await expect(
    as(
      A,
      `insert into storage.objects(bucket_id,name)values('course-pdfs','${path}')`,
    ),
  ).rejects.toThrow();
});
it("leaders rename/reorder/create assigned course topics and organize published metadata only", async () => {
  const t = (
    await as(
      L,
      `select public.add_material_topic('${C}','New course topic') id`,
    )
  ).rows[0].id;
  await as(L, `select public.organize_topic('${t}','Renamed topic',3)`);
  expect(
    (await as(null, `select title,sort_order from topics where id='${t}'`))
      .rows[0],
  ).toEqual({ title: "Renamed topic", sort_order: 3 });
  await expect(
    as(L, `select public.add_material_topic('${D}','Other scope topic')`),
  ).rejects.toThrow();
  await as(L, review());
  await as(
    L,
    `select public.edit_resource('${R}','Organized resource title','','${t}')`,
  );
});
it("leader cannot edit another author quiz keys, but can read submitted keys for review", async () => {
  expect(
    (await as(L, `select document from quiz_sets where resource_id='${Q}'`))
      .rows,
  ).toHaveLength(1);
  await expect(as(L, quiz(`'${Q}'`))).rejects.toThrow();
});
it("ordinary students retain votes, saves, following, questions and replies", async () => {
  const source = (await as(B, submit(C, "https://example.org/community")))
    .rows[0].id;
  for (const sql of [
    `select public.set_vote('${source}',1)`,
    `select public.toggle_save('${source}')`,
    `select public.follow_course('${C}')`,
  ])
    await as(A, sql);
  const d = (
    await as(
      A,
      `select public.ask_question('${C}','${source}','Community question','Can someone explain this source?') id`,
    )
  ).rows[0].id;
  await as(
    A,
    `select public.reply_question('${d}','An ordinary helpful reply')`,
  );
});
it("inactive courses and suspended authors cannot be approved", async () => {
  await owner(`update courses set is_active=false where id='${C}'`);
  await expect(as(M, review())).rejects.toThrow("course unavailable");
  await owner(
    `update courses set is_active=true where id='${C}';update account_states set status='suspended' where user_id='${A}'`,
  );
  await expect(as(L, review())).rejects.toThrow("author unavailable");
});
it("private parameterized helpers and service preview paths cannot be called by students", async () => {
  await expect(
    as(A, `select elzatona_private.course_leader('${L}','${C}')`),
  ).rejects.toThrow();
  await expect(
    as(L, `select public.review_pdf_path('${P}','${L}')`),
  ).rejects.toThrow();
});
it("public approved quiz export and grading stay unavailable before approval", async () => {
  await expect(
    as(
      null,
      `select public.grade_quiz('${Q}',1,'[{"id":"tf","answer":true}]')`,
    ),
  ).rejects.toThrow();
  expect(
    (await as(null, `select public.export_quiz('${Q}') x`)).rows[0].x,
  ).toBeNull();
  await as(L, review(Q, 2));
  expect(
    (
      await as(
        null,
        `select public.grade_quiz('${Q}',1,'[{"id":"tf","answer":true}]') x`,
      )
    ).rows[0].x[0].status,
  ).toBe("correct");
});
it("legacy moderator record is not an effective fifth role", async () => {
  await owner(
    `insert into public.user_roles(user_id,role)values('${A}','moderator')`,
  );
  expect((await as(A, "select public.is_moderator() x")).rows[0].x).toBe(false);
});
