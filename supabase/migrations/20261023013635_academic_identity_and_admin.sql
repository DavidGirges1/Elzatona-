-- Additive identity, academic context, administration and first-party analytics.
-- Existing catalog/resource records are retained; no course attribution is invented.
alter table public.universities add column description text not null default '' check(length(description)<=2000), add column is_active boolean not null default true, add column onboarding_enabled boolean not null default false;
alter table public.universities alter column onboarding_enabled set default true;
create table public.faculties(id uuid primary key default gen_random_uuid(),slug text unique not null check(slug ~ '^[a-z0-9-]+$'),name text not null check(length(name) between 2 and 120),name_ar text not null check(length(name_ar) between 2 and 120),is_active boolean not null default true);
create table public.university_faculties(university_id uuid not null references public.universities,faculty_id uuid not null references public.faculties,is_active boolean not null default true,primary key(university_id,faculty_id));
create table public.academic_years(university_id uuid not null,faculty_id uuid not null,year smallint not null check(year between 1 and 12),primary key(university_id,faculty_id,year),foreign key(university_id,faculty_id) references public.university_faculties);
create table public.student_academics(user_id uuid primary key references public.profiles on delete cascade,university_id uuid references public.universities,faculty_id uuid,academic_year smallint,completed_at timestamptz,updated_at timestamptz not null default now(),foreign key(university_id,faculty_id) references public.university_faculties,foreign key(university_id,faculty_id,academic_year) references public.academic_years,check(completed_at is null or (university_id is not null and faculty_id is not null and academic_year is not null)));
create index student_academic_context on public.student_academics(university_id,faculty_id,academic_year);
create table public.account_states(user_id uuid primary key references public.profiles on delete cascade,status text not null default 'active' check(status in ('active','suspended')),reason text not null default '' check(length(reason)<=1000),updated_at timestamptz not null default now());
alter table public.profiles add column full_name text, add column username text, add column username_claimed boolean not null default false;
update public.profiles set full_name=display_name,username='student_'||replace(id::text,'-','');
alter table public.profiles alter column full_name set not null, alter column username set not null;
alter table public.profiles add constraint profile_full_name_length check(length(full_name) between 2 and 80),add constraint profile_username_format check(username ~ '^[a-z][a-z0-9_]{2,39}$');
create unique index profiles_username_unique on public.profiles(username);
insert into public.student_academics(user_id) select id from public.profiles;
insert into public.account_states(user_id) select id from public.profiles;
alter table public.courses add column faculty_id uuid references public.faculties,add column semester smallint check(semester between 1 and 3),add constraint course_faculty_context foreign key(university_id,faculty_id) references public.university_faculties,add constraint course_year_context foreign key(university_id,faculty_id,year_level) references public.academic_years;
create index courses_academic_context on public.courses(university_id,faculty_id,year_level,is_active);
create table public.admin_audit_log(id bigint generated always as identity primary key,actor_id uuid references auth.users on delete set null,action text not null,target_id uuid,details jsonb not null default '{}',created_at timestamptz not null default now());
create index admin_audit_date on public.admin_audit_log(created_at desc);
create table public.analytics_events(id uuid primary key,user_id uuid references auth.users on delete set null,visitor_id uuid not null,page text not null check(page in('landing','dashboard','courses','course','resource','contribute','onboarding','profile','other')),created_at timestamptz not null default now());
create index analytics_date_user on public.analytics_events(created_at,user_id);
create table public.request_budgets(key text not null,bucket timestamptz not null,count integer not null,primary key(key,bucket));
do $$declare t text;begin foreach t in array array['faculties','university_faculties','academic_years','student_academics','account_states','admin_audit_log','analytics_events','request_budgets'] loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon,authenticated',t);end loop;end;$$;

create function public.account_active() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.account_states where user_id=auth.uid() and status='active')$$;
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$select public.account_active() and exists(select 1 from public.user_roles r join auth.users u on u.id=r.user_id where r.user_id=auth.uid() and r.role='admin' and u.email_confirmed_at is not null)$$;
create or replace function public.is_moderator() returns boolean language sql stable security definer set search_path='' as $$select public.account_active() and exists(select 1 from public.user_roles where user_id=auth.uid() and role in('admin','moderator'))$$;
create function public.academic_ready() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.student_academics s join public.profiles p on p.id=s.user_id join public.universities u on u.id=s.university_id join public.university_faculties uf on uf.university_id=s.university_id and uf.faculty_id=s.faculty_id join public.faculties f on f.id=s.faculty_id join public.academic_years y on y.university_id=s.university_id and y.faculty_id=s.faculty_id and y.year=s.academic_year where s.user_id=auth.uid() and s.completed_at is not null and p.username_claimed and u.is_active and u.onboarding_enabled and f.is_active and uf.is_active)$$;
create function public.can_contribute() returns boolean language sql stable security definer set search_path='' as $$select public.account_active() and (public.academic_ready() or public.is_admin())$$;
create function public.assert_admin() returns uuid language plpgsql security definer set search_path='' as $$begin if not public.is_admin() then raise exception 'admin access required' using errcode='42501';end if;return auth.uid();end;$$;
create or replace function public.require_actor(p_action text,p_limit integer default 30) returns uuid language plpgsql security definer set search_path='' as $$declare actor uuid:=auth.uid();n integer;begin
 if actor is null or not public.account_active() then raise exception 'active account required' using errcode='42501';end if;
 if p_action not in('profile','onboarding') and not public.can_contribute() then raise exception 'complete academic onboarding' using errcode='42501';end if;
 insert into public.mutation_limits values(actor,p_action,date_trunc('hour',now()),1) on conflict(user_id,action,bucket) do update set count=public.mutation_limits.count+1 returning count into n;
 if n>p_limit then raise exception 'rate limit exceeded' using errcode='P0001';end if;return actor;end;$$;

create or replace function public.create_profile() returns trigger language plpgsql security definer set search_path='' as $$declare n text;handle text;claimed boolean:=false;begin
 n:=left(trim(coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name','')),80);if length(n)<2 then n:='طالب جديد';end if;
 handle:=lower(trim(coalesce(new.raw_user_meta_data->>'username','')));
 if handle<>'' then if handle !~ '^[a-z][a-z0-9_]{2,29}$' or handle in('admin','administrator','support','system','elzatona') then raise exception 'invalid username';end if;claimed:=true;else handle:='student_'||replace(new.id::text,'-','');end if;
 insert into public.profiles(id,display_name,full_name,username,username_claimed) values(new.id,n,n,handle,claimed);
 insert into public.account_states(user_id) values(new.id);insert into public.student_academics(user_id) values(new.id);return new;end;$$;
create function public.username_available(p_username text) returns boolean language sql stable security definer set search_path='' as $$select lower(p_username) ~ '^[a-z][a-z0-9_]{2,29}$' and lower(p_username) not in('admin','administrator','support','system','elzatona') and not exists(select 1 from public.profiles where username=lower(p_username))$$;
create function public.claim_username(p_username text) returns void language plpgsql security definer set search_path='' as $$declare actor uuid:=public.require_actor('onboarding',40);begin
 if not public.username_available(p_username) then raise exception 'username unavailable';end if;
 if exists(select 1 from public.profiles where id=actor and username_claimed) then raise exception 'username already chosen';end if;
 update public.profiles set username=lower(p_username),username_claimed=true where id=actor;end;$$;
create function public.student_context() returns jsonb language sql stable security definer set search_path='' as $$select coalesce((select jsonb_build_object('university_id',s.university_id,'faculty_id',s.faculty_id,'academic_year',s.academic_year,'completed_at',s.completed_at,'university',u.name_ar,'faculty',f.name_ar,'ready',public.academic_ready(),'active',public.account_active(),'username',p.username,'username_claimed',p.username_claimed,'full_name',p.full_name) from public.student_academics s join public.profiles p on p.id=s.user_id left join public.universities u on u.id=s.university_id left join public.faculties f on f.id=s.faculty_id where s.user_id=auth.uid()),'{}'::jsonb)$$;
create function public.set_academic_context(p_university uuid,p_faculty uuid default null,p_year integer default null) returns void language plpgsql security definer set search_path='' as $$declare actor uuid:=public.require_actor('onboarding',60);begin
 if not exists(select 1 from public.universities where id=p_university and is_active and onboarding_enabled) then raise exception 'university unavailable';end if;
 if p_faculty is not null and not exists(select 1 from public.university_faculties uf join public.faculties f on f.id=uf.faculty_id where uf.university_id=p_university and uf.faculty_id=p_faculty and uf.is_active and f.is_active) then raise exception 'faculty unavailable';end if;
 if p_year is not null and (p_faculty is null or not exists(select 1 from public.academic_years where university_id=p_university and faculty_id=p_faculty and year=p_year)) then raise exception 'year unavailable';end if;
 if p_year is not null and not exists(select 1 from public.profiles where id=actor and username_claimed) then raise exception 'choose username';end if;
 update public.student_academics set university_id=p_university,faculty_id=p_faculty,academic_year=p_year,completed_at=case when p_year is not null then now() else null end,updated_at=now() where user_id=actor;
 if p_year is not null then delete from public.user_courses uc where uc.user_id=actor and not exists(select 1 from public.courses c where c.id=uc.course_id and c.university_id=p_university and c.faculty_id=p_faculty and c.year_level=p_year);end if;end;$$;
create or replace function public.update_profile(p_name text) returns void language plpgsql security definer set search_path='' as $$declare actor uuid:=public.require_actor('profile',10);begin
 if length(trim(p_name)) not between 2 and 80 then raise exception 'invalid name';end if;update public.profiles set display_name=trim(p_name),full_name=trim(p_name),updated_at=now() where id=actor;end;$$;

-- All privileged management RPCs recheck a live, verified administrator.
create function public.admin_save_university(p_id uuid,p_slug text,p_name text,p_name_ar text,p_description text,p_active boolean,p_onboarding boolean default true) returns uuid language plpgsql security definer set search_path='' as $$declare actor uuid:=public.assert_admin();target uuid:=coalesce(p_id,gen_random_uuid());begin
 if p_slug !~ '^[a-z0-9-]{2,80}$' or length(trim(p_name)) not between 2 and 120 or length(trim(p_name_ar)) not between 2 and 120 or length(p_description)>2000 then raise exception 'invalid university';end if;
 insert into public.universities(id,slug,name,name_ar,description,is_active,onboarding_enabled) values(target,p_slug,trim(p_name),trim(p_name_ar),p_description,p_active,p_onboarding) on conflict(id) do update set slug=excluded.slug,name=excluded.name,name_ar=excluded.name_ar,description=excluded.description,is_active=excluded.is_active,onboarding_enabled=excluded.onboarding_enabled;
 insert into public.admin_audit_log(actor_id,action,target_id,details) values(actor,'university.saved',target,jsonb_build_object('active',p_active,'onboarding',p_onboarding));return target;end;$$;
create function public.admin_save_faculty(p_id uuid,p_university uuid,p_slug text,p_name text,p_name_ar text,p_years integer[],p_active boolean) returns uuid language plpgsql security definer set search_path='' as $$declare actor uuid:=public.assert_admin();target uuid:=coalesce(p_id,gen_random_uuid());begin
 if p_slug !~ '^[a-z0-9-]{2,80}$' or length(trim(p_name)) not between 2 and 120 or length(trim(p_name_ar)) not between 2 and 120 or coalesce(cardinality(p_years),0) not between 1 and 12 or exists(select 1 from unnest(p_years) y where y is null or y<1 or y>12) then raise exception 'invalid faculty';end if;
 insert into public.faculties(id,slug,name,name_ar) values(target,p_slug,trim(p_name),trim(p_name_ar)) on conflict(id) do update set slug=excluded.slug,name=excluded.name,name_ar=excluded.name_ar;
 insert into public.university_faculties values(p_university,target,p_active) on conflict(university_id,faculty_id) do update set is_active=excluded.is_active;
 delete from public.academic_years where university_id=p_university and faculty_id=target and not(year=any(p_years));
 insert into public.academic_years select p_university,target,y::smallint from (select distinct unnest(p_years) y) ys on conflict do nothing;
 insert into public.admin_audit_log(actor_id,action,target_id,details) values(actor,'faculty.saved',target,jsonb_build_object('university',p_university,'years',p_years,'active',p_active));return target;end;$$;
create function public.admin_save_course(p_id uuid,p_university uuid,p_faculty uuid,p_year integer,p_semester integer,p_slug text,p_code text,p_title text,p_title_ar text,p_description text,p_active boolean) returns uuid language plpgsql security definer set search_path='' as $$declare actor uuid:=public.assert_admin();target uuid:=coalesce(p_id,gen_random_uuid());begin
 if not exists(select 1 from public.academic_years y join public.university_faculties uf using(university_id,faculty_id) join public.universities u on u.id=y.university_id where y.university_id=p_university and y.faculty_id=p_faculty and y.year=p_year and uf.is_active and u.is_active) or p_slug !~ '^[a-z0-9-]{2,100}$' or length(trim(p_code)) not between 1 and 40 or coalesce(length(trim(p_title)),0) not between 2 and 160 or length(trim(p_title_ar)) not between 2 and 160 or length(p_description)>2000 or (p_semester is not null and p_semester not between 1 and 3) then raise exception 'invalid course context';end if;
 insert into public.courses(id,university_id,faculty_id,year_level,semester,slug,code,title,title_ar,title_en,department,department_ar,description,is_active) values(target,p_university,p_faculty,p_year,p_semester,p_slug,p_code,p_title,p_title_ar,p_title,p_faculty::text,(select name_ar from public.faculties where id=p_faculty),p_description,p_active) on conflict(id) do update set university_id=excluded.university_id,faculty_id=excluded.faculty_id,year_level=excluded.year_level,semester=excluded.semester,slug=excluded.slug,code=excluded.code,title=excluded.title,title_ar=excluded.title_ar,title_en=excluded.title_en,department=excluded.department,department_ar=excluded.department_ar,description=excluded.description,is_active=excluded.is_active;
 insert into public.admin_audit_log(actor_id,action,target_id,details) values(actor,'course.saved',target,jsonb_build_object('university',p_university,'faculty',p_faculty,'year',p_year));return target;end;$$;
create function public.admin_set_account_status(p_user uuid,p_status text,p_reason text,p_confirm boolean) returns void language plpgsql security definer set search_path='' as $$declare actor uuid:=public.assert_admin();begin
 if p_confirm is distinct from true or p_status not in('active','suspended') or coalesce(length(trim(p_reason)),0) not between 4 and 1000 or p_user=actor or exists(select 1 from public.user_roles where user_id=p_user and role='admin') then raise exception 'invalid account operation';end if;
 update public.account_states set status=p_status,reason=trim(p_reason),updated_at=now() where user_id=p_user;if not found then raise exception 'account unavailable';end if;
 insert into public.admin_audit_log(actor_id,action,target_id,details) values(actor,'account.'||p_status,p_user,jsonb_build_object('reason',trim(p_reason)));end;$$;
alter table public.resources add column file_verified_at timestamptz;
update public.resources set file_verified_at=created_at where source_kind='pdf' and status='published';
create or replace function public.finalize_pdf_checked(p_resource uuid,p_author uuid) returns void language plpgsql security definer set search_path='' as $$begin
 if not exists(select 1 from public.account_states where user_id=p_author and status='active') or (not exists(select 1 from public.student_academics where user_id=p_author and completed_at is not null) and not exists(select 1 from public.user_roles where user_id=p_author and role='admin')) then raise exception 'active onboarded author required';end if;
 update public.resources r set status='published',file_verified_at=now(),updated_at=now() where r.id=p_resource and r.author_id=p_author and r.status='pending' and r.source_kind='pdf' and exists(select 1 from public.courses c where c.id=r.course_id and c.is_active);
 if not found then raise exception 'pending resource unavailable';end if;end;$$;
create function public.admin_manage_resource(p_resource uuid,p_title text,p_status text,p_reason text,p_confirm boolean) returns void language plpgsql security definer set search_path='' as $$declare actor uuid:=public.assert_admin();r public.resources;begin
 if p_confirm is distinct from true or p_status not in('published','hidden') or coalesce(length(trim(p_title)),0) not between 4 and 160 or coalesce(length(trim(p_reason)),0) not between 4 and 1000 then raise exception 'invalid resource operation';end if;
 select * into r from public.resources where id=p_resource for update;if not found then raise exception 'resource unavailable';end if;
 if p_status='published' and r.source_kind='pdf' and r.file_verified_at is null then raise exception 'PDF must pass file verification';end if;
 update public.resources set title=trim(p_title),status=p_status,updated_at=now() where id=p_resource;
 insert into public.admin_audit_log(actor_id,action,target_id,details) values(actor,'resource.'||p_status,p_resource,jsonb_build_object('reason',trim(p_reason)));end;$$;
create function public.admin_users(p_query text default '',p_university uuid default null,p_faculty uuid default null,p_year integer default null,p_page integer default 1) returns jsonb language plpgsql stable security definer set search_path='' as $$begin perform public.assert_admin();if p_query is null or length(p_query)>100 or p_page is null or p_page not between 1 and 10000 then raise exception 'invalid search';end if;
 return (with filtered as(select p.id,p.full_name,p.username,u.email,p.created_at,a.status,s.university_id,s.faculty_id,s.academic_year,un.name_ar university,f.name_ar faculty from public.profiles p join auth.users u on u.id=p.id join public.account_states a on a.user_id=p.id left join public.student_academics s on s.user_id=p.id left join public.universities un on un.id=s.university_id left join public.faculties f on f.id=s.faculty_id where (p_query='' or p.full_name ilike '%'||p_query||'%' or p.username ilike '%'||p_query||'%' or u.email ilike '%'||p_query||'%') and (p_university is null or s.university_id=p_university) and (p_faculty is null or s.faculty_id=p_faculty) and (p_year is null or s.academic_year=p_year) and not exists(select 1 from public.user_roles r where r.user_id=p.id and r.role='admin')) select jsonb_build_object('total',(select count(*) from filtered),'page',p_page,'users',coalesce((select jsonb_agg(x) from(select * from filtered order by created_at desc,id limit 25 offset (p_page-1)*25)x),'[]')));end;$$;

-- Trusted owner setup; never callable by anon/authenticated.
create function public.provision_admin(p_email text,p_username text) returns uuid language plpgsql security definer set search_path='' as $$declare target uuid;begin
 if p_username !~ '^[a-z][a-z0-9_]{2,29}$' then raise exception 'invalid admin username';end if;
 select id into target from auth.users where lower(email)=lower(trim(p_email)) and email_confirmed_at is not null;if target is null then raise exception 'create and verify the Auth account first';end if;
 update public.profiles set username=p_username,username_claimed=true where id=target;
 insert into public.user_roles(user_id,role) values(target,'admin') on conflict(user_id) do update set role='admin';
 insert into public.admin_audit_log(actor_id,action,target_id) values(target,'admin.provisioned',target);return target;end;$$;
create function public.admin_login_identity(p_username text,p_key text) returns uuid language plpgsql security definer set search_path='' as $$declare n integer;target uuid;begin
 if length(p_key)<>64 or length(p_username)>40 then return null;end if;
 insert into public.request_budgets values('login:'||p_key,date_trunc('hour',now()),1) on conflict(key,bucket) do update set count=public.request_budgets.count+1 returning count into n;if n>15 then return null;end if;
 select p.id into target from public.profiles p join public.user_roles r on r.user_id=p.id join public.account_states a on a.user_id=p.id join auth.users u on u.id=p.id where p.username=lower(p_username) and r.role='admin' and a.status='active' and u.email_confirmed_at is not null;return target;end;$$;

create function public.track_page_view(p_id uuid,p_page text,p_visitor uuid) returns void language plpgsql security definer set search_path='' as $$declare n integer;actor uuid:=auth.uid();begin
 if p_page not in('landing','dashboard','courses','course','resource','contribute','onboarding','profile','other') or p_id is null or p_visitor is null then return;end if;
 if actor is not null and not public.account_active() then return;end if;
 insert into public.request_budgets values('view:'||coalesce(actor,p_visitor)::text,date_trunc('minute',now()),1) on conflict(key,bucket) do update set count=public.request_budgets.count+1 returning count into n;if n>30 then return;end if;
 insert into public.analytics_events(id,user_id,visitor_id,page) values(p_id,actor,p_visitor,p_page) on conflict(id) do nothing;end;$$;
create function public.admin_overview() returns jsonb language plpgsql stable security definer set search_path='' as $$begin perform public.assert_admin();return jsonb_build_object(
 'students',(select count(*) from public.profiles p where not exists(select 1 from public.user_roles r where r.user_id=p.id and r.role='admin')),
 'courses',(select count(*) from public.courses),'resources',(select count(*) from public.resources),'page_views',(select count(*) from public.analytics_events),
 'dau',(select count(distinct user_id) from public.analytics_events where created_at>=date_trunc('day',now()) and not exists(select 1 from public.user_roles r where r.user_id=analytics_events.user_id and r.role='admin')),
 'mau',(select count(distinct user_id) from public.analytics_events where created_at>=now()-interval '30 days' and not exists(select 1 from public.user_roles r where r.user_id=analytics_events.user_id and r.role='admin')),
 'tracking_since',(select min(created_at) from public.analytics_events),
 'growth',(select jsonb_agg(x order by x.day) from(select d::date as day,(select count(*) from public.profiles p where p.created_at>=d and p.created_at<d+interval '1 day' and not exists(select 1 from public.user_roles r where r.user_id=p.id and r.role='admin')) registrations,(select count(*) from public.analytics_events e where e.created_at>=d and e.created_at<d+interval '1 day') views from generate_series(date_trunc('day',now())-interval '29 days',date_trunc('day',now()),interval '1 day')d)x),
 'universities',(select coalesce(jsonb_agg(x),'[]') from(select u.id,u.name_ar name,count(s.user_id) students from public.universities u left join public.student_academics s on s.university_id=u.id group by u.id order by count(s.user_id) desc)x),
 'faculties',(select coalesce(jsonb_agg(x),'[]') from(select f.name_ar name,s.academic_year as year,count(*) students from public.student_academics s join public.faculties f on f.id=s.faculty_id group by f.id,s.academic_year order by count(*) desc)x),
 'activity',(select coalesce(jsonb_agg(x),'[]') from(select event,created_at,course_id,resource_id from public.product_events order by created_at desc limit 15)x));end;$$;

-- Private mutable data stays RPC-only. Public academic options are database-driven.
grant select on public.faculties,public.university_faculties,public.academic_years to anon,authenticated;
grant select on public.student_academics,public.account_states,public.admin_audit_log,public.analytics_events to authenticated;
create policy faculty_read on public.faculties for select using(is_active or public.is_admin());
create policy university_faculty_read on public.university_faculties for select using((is_active and exists(select 1 from public.faculties f where f.id=faculty_id and f.is_active)) or public.is_admin());
create policy years_read on public.academic_years for select using(exists(select 1 from public.university_faculties uf where uf.university_id=academic_years.university_id and uf.faculty_id=academic_years.faculty_id) or public.is_admin());
create policy academic_owner_read on public.student_academics for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy account_owner_read on public.account_states for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy audit_admin_read on public.admin_audit_log for select to authenticated using(public.is_admin());
create policy analytics_admin_read on public.analytics_events for select to authenticated using(public.is_admin());
alter policy courses_read on public.courses using((is_active and exists(select 1 from public.universities u where u.id=university_id and u.is_active)) or public.is_admin());
alter policy pdf_insert on storage.objects with check(bucket_id='course-pdfs' and public.can_contribute() and exists(select 1 from public.resources r where r.author_id=auth.uid() and r.status='pending' and r.source_kind='pdf' and r.storage_path=name));
alter policy pdf_owner_delete on storage.objects using(bucket_id='course-pdfs' and public.can_contribute() and exists(select 1 from public.resources r where r.author_id=auth.uid() and r.status='pending' and r.storage_path=name));
-- Revoke the default PUBLIC execute grant for every new function before selective grants.
do $$declare f record;begin for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('account_active','is_admin','academic_ready','can_contribute','assert_admin','username_available','claim_username','student_context','set_academic_context','admin_save_university','admin_save_faculty','admin_save_course','admin_set_account_status','admin_manage_resource','admin_users','provision_admin','admin_login_identity','track_page_view','admin_overview') loop execute format('revoke all on function %s from public,anon,authenticated',f.signature);end loop;end;$$;
grant execute on function public.account_active(),public.is_admin(),public.academic_ready(),public.can_contribute(),public.username_available(text),public.track_page_view(uuid,text,uuid) to anon,authenticated;
grant execute on function public.claim_username(text),public.student_context(),public.set_academic_context(uuid,uuid,integer),public.admin_save_university(uuid,text,text,text,text,boolean,boolean),public.admin_save_faculty(uuid,uuid,text,text,text,integer[],boolean),public.admin_save_course(uuid,uuid,uuid,integer,integer,text,text,text,text,text,boolean),public.admin_set_account_status(uuid,text,text,boolean),public.admin_manage_resource(uuid,text,text,text,boolean),public.admin_users(text,uuid,uuid,integer,integer),public.admin_overview() to authenticated;
grant execute on function public.admin_login_identity(text,text),public.provision_admin(text,text),public.finalize_pdf_checked(uuid,uuid) to service_role;

-- Required MVP catalog; these are editable options, not fabricated courses/resources.
insert into public.universities(slug,name,name_ar,is_active,onboarding_enabled) values('capital-university','Capital University','جامعة العاصمة',true,true),('beni-suef-university','Beni Suef University','جامعة بني سويف',true,true) on conflict(slug) do nothing;
insert into public.faculties(slug,name,name_ar) values('engineering','Engineering','الهندسة'),('computers','Computers and Information','الحاسبات والمعلومات'),('commerce','Commerce','التجارة'),('arts','Arts','الآداب'),('medicine','Medicine','الطب') on conflict(slug) do nothing;
insert into public.university_faculties select u.id,f.id,true from public.universities u cross join public.faculties f where u.slug in('capital-university','beni-suef-university') on conflict do nothing;
insert into public.academic_years select uf.university_id,uf.faculty_id,y::smallint from public.university_faculties uf join public.universities u on u.id=uf.university_id join public.faculties f on f.id=uf.faculty_id cross join lateral generate_series(1,case f.slug when 'engineering' then 5 when 'medicine' then 6 else 4 end)y where u.slug in('capital-university','beni-suef-university') on conflict do nothing;

grant select on public.profiles,public.user_roles,public.account_states to service_role;

-- Foreign-key indexes for management and account cleanup.
create index university_faculty_faculty on public.university_faculties(faculty_id);
create index course_faculty on public.courses(faculty_id);
create index audit_actor on public.admin_audit_log(actor_id);
create index analytics_actor on public.analytics_events(user_id);
