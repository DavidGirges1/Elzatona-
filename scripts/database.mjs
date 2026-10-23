import { PGlite } from "@electric-sql/pglite";
import { readdir, readFile, writeFile } from "node:fs/promises";
export async function database() {
  const db = new PGlite();
  await db.exec(`create role service_role nologin bypassrls;grant usage on schema public to service_role;create role anon nologin;create role authenticated nologin;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',created_at timestamptz default now(),email_confirmed_at timestamptz default now());
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public,storage to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb,unique(bucket_id,name));alter table storage.objects enable row level security;grant select,insert,delete on storage.objects to authenticated;
 `);
  for (const file of (await readdir("supabase/migrations")).sort())
    await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
  return db;
}
export async function generateTypes(db) {
  const { rows: columns } = await db.query(
    `select c.table_name,c.column_name,c.data_type,c.udt_name,c.is_nullable,c.column_default,c.is_generated,c.is_identity,t.table_type from information_schema.columns c join information_schema.tables t using(table_schema,table_name) where c.table_schema='public' order by c.table_name,c.ordinal_position`,
  );
  const types = {
    uuid: "string",
    text: "string",
    timestamptz: "string",
    bool: "boolean",
    int2: "number",
    int4: "number",
    int8: "number",
    jsonb: "Json",
  };
  const tsType = (t) => types[t] || "unknown";
  let tables = "",
    views = "";
  for (const name of [...new Set(columns.map((c) => c.table_name))]) {
    const cs = columns.filter((c) => c.table_name === name);
    const view = cs[0].table_type === "VIEW";
    // PostgreSQL cannot infer view non-nullability; application views are inner joins of required IDs.
    const fields = cs
      .map(
        (c) =>
          `      ${c.column_name}: ${tsType(c.udt_name)}${c.is_nullable === "YES" && (!view || ["description", "external_url", "topic_id", "topic_title"].includes(c.column_name)) ? " | null" : ""};`,
      )
      .join("\n");
    const insert = cs
      .map(
        (c) =>
          `      ${c.column_name}${c.column_default !== null || c.is_nullable === "YES" || c.is_generated === "ALWAYS" || c.is_identity === "YES" ? "?" : ""}: ${tsType(c.udt_name)}${c.is_nullable === "YES" ? " | null" : ""};`,
      )
      .join("\n");
    const value = `    ${name}: { Row: {\n${fields}\n    }; ${view ? "" : `Insert: {\n${insert}\n    }; Update: Partial<Database['public']['Tables']['${name}']['Insert']>;`} Relationships: [] };\n`;
    if (view) views += value;
    else tables += value;
  }
  const { rows: funcs } = await db.query(
    `select p.proname,p.proargnames,p.proargtypes::oid[] as argtypes,p.prorettype::regtype::text as rettype,p.pronargdefaults from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f'`,
  );
  const oidMap = {
    16: "boolean",
    20: "number",
    21: "number",
    23: "number",
    25: "string",
    2950: "string",
    1007: "number[]",
    3802: "Json",
  };
  const functions = funcs
    .filter(
      (f) =>
        ![
          "create_profile",
          "require_actor",
          "published_pdf_path",
          "vote_count_delta",
        ].includes(f.proname),
    )
    .map((f) => {
      const args = f.proargnames || [];
      const argsText = args
        .map(
          (n, i) =>
            `${n}${i >= args.length - f.pronargdefaults ? "?" : ""}: ${oidMap[f.argtypes[i]] || "unknown"}${["p_topic", "p_resource", "p_id", "p_faculty", "p_university", "p_year", "p_semester"].includes(n) ? " | null" : ""}`,
        )
        .join("; ");
      const ret =
        {
          uuid: "string",
          boolean: "boolean",
          text: "string",
          void: "undefined",
          jsonb: "Json",
        }[f.rettype] || "unknown";
      return `    ${f.proname}: { Args: ${argsText ? `{${argsText}}` : "Record<string, never>"}; Returns: ${ret} };`;
    })
    .join("\n");
  await writeFile(
    "src/lib/supabase/database.types.ts",
    `// Generated from applied migrations by npm run db:types. Do not edit.\nexport type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];\nexport type Database={public:{Tables:{\n${tables}},Views:{\n${views}},Functions:{\n${functions}\n},Enums:Record<string,never>,CompositeTypes:Record<string,never>}};\n`,
  );
}
if (process.argv[2] === "types") {
  const db = await database();
  await generateTypes(db);
  await db.close();
  console.log("Generated types from migrated embedded PostgreSQL schema.");
}
