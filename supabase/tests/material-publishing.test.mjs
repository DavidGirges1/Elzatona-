import { beforeAll, beforeEach, afterAll, it, expect } from "vitest";
import { database } from "../../scripts/database.mjs";
let db, C, D, R, P;
const A = "74000000-0000-4000-8000-000000000001",
  B = "74000000-0000-4000-8000-000000000002",
  O = "74000000-0000-4000-8000-000000000003",
  M = "74000000-0000-4000-8000-000000000004",
  I = "74000000-0000-4000-8000-000000000005";
const T = "74000000-0000-4000-8000-000000000011",
  X = "74000000-0000-4000-8000-000000000012";
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
const grant = (id, publish = true, organize = false) =>
  as(
    M,
    `select public.admin_set_material_permissions('${id}',${publish},${organize},'QA permission decision',true)`,
  );
const submit = () =>
  `select public.submit_resource('${C}',null,'New material title','','notes','https://example.org/new',true,false)`;
beforeAll(async () => {
  db = await database();
  for (const [id, name] of [
    [A, "author"],
    [B, "reader"],
    [O, "organizer"],
    [M, "manager"],
    [I, "incomplete"],
  ])
    await owner(
      `insert into auth.users(id,email,raw_user_meta_data) values('${id}','${name}@example.test','{"full_name":"Material QA ${name}","username":"material_${name}"}')`,
    );
  await owner(
    `select public.provision_admin('manager@example.test','material_manager');update public.student_academics set university_id=(select id from public.universities where slug='capital-university'),faculty_id=(select id from public.faculties where slug='computers'),academic_year=3,completed_at=now() where user_id in('${A}','${B}','${O}')`,
  );
  C = (await owner("select id from public.courses where slug='capital-cs-316'"))
    .rows[0]?.id;
  if (!C)
    C = (await owner("select id from public.courses where code='CS 316'"))
      .rows[0].id;
  D = (await owner("select id from public.courses where code='CS 111'")).rows[0]
    .id;
  await owner(
    `insert into public.topics(id,course_id,title) values('${T}','${C}','QA Topic'),('${X}','${D}','Other course topic')`,
  );
  R = (
    await owner(
      `insert into public.resources(course_id,author_id,title,type,source_kind,external_url,normalized_url,rights_confirmed,status) values('${C}','${A}','Original QA material','notes','external','https://example.org/original','https://example.org/original',true,'published') returning id`,
    )
  ).rows[0].id;
  P = (
    await owner(
      `insert into public.resources(course_id,author_id,title,type,source_kind,storage_path,rights_confirmed,status) values('${C}','${A}','Pending QA PDF','notes','pdf','${A}/pending.pdf',true,'pending') returning id`,
    )
  ).rows[0].id;
});
beforeEach(async () => {
  await owner(
    `update public.material_publishing_settings set open_to_all=false;delete from public.material_permissions;update public.account_states set status='active';update public.resources set status='pending',file_verified_at=null where id='${P}'`,
  );
});
afterAll(async () => await db?.close());
it("launch mode defaults closed without grandfathering existing students", async () =>
  expect((await as(B, "select public.material_access() a")).rows[0].a).toEqual({
    open_to_all: false,
    can_publish: false,
    can_organize: false,
  }));
it("guest cannot submit or grant permissions", async () => {
  await expect(as(null, submit())).rejects.toThrow();
  await expect(
    as(
      null,
      `select public.admin_set_material_permissions('${B}',true,true,'attack',true)`,
    ),
  ).rejects.toThrow();
});
it("unapproved student cannot publish links or prepare PDFs", async () => {
  await expect(as(B, submit())).rejects.toThrow(
    "material publishing restricted",
  );
  await expect(
    as(
      B,
      `select public.prepare_pdf('${C}',null,'PDF title','','notes',true,false)`,
    ),
  ).rejects.toThrow("material publishing restricted");
});
it("students cannot self-approve or change the global mode", async () => {
  await expect(grantByStudent()).rejects.toThrow("admin access required");
  await expect(
    as(B, "select public.admin_set_publishing_mode(true,'attack',true)"),
  ).rejects.toThrow();
});
function grantByStudent() {
  return as(
    B,
    `select public.admin_set_material_permissions('${B}',true,true,'attack',true)`,
  );
}
it("raw table writes are denied, including forged grant ownership", async () => {
  await expect(
    as(
      B,
      `insert into public.material_permissions(user_id,can_publish,updated_by) values('${B}',true,'${M}')`,
    ),
  ).rejects.toThrow();
  await expect(
    as(B, "update public.material_publishing_settings set open_to_all=true"),
  ).rejects.toThrow();
  await expect(
    as(
      B,
      `insert into public.resources(course_id,author_id,title,type,source_kind,external_url,normalized_url,rights_confirmed,status) values('${C}','${B}','Bypass material','notes','external','https://example.org/x','https://example.org/x',true,'published')`,
    ),
  ).rejects.toThrow();
});
it("user metadata cannot grant publishing or organization", async () => {
  await owner(
    `update auth.users set raw_user_meta_data='{"can_publish":true,"can_organize":true,"role":"admin"}' where id='${B}'`,
  );
  expect(
    (await as(B, "select public.material_access() a")).rows[0].a.can_publish,
  ).toBe(false);
});
it("approval requires an authenticated administrator, confirmation and reason", async () => {
  await expect(
    as(
      M,
      `select public.admin_set_material_permissions('${B}',true,false,'',true)`,
    ),
  ).rejects.toThrow();
  await expect(
    as(
      M,
      `select public.admin_set_material_permissions('${B}',true,false,'valid reason',false)`,
    ),
  ).rejects.toThrow();
  await grant(B);
  expect(
    (await as(B, "select public.material_access() a")).rows[0].a.can_publish,
  ).toBe(true);
});
it("approved publisher can publish and edit own materials but cannot edit others", async () => {
  await grant(A);
  await as(A, submit());
  await as(
    A,
    `select public.edit_resource('${R}','Allowed own change','',null)`,
  );
  await grant(B);
  await expect(
    as(B, `select public.edit_resource('${R}','Cross user attack','',null)`),
  ).rejects.toThrow("not authorized");
});
it("organization-only approval permits published metadata/topic changes without publishing or admin access", async () => {
  await grant(O, false, true);
  await as(
    O,
    `select public.edit_resource('${R}','Organized material','Organized description','${T}')`,
  );
  expect(
    (
      await as(
        null,
        `select topic_id,author_id from public.resources where id='${R}'`,
      )
    ).rows[0],
  ).toMatchObject({ topic_id: T, author_id: A });
  await expect(as(O, submit())).rejects.toThrow();
  await expect(as(O, "select public.admin_users()")).rejects.toThrow();
  await expect(
    as(O, `update public.resources set status='hidden' where id='${R}'`),
  ).rejects.toThrow();
});
it("organizer cannot cross courses or edit pending/hidden material", async () => {
  await grant(O, false, true);
  await expect(
    as(O, `select public.edit_resource('${R}','Wrong topic','', '${X}')`),
  ).rejects.toThrow();
  await expect(
    as(O, `select public.edit_resource('${P}','Pending attack','', null)`),
  ).rejects.toThrow();
});
it("revocation blocks edits and publication on the next request", async () => {
  await grant(A);
  await grant(A, false, false);
  await expect(as(A, submit())).rejects.toThrow();
  await expect(
    as(A, `select public.edit_resource('${R}','Revoked edit','', null)`),
  ).rejects.toThrow();
});
it("revocation prevents upload into an already prepared path", async () => {
  await grant(A);
  const id = (
    await as(
      A,
      `select public.prepare_pdf('${C}',null,'Prepared before revoke','','notes',true,false) id`,
    )
  ).rows[0].id;
  const path = (
    await as(A, `select storage_path from public.resources where id='${id}'`)
  ).rows[0].storage_path;
  await grant(A, false, false);
  await expect(
    as(
      A,
      `insert into storage.objects(bucket_id,name,metadata) values('course-pdfs','${path}','{"size":100,"mimetype":"application/pdf"}')`,
    ),
  ).rejects.toThrow();
});
it("service-side PDF finalization rechecks approval after bytes were uploaded", async () => {
  await grant(A);
  await grant(A, false, false);
  await expect(
    owner(`select public.finalize_pdf_checked('${P}','${A}')`),
  ).rejects.toThrow("material publishing restricted");
  expect(
    (await owner(`select status from public.resources where id='${P}'`)).rows[0]
      .status,
  ).toBe("pending");
});
it("approved PDF can pass the privileged boundary; students cannot call it directly", async () => {
  await grant(A);
  await expect(
    as(A, `select public.finalize_pdf_checked('${P}','${A}')`),
  ).rejects.toThrow();
  await owner(`select public.finalize_pdf_checked('${P}','${A}')`);
  expect(
    (await owner(`select status from public.resources where id='${P}'`)).rows[0]
      .status,
  ).toBe("published");
});
it("suspension and incomplete onboarding override approval", async () => {
  await grant(B);
  await owner(
    `update public.account_states set status='suspended' where user_id='${B}'`,
  );
  expect(
    (await as(B, "select public.material_access() a")).rows[0].a.can_publish,
  ).toBe(false);
  await grant(I);
  await expect(as(I, submit())).rejects.toThrow("complete academic onboarding");
});
it("unapproved students retain following, voting, saves and discussions", async () => {
  for (const sql of [
    `select public.follow_course('${C}')`,
    `select public.set_vote('${R}',1)`,
    `select public.toggle_save('${R}')`,
    `select public.ask_question('${C}','${R}','QA material question','A proper question about this material')`,
  ])
    await as(B, sql);
});
it("opening general publishing grants own submissions only; closing preserves explicit approvals", async () => {
  await grant(A);
  await as(
    M,
    "select public.admin_set_publishing_mode(true,'QA opening test',true)",
  );
  expect(
    (await as(B, "select public.material_access() a")).rows[0].a,
  ).toMatchObject({
    open_to_all: true,
    can_publish: true,
    can_organize: false,
  });
  await expect(
    as(B, `select public.edit_resource('${R}','Still not owner','',null)`),
  ).rejects.toThrow();
  await as(
    M,
    "select public.admin_set_publishing_mode(false,'QA closing test',true)",
  );
  expect(
    (await as(B, "select public.material_access() a")).rows[0].a.can_publish,
  ).toBe(false);
  expect(
    (await as(A, "select public.material_access() a")).rows[0].a.can_publish,
  ).toBe(true);
});
it("grants are private and every permission/mode/organization change is audited", async () => {
  await grant(A);
  expect(
    (await as(B, "select * from public.material_permissions")).rows,
  ).toHaveLength(0);
  expect(
    (await as(A, "select * from public.material_permissions")).rows,
  ).toHaveLength(1);
  await expect(
    as(null, "select * from public.material_permissions"),
  ).rejects.toThrow();
  expect(
    (
      await as(
        M,
        "select * from public.admin_audit_log where action='material.permissions_changed'",
      )
    ).rows.length,
  ).toBeGreaterThan(0);
  await expect(
    as(B, "select elzatona_private.material_publisher(auth.uid())"),
  ).rejects.toThrow();
});
it("administrator retains publication without a student grant", async () =>
  expect(
    (await as(M, "select public.material_access() a")).rows[0].a,
  ).toMatchObject({ can_publish: true, can_organize: true }));

it("only organizers can create course topics, with idempotent duplicate handling", async () => {
  await grant(A);
  await expect(
    as(A, `select public.add_material_topic('${C}','Forbidden topic')`),
  ).rejects.toThrow();
  await grant(O, false, true);
  const sql = `select public.add_material_topic('${C}','New organizer topic') id`;
  expect((await as(O, sql)).rows[0].id).toBe((await as(O, sql)).rows[0].id);
  await grant(O, false, false);
  await expect(
    as(O, `select public.add_material_topic('${C}','Revoked topic')`),
  ).rejects.toThrow();
});
