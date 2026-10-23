import { beforeAll, afterAll, it, expect } from "vitest";
import { database } from "../../scripts/database.mjs";
let db, U, V, F, G, C, R;
const A = "71000000-0000-4000-8000-000000000001",
  B = "71000000-0000-4000-8000-000000000002",
  M = "71000000-0000-4000-8000-000000000003",
  O = "71000000-0000-4000-8000-000000000004";
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
    `insert into auth.users(id,email,raw_user_meta_data) values('${A}','student-a@example.test','{"full_name":"Student Alpha","username":"student_alpha"}'),('${B}','student-b@example.test','{"full_name":"Student Beta","username":"student_beta"}'),('${M}','admin@example.test','{"full_name":"Site Owner","username":"owner_test"}'),('${O}','oauth@example.test','{"full_name":"OAuth Student"}');select public.provision_admin('admin@example.test','owner_test')`,
  );
  U = (
    await owner(
      "select id from public.universities where slug='capital-university'",
    )
  ).rows[0].id;
  V = (
    await owner(
      "select id from public.universities where slug='beni-suef-university'",
    )
  ).rows[0].id;
  F = (await owner("select id from public.faculties where slug='engineering'"))
    .rows[0].id;
  G = (await owner("select id from public.faculties where slug='computers'"))
    .rows[0].id;
  await owner(
    `insert into public.material_permissions(user_id,can_publish) values('${A}',true),('${B}',true)`,
  );
});
afterAll(async () => await db?.close());
it("seeds exactly the requested onboarding universities and configurable years", async () => {
  expect(
    (
      await as(
        null,
        "select name from public.universities where onboarding_enabled",
      )
    ).rows,
  ).toHaveLength(2);
  expect(
    (
      await as(
        null,
        `select max(year) y from public.academic_years where faculty_id='${F}'`,
      )
    ).rows[0].y,
  ).toBe(5);
});
it("signup trigger persists full name and canonical handle", async () =>
  expect(
    (await as(A, "select public.student_context() d")).rows[0].d,
  ).toMatchObject({
    username: "student_alpha",
    full_name: "Student Alpha",
    ready: false,
    username_claimed: true,
  }));
it("unique usernames enforced across auth records", async () =>
  await expect(
    owner(
      `insert into auth.users(id,raw_user_meta_data) values(gen_random_uuid(),'{"username":"student_alpha"}')`,
    ),
  ).rejects.toThrow());
it("username availability returns only a boolean", async () =>
  expect(
    (
      await as(
        null,
        "select public.username_available('student_alpha') taken,public.username_available('new_student') free",
      )
    ).rows[0],
  ).toEqual({ taken: false, free: true }));
it("incomplete onboarding blocks protected community RPCs", async () =>
  await expect(
    as(A, "select public.follow_course(gen_random_uuid())"),
  ).rejects.toThrow("complete academic onboarding"));
it("onboarding resumes after a persisted university step", async () => {
  await as(A, `select public.set_academic_context('${U}')`);
  expect(
    (await as(A, "select public.student_context() d")).rows[0].d,
  ).toMatchObject({ university_id: U, faculty_id: null, ready: false });
});
it("invalid university-faculty combinations rejected", async () => {
  const x = await owner(
    "insert into public.faculties(slug,name,name_ar) values('not-linked','Unlinked','غير مرتبطة') returning id",
  );
  await expect(
    as(A, `select public.set_academic_context('${U}','${x.rows[0].id}',1)`),
  ).rejects.toThrow("faculty unavailable");
});
it("unconfigured sixth engineering year rejected", async () =>
  await expect(
    as(A, `select public.set_academic_context('${U}','${F}',6)`),
  ).rejects.toThrow("year unavailable"));
it("complete context persists and enables protected actions", async () => {
  await as(A, `select public.set_academic_context('${U}','${F}',2)`);
  await as(B, `select public.set_academic_context('${V}','${G}',1)`);
  expect(
    (await as(A, "select public.student_context() d")).rows[0].d,
  ).toMatchObject({
    university_id: U,
    faculty_id: F,
    academic_year: 2,
    ready: true,
  });
});
it("student cannot write academic rows directly or read peers selections", async () => {
  expect(
    (await as(A, `select * from public.student_academics where user_id='${B}'`))
      .rows,
  ).toEqual([]);
  await expect(
    as(A, `update public.student_academics set academic_year=1`),
  ).rejects.toThrow();
});
it("OAuth-generated handles must be claimed before completing onboarding", async () => {
  await expect(
    as(O, `select public.set_academic_context('${U}','${F}',1)`),
  ).rejects.toThrow("choose username");
  await as(O, "select public.claim_username('oauth_student')");
  await as(O, `select public.set_academic_context('${U}','${F}',1)`);
  expect(
    (await as(O, "select public.academic_ready() ready")).rows[0].ready,
  ).toBe(true);
});
it("chosen username cannot be repeatedly changed to impersonate others", async () =>
  await expect(
    as(A, "select public.claim_username('different_name')"),
  ).rejects.toThrow());
it.each([null, A, B])(
  "nonadmin cannot inspect private admin metrics or users (%s)",
  async (id) => {
    await expect(as(id, "select public.admin_overview()")).rejects.toThrow();
    await expect(as(id, "select public.admin_users()")).rejects.toThrow();
  },
);
it("user metadata cannot grant admin access", async () => {
  await owner(
    `update auth.users set raw_user_meta_data='{"role":"admin"}' where id='${A}'`,
  );
  expect((await as(A, "select public.is_admin() admin")).rows[0].admin).toBe(
    false,
  );
});
it("private provisioning and login identity are not browser-executable", async () => {
  await expect(
    as(A, "select public.provision_admin('student-a@example.test','hacker')"),
  ).rejects.toThrow();
  await expect(
    as(null, "select public.admin_login_identity('owner_test',repeat('x',64))"),
  ).rejects.toThrow();
});
it("admin creates a real course with normalized academic context", async () => {
  C = (
    await as(
      M,
      `select public.admin_save_course(null,'${U}','${F}',2,1,'qa-engineering','ENG2','Test Engineering','مادة هندسة تجريبية','اختبار',true) id`,
    )
  ).rows[0].id;
  expect(
    (
      await as(
        A,
        `select * from public.courses where university_id='${U}' and faculty_id='${F}' and year_level=2`,
      )
    ).rows.map((c) => c.id),
  ).toEqual([C]);
  expect(
    (
      await as(
        B,
        `select * from public.courses where university_id='${V}' and faculty_id='${G}' and year_level=1`,
      )
    ).rows,
  ).toEqual([]);
});
it("admin cannot assign a course to an invalid academic year", async () =>
  await expect(
    as(
      M,
      `select public.admin_save_course(null,'${U}','${F}',9,1,'bad-year','BAD','Invalid course','مادة غير صالحة','',true)`,
    ),
  ).rejects.toThrow());
it("student cannot create universities through admin RPC", async () =>
  await expect(
    as(
      A,
      "select public.admin_save_university(null,'hack','Hack','جامعة مخترقة','',true,true)",
    ),
  ).rejects.toThrow());
it("admin can add academic options without UI hardcoding and audit is written", async () => {
  const id = (
    await as(
      M,
      "select public.admin_save_university(null,'qa-new-university','New University','جامعة جديدة','اختبار',true,true) id",
    )
  ).rows[0].id;
  await as(
    M,
    `select public.admin_save_faculty(null,'${id}','qa-faculty','Test Faculty','كلية جديدة',array[1,2,3,4,5,6,7],true)`,
  );
  expect(
    (
      await as(
        null,
        `select year from public.academic_years where university_id='${id}' order by year`,
      )
    ).rows,
  ).toHaveLength(7);
  expect(
    (
      await as(
        M,
        "select * from public.admin_audit_log where action='university.saved'",
      )
    ).rows,
  ).toHaveLength(1);
});
it("student emails only available to verified admins", async () => {
  const d = (await as(M, "select public.admin_users('student-a') d")).rows[0].d;
  expect(d.total).toBe(1);
  expect(d.users[0].email).toBe("student-a@example.test");
  await expect(as(A, "select email from auth.users")).rejects.toThrow();
});
it("admin users pagination bounded at the database boundary", async () =>
  await expect(
    as(M, "select public.admin_users('',null,null,null,0)"),
  ).rejects.toThrow());
it("analytics events are deduplicated and raw telemetry private", async () => {
  await as(
    null,
    "select public.track_page_view('91000000-0000-4000-8000-000000000001','landing','92000000-0000-4000-8000-000000000001')",
  );
  await as(
    null,
    "select public.track_page_view('91000000-0000-4000-8000-000000000001','landing','92000000-0000-4000-8000-000000000001')",
  );
  await as(
    A,
    "select public.track_page_view('91000000-0000-4000-8000-000000000002','dashboard','92000000-0000-4000-8000-000000000002')",
  );
  expect((await as(A, "select * from public.analytics_events")).rows).toEqual(
    [],
  );
  const metrics = (await as(M, "select public.admin_overview() d")).rows[0].d;
  expect(metrics).toMatchObject({ dau: 1, mau: 1, page_views: 2, students: 3 });
  expect(metrics.growth).toHaveLength(30);
});
it("null confirmation cannot bypass sensitive account operations", async () =>
  await expect(
    as(
      M,
      `select public.admin_set_account_status('${A}','suspended','reason',null)`,
    ),
  ).rejects.toThrow());
it("suspension blocks already-authenticated student mutations immediately", async () => {
  await as(
    M,
    `select public.admin_set_account_status('${A}','suspended','اختبار صلاحيات الحساب',true)`,
  );
  expect(
    (await as(A, "select public.account_active() active")).rows[0].active,
  ).toBe(false);
  await expect(as(A, `select public.follow_course('${C}')`)).rejects.toThrow(
    "active account required",
  );
});
it("reactivation restores existing session permission after server check", async () => {
  await as(
    M,
    `select public.admin_set_account_status('${A}','active','إعادة تفعيل الاختبار',true)`,
  );
  await as(A, `select public.follow_course('${C}')`);
  expect((await as(A, "select * from public.user_courses")).rows).toHaveLength(
    1,
  );
});
it("admin cannot suspend own administrator account", async () =>
  await expect(
    as(
      M,
      `select public.admin_set_account_status('${M}','suspended','reason',true)`,
    ),
  ).rejects.toThrow());
it("resource moderation hides content and records a private audit entry", async () => {
  R = (
    await as(
      A,
      `select public.submit_resource('${C}',null,'مصدر اختبار الإدارة','','notes','https://example.org/admin-qa',true,false) id`,
    )
  ).rows[0].id;
  await as(
    M,
    `select public.admin_manage_resource('${R}','مصدر تمت مراجعته','hidden','اختبار الإخفاء',true)`,
  );
  expect(
    (await as(null, `select * from public.resources where id='${R}'`)).rows,
  ).toHaveLength(0);
  expect(
    (
      await as(
        M,
        "select * from public.admin_audit_log where action='resource.hidden'",
      )
    ).rows,
  ).toHaveLength(1);
  expect((await as(A, "select * from public.admin_audit_log")).rows).toEqual(
    [],
  );
});
it("unverified PDF cannot be published by admin bypass", async () => {
  const p = (
    await as(
      A,
      `select public.prepare_pdf('${C}',null,'ملف لسه اترفَعش','','notes',true,false) id`,
    )
  ).rows[0].id;
  await expect(
    as(
      M,
      `select public.admin_manage_resource('${p}','ملف بدون فحص','published','اختبار منع التجاوز',true)`,
    ),
  ).rejects.toThrow("file verification");
});
it("changing academic context preserves explicitly selected courses", async () => {
  const before = (
    await as(A, "select course_id from public.user_courses order by course_id")
  ).rows;
  expect(before.length).toBeGreaterThan(0);
  await as(A, `select public.set_academic_context('${V}','${G}',1)`);
  expect(
    (
      await as(
        A,
        "select course_id from public.user_courses order by course_id",
      )
    ).rows,
  ).toEqual(before);
});
it("inactive academic configuration invalidates context readiness", async () => {
  await owner(
    `update public.university_faculties set is_active=false where university_id='${V}' and faculty_id='${G}'`,
  );
  expect(
    (await as(A, "select public.academic_ready() ready")).rows[0].ready,
  ).toBe(false);
  await expect(as(A, `select public.follow_course('${C}')`)).rejects.toThrow(
    "complete academic onboarding",
  );
});
it("service-side PDF finalization rechecks current academic eligibility", async () => {
  await owner(
    `update public.university_faculties set is_active=true where university_id='${V}' and faculty_id='${G}'`,
  );
  const pdf = (
    await as(
      A,
      `select public.prepare_pdf('${C}',null,'ملف اختبار الحالة الأكاديمية','','notes',true,false) id`,
    )
  ).rows[0].id;
  await owner(
    `update public.university_faculties set is_active=false where university_id='${V}' and faculty_id='${G}'`,
  );
  await expect(
    owner(`select public.finalize_pdf_checked('${pdf}','${A}')`),
  ).rejects.toThrow("active onboarded author required");
});
it("unverified admin role does not grant console access", async () => {
  await owner(`update auth.users set email_confirmed_at=null where id='${M}'`);
  expect((await as(M, "select public.is_admin() admin")).rows[0].admin).toBe(
    false,
  );
  await expect(as(M, "select public.admin_users()")).rejects.toThrow();
});
