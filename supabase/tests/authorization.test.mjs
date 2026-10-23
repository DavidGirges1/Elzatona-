import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { database } from "../../scripts/database.mjs";
let db;
const A = "10000000-0000-4000-8000-000000000001",
  B = "10000000-0000-4000-8000-000000000002",
  M = "10000000-0000-4000-8000-000000000003";
const C = "20000000-0000-4000-8000-000000000001",
  D = "20000000-0000-4000-8000-000000000002",
  T = "30000000-0000-4000-8000-000000000001";
let R;
async function as(user, sql) {
  await db.exec(
    `reset role;select set_config('request.jwt.claim.sub','${user || ""}',false);set role ${user ? "authenticated" : "anon"}`,
  );
  return db.query(sql);
}
async function admin(sql) {
  await db.exec("reset role");
  return db.query(sql);
}
beforeAll(async () => {
  db = await database();
  await db.exec(
    `insert into auth.users(id) values('${A}'),('${B}'),('${M}');insert into public.universities(id,slug,name) values('${C}','demo','جامعة تجريبية');insert into public.courses(id,university_id,slug,code,title,department) values('${C}','${C}','ds','CS1','هياكل البيانات','تجريبي'),('${D}','${C}','db','CS2','قواعد البيانات','تجريبي');insert into public.topics(id,course_id,title) values('${T}','${D}','SQL');insert into public.user_roles(user_id,role) values('${M}','moderator');`,
  );
  const x = await as(
    A,
    `select public.submit_resource('${C}',null,'شرح Trees','شرح تجريبي','notes','https://example.org/trees',true,false) as id`,
  );
  R = x.rows[0].id;
});
afterAll(async () => await db?.close());
describe("actual PostgreSQL grants, RPCs and RLS (embedded auth/storage schemas)", () => {
  it("every public table has RLS", async () => {
    const x = await admin(
      `select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity`,
    );
    expect(x.rows).toEqual([]);
  });
  it("anonymous can read exact published resource", async () => {
    const x = await as(
      null,
      `select * from public.resource_cards where id='${R}'`,
    );
    expect(x.rows[0].title).toBe("شرح Trees");
  });
  it("anonymous cannot submit", async () =>
    await expect(
      as(
        null,
        `select public.submit_resource('${C}',null,'new title','','notes','https://example.org/new',true,false)`,
      ),
    ).rejects.toThrow());
  it("student cannot insert role", async () =>
    await expect(
      as(
        A,
        `insert into public.user_roles(user_id,role) values('${A}','admin')`,
      ),
    ).rejects.toThrow());
  it("student cannot inspect roles", async () =>
    await expect(as(A, "select * from public.user_roles")).rejects.toThrow());
  it("user metadata cannot grant moderator", async () => {
    await admin(
      `update auth.users set raw_user_meta_data='{"role":"admin"}' where id='${A}'`,
    );
    expect((await as(A, "select public.is_moderator() as m")).rows[0].m).toBe(
      false,
    );
  });
  it("other student cannot edit source", async () =>
    await expect(
      as(B, `select public.edit_resource('${R}','hacked title','',null)`),
    ).rejects.toThrow());
  it("author can edit allowed metadata", async () => {
    await as(
      A,
      `select public.edit_resource('${R}','شرح Trees','وصف جديد',null)`,
    );
    expect(
      (
        await as(
          null,
          `select description from public.resources where id='${R}'`,
        )
      ).rows[0].description,
    ).toBe("وصف جديد");
  });
  it.each([
    "author_id",
    "status",
    "storage_path",
    "upvotes_count",
    "course_id",
  ])("direct mutation of %s denied", async (column) => {
    await expect(
      as(A, `update public.resources set ${column}=${column} where id='${R}'`),
    ).rejects.toThrow();
  });
  it("cross-course topic denied", async () =>
    await expect(
      as(
        A,
        `select public.submit_resource('${C}','${T}','cross topic','','notes','https://example.org/cross',true,false)`,
      ),
    ).rejects.toThrow());
  it("unsafe URL denied in direct RPC", async () =>
    await expect(
      as(
        A,
        `select public.submit_resource('${C}',null,'unsafe URL','','notes','https://127.0.0.1/x',true,false)`,
      ),
    ).rejects.toThrow());
  it("duplicate returns existing record", async () =>
    expect(
      (
        await as(
          B,
          `select public.submit_resource('${C}',null,'same URL','','notes','https://example.org/trees',true,false) as id`,
        )
      ).rows[0].id,
    ).toBe(R));
  it("permission is required", async () =>
    await expect(
      as(
        B,
        `select public.submit_resource('${C}',null,'no permission','','notes','https://example.org/rights',false,false)`,
      ),
    ).rejects.toThrow());
  it("author cannot vote on own source", async () =>
    await expect(as(A, `select public.set_vote('${R}',1)`)).rejects.toThrow());
  it("vote insert, switch and toggle maintain totals", async () => {
    await as(B, `select public.set_vote('${R}',1)`);
    expect(
      (await as(null, `select score from public.resources where id='${R}'`))
        .rows[0].score,
    ).toBe(1);
    await as(B, `select public.set_vote('${R}',-1)`);
    expect(
      (await as(null, `select score from public.resources where id='${R}'`))
        .rows[0].score,
    ).toBe(-1);
    await as(B, `select public.set_vote('${R}',-1)`);
    expect(
      (await as(null, `select score from public.resources where id='${R}'`))
        .rows[0].score,
    ).toBe(0);
  });
  it("invalid vote denied", async () =>
    await expect(as(B, `select public.set_vote('${R}',2)`)).rejects.toThrow());
  it("follows are private and toggle", async () => {
    await as(A, `select public.follow_course('${C}')`);
    expect((await as(B, "select * from public.user_courses")).rows).toEqual([]);
    expect(
      (await as(A, "select * from public.user_courses")).rows,
    ).toHaveLength(1);
    await as(A, `select public.follow_course('${C}')`);
    expect((await as(A, "select * from public.user_courses")).rows).toEqual([]);
  });
  it("saves are private and toggle", async () => {
    await as(A, `select public.toggle_save('${R}')`);
    expect((await as(B, "select * from public.resource_saves")).rows).toEqual(
      [],
    );
    expect(
      (await as(A, "select * from public.resource_saves")).rows,
    ).toHaveLength(1);
  });
  it("students cannot call throttle directly", async () =>
    await expect(
      as(A, "select public.require_actor('fake',9999)"),
    ).rejects.toThrow());
  it("student cannot curate", async () =>
    await expect(
      as(A, `select public.set_highlight('${C}','${R}',1,'useful')`),
    ).rejects.toThrow());
  it("moderator cannot cross-link course or exceed 3 positions", async () => {
    await expect(
      as(M, `select public.set_highlight('${D}','${R}',1,'useful')`),
    ).rejects.toThrow();
    await expect(
      as(M, `select public.set_highlight('${C}','${R}',4,'useful')`),
    ).rejects.toThrow();
  });
  it("moderator can curate with audit", async () => {
    await as(M, `select public.set_highlight('${C}','${R}',1,'useful')`);
    expect(
      (await as(null, "select * from public.course_highlights")).rows,
    ).toHaveLength(1);
    expect(
      (await as(M, "select * from public.moderation_actions")).rows,
    ).toHaveLength(1);
  });
  it("course discussion rejects cross-course resource", async () =>
    await expect(
      as(
        A,
        `select public.ask_question('${D}','${R}','question title','question body')`,
      ),
    ).rejects.toThrow());
  it("students can ask and another can reply", async () => {
    const x = await as(
      A,
      `select public.ask_question('${C}','${R}','سؤال عن Trees','ممكن شرح الجزئية دي؟') as id`,
    );
    const d = x.rows[0].id;
    await as(B, `select public.reply_question('${d}','ده شرح مبسط')`);
    expect(
      (
        await as(
          null,
          `select * from public.discussion_replies where discussion_id='${d}'`,
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("PDF starts pending and cannot finalize missing file", async () => {
    const x = await as(
      A,
      `select public.prepare_pdf('${C}',null,'ملف تجريبي','','notes',true,false) as id`,
    );
    const id = x.rows[0].id;
    expect(
      (await as(null, `select * from public.resources where id='${id}'`)).rows,
    ).toHaveLength(0);
    await expect(
      as(B, `select public.finalize_pdf('${id}')`),
    ).rejects.toThrow();
    await expect(
      as(A, `select public.finalize_pdf('${id}')`),
    ).rejects.toThrow();
    await expect(
      as(
        B,
        `insert into storage.objects(bucket_id,name,metadata) values('course-pdfs','${A}/${id}.pdf','{"size":100,"mimetype":"application/pdf"}')`,
      ),
    ).rejects.toThrow();
    await as(
      A,
      `insert into storage.objects(bucket_id,name,metadata) values('course-pdfs','${A}/${id}.pdf','{"size":100,"mimetype":"application/pdf"}')`,
    );
    await expect(
      as(A, `select public.finalize_pdf('${id}')`),
    ).rejects.toThrow();
    await admin(`select public.finalize_pdf_checked('${id}','${A}')`);
    expect(
      (await as(null, `select * from public.resources where id='${id}'`)).rows,
    ).toHaveLength(1);
  });
  it("reports private, duplicate safe, student cannot moderate", async () => {
    await as(
      B,
      `select public.report_content('resource','${R}','copyright','please review')`,
    );
    await as(
      B,
      `select public.report_content('resource','${R}','copyright','please review')`,
    );
    expect((await as(A, "select * from public.reports")).rows).toEqual([]);
    const reports = await as(M, "select * from public.reports");
    expect(reports.rows).toHaveLength(1);
    await expect(
      as(
        A,
        `select public.moderate_report('${reports.rows[0].id}','hide','copyright violation')`,
      ),
    ).rejects.toThrow();
  });
  it("hide removes public resource and highlight, stops voting and linked discussion reads", async () => {
    const reports = await as(M, "select * from public.reports");
    await as(
      M,
      `select public.moderate_report('${reports.rows[0].id}','hide','copyright violation')`,
    );
    expect(
      (await as(null, `select * from public.resources where id='${R}'`)).rows,
    ).toHaveLength(0);
    expect(
      (await as(null, "select * from public.course_highlights")).rows,
    ).toHaveLength(0);
    expect(
      (
        await as(
          null,
          `select * from public.discussions where resource_id='${R}'`,
        )
      ).rows,
    ).toHaveLength(0);
    await expect(as(B, `select public.set_vote('${R}',1)`)).rejects.toThrow();
  });

  it("cascade account deletion updates resource vote totals", async () => {
    const u = "10000000-0000-4000-8000-000000000009";
    await admin(`insert into auth.users(id) values('${u}')`);
    const x = await as(
      A,
      `select public.submit_resource('${C}',null,'account delete vote','','notes','https://example.org/delete-vote',true,false) as id`,
    );
    const id = x.rows[0].id;
    await as(u, `select public.set_vote('${id}',1)`);
    expect(
      (await as(null, `select score from public.resources where id='${id}'`))
        .rows[0].score,
    ).toBe(1);
    await admin(`delete from auth.users where id='${u}'`);
    expect(
      (await as(null, `select score from public.resources where id='${id}'`))
        .rows[0].score,
    ).toBe(0);
  });
  it("one-character OAuth name gets safe profile fallback", async () => {
    const id = "10000000-0000-4000-8000-000000000008";
    await admin(
      `insert into auth.users(id,raw_user_meta_data) values('${id}','{"full_name":"x"}')`,
    );
    expect(
      (
        await as(
          null,
          `select display_name from public.profiles where id='${id}'`,
        )
      ).rows[0].display_name,
    ).toBe("طالب جديد");
  });
  it("oversized PDF metadata cannot be finalized", async () => {
    const x = await as(
      A,
      `select public.prepare_pdf('${C}',null,'oversized PDF','','notes',true,false) as id`,
    );
    const id = x.rows[0].id;
    await as(
      A,
      `insert into storage.objects(bucket_id,name,metadata) values('course-pdfs','${A}/${id}.pdf','{"size":4000000,"mimetype":"application/pdf"}')`,
    );
    await expect(
      as(A, `select public.finalize_pdf('${id}')`),
    ).rejects.toThrow();
  });
  it("profile changes cannot affect another student", async () => {
    await as(A, "select public.update_profile('طالب أ')");
    expect(
      (
        await as(
          null,
          `select display_name from public.profiles where id='${B}'`,
        )
      ).rows[0].display_name,
    ).toBe("طالب جديد");
    await expect(
      as(A, `update public.profiles set display_name='hacked' where id='${B}'`),
    ).rejects.toThrow();
  });

  it("students cannot execute server-verified PDF finalization", async () => {
    await expect(
      as(A, `select public.finalize_pdf_checked('${R}','${A}')`),
    ).rejects.toThrow();
    await expect(
      as(null, `select public.finalize_pdf_checked('${R}','${A}')`),
    ).rejects.toThrow();
  });
  it("rate limit enforced transactionally", async () => {
    for (let i = 0; i < 10; i++)
      await as(B, "select public.update_profile('طالب ب')");
    await expect(
      as(B, "select public.update_profile('طالب ب')"),
    ).rejects.toThrow("rate limit");
  });
});
