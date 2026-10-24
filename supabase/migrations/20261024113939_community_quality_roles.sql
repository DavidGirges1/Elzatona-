-- Four effective roles. Ordinary students have no privilege row and signup never assigns one.
create table public.community_roles (
 user_id uuid primary key references public.profiles on delete cascade,
 role text not null check(role in('trusted','class_leader')),
 assigned_by uuid references auth.users on delete set null,
 updated_at timestamptz not null default now()
);
create table public.class_leader_courses (
 user_id uuid not null references public.community_roles(user_id) on delete cascade,
 course_id uuid not null references public.courses on delete cascade,
 primary key(user_id,course_id)
);
create index class_leader_courses_course_idx on public.class_leader_courses(course_id);
create index community_roles_assigner_idx on public.community_roles(assigned_by);
alter table public.community_roles enable row level security;
alter table public.class_leader_courses enable row level security;
revoke all on public.community_roles,public.class_leader_courses from public,anon,authenticated;
grant select on public.community_roles,public.class_leader_courses to authenticated;
create policy community_role_read on public.community_roles for select to authenticated using(user_id=(select auth.uid()) or (select public.is_admin()));
create policy leader_courses_read on public.class_leader_courses for select to authenticated using(user_id=(select auth.uid()) or (select public.is_admin()));
-- Preserve explicit old publishing approvals as trusted, but never invent course assignments.
insert into public.community_roles(user_id,role,assigned_by) select m.user_id,'trusted',m.updated_by from public.material_permissions m where m.can_publish and not exists(select 1 from public.user_roles r where r.user_id=m.user_id and r.role='admin');
update public.material_publishing_settings set open_to_all=false;
-- Legacy switches are retired: they cannot bypass the new role model through an old client.
revoke execute on function public.admin_set_material_permissions(uuid,boolean,boolean,text,boolean),public.admin_set_publishing_mode(boolean,text,boolean) from public,anon,authenticated;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$select public.account_active() and exists(select 1 from public.user_roles r join auth.users u on u.id=r.user_id where r.user_id=auth.uid() and r.role='admin' and u.email_confirmed_at is not null)$$;
create or replace function public.is_moderator() returns boolean language sql stable security definer set search_path='' as $$select public.is_admin()$$;
create or replace function elzatona_private.material_publisher(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select elzatona_private.material_actor_ready(p_user) and (exists(select 1 from public.user_roles where user_id=p_user and role='admin') or exists(select 1 from public.community_roles where user_id=p_user and role='trusted'))
$$;
create function elzatona_private.course_leader(p_user uuid,p_course uuid) returns boolean language sql stable security definer set search_path='' as $$
 select elzatona_private.material_actor_ready(p_user) and exists(select 1 from public.community_roles r join public.class_leader_courses c on c.user_id=r.user_id join public.courses k on k.id=c.course_id join public.universities u on u.id=k.university_id where r.user_id=p_user and r.role='class_leader' and c.course_id=p_course and k.is_active and u.is_active)
$$;
create or replace function elzatona_private.material_organizer(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select elzatona_private.material_actor_ready(p_user) and (exists(select 1 from public.user_roles where user_id=p_user and role='admin') or exists(select 1 from public.class_leader_courses c where c.user_id=p_user and elzatona_private.course_leader(p_user,c.course_id)))
$$;
create function elzatona_private.course_organizer(p_user uuid,p_course uuid) returns boolean language sql stable security definer set search_path='' as $$
 select elzatona_private.material_actor_ready(p_user) and (exists(select 1 from public.user_roles where user_id=p_user and role='admin') or elzatona_private.course_leader(p_user,p_course))
$$;
revoke all on function elzatona_private.course_leader(uuid,uuid),elzatona_private.course_organizer(uuid,uuid) from public,anon,authenticated;
create or replace function public.require_actor(p_action text,p_limit integer default 30) returns uuid language plpgsql security definer set search_path='' as $$declare actor uuid:=auth.uid();n integer;begin
 if actor is null or not public.account_active() then raise exception 'active account required' using errcode='42501';end if;
 if p_action not in('profile','onboarding') and not elzatona_private.material_actor_ready(actor) then raise exception 'complete academic onboarding' using errcode='42501';end if;
 insert into public.mutation_limits values(actor,p_action,date_trunc('hour',now()),1) on conflict(user_id,action,bucket) do update set count=public.mutation_limits.count+1 returning count into n;
 if n>p_limit then raise exception 'rate limit exceeded';end if;return actor;end;$$;
revoke all on function public.require_actor(text,integer) from public,anon,authenticated;
drop function public.material_access();
create function public.material_access(p_course uuid default null) returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object(
 'open_to_all',false,'can_submit',elzatona_private.material_actor_ready(auth.uid()),
 'can_publish',elzatona_private.material_publisher(auth.uid()),
 'can_organize',case when p_course is null then elzatona_private.material_organizer(auth.uid()) else elzatona_private.course_organizer(auth.uid(),p_course) end,
 'can_review',case when p_course is null then elzatona_private.material_organizer(auth.uid()) else elzatona_private.course_organizer(auth.uid(),p_course) end)$$;
revoke all on function public.material_access(uuid) from public,anon,authenticated;
grant execute on function public.material_access(uuid) to anon,authenticated;
create function public.review_scope() returns uuid[] language sql stable security definer set search_path='' as $$
 select coalesce(array_agg(c.id order by c.id),array[]::uuid[]) from public.courses c join public.universities u on u.id=c.university_id where c.is_active and u.is_active and elzatona_private.course_organizer(auth.uid(),c.id)
$$;
revoke all on function public.review_scope() from public,anon,authenticated;
grant execute on function public.review_scope() to authenticated;

create function public.admin_assign_community_role(p_user uuid,p_role text,p_courses uuid[],p_reason text,p_confirm boolean) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.assert_admin();previous jsonb;begin
 if p_confirm is distinct from true or p_role is null or p_role not in('student','trusted','class_leader','admin') or p_courses is null or cardinality(p_courses)>250 or length(trim(coalesce(p_reason,''))) not between 4 and 1000 then raise exception 'invalid role decision';end if;
 -- Serialize admin changes so concurrent demotions cannot remove the last active admin.
 perform 1 from public.material_publishing_settings where singleton for update;
 if not exists(select 1 from public.profiles where id=p_user) then raise exception 'account unavailable';end if;
 if exists(select 1 from public.user_roles where user_id=p_user and role='admin') and p_role<>'admin' and not exists(select 1 from public.user_roles r join public.account_states a on a.user_id=r.user_id join auth.users u on u.id=r.user_id where r.role='admin' and r.user_id<>p_user and a.status='active' and u.email_confirmed_at is not null) then raise exception 'last active admin cannot be removed';end if;
 if p_role in('admin','trusted','class_leader') and not elzatona_private.material_actor_ready(p_user) then raise exception 'active confirmed onboarded account required';end if;
 if p_role='class_leader' then
  if cardinality(p_courses)=0 or exists(select 1 from unnest(p_courses) as x(course_id) where x.course_id is null or not exists(select 1 from public.courses c join public.universities u on u.id=c.university_id where c.id=x.course_id and c.is_active and u.is_active)) or (select count(*)<>count(distinct id) from unnest(p_courses) id) then raise exception 'explicit unique active course assignments required';end if;
 elsif cardinality(p_courses)<>0 then raise exception 'only class leaders receive course assignments';end if;
 select jsonb_build_object('role',case when exists(select 1 from public.user_roles where user_id=p_user and role='admin') then 'admin' else coalesce((select role from public.community_roles where user_id=p_user),'student') end,'courses',(select jsonb_agg(course_id) from public.class_leader_courses where user_id=p_user)) into previous;
 delete from public.class_leader_courses where user_id=p_user;
 delete from public.community_roles where user_id=p_user;
 delete from public.user_roles where user_id=p_user;
 if p_role='admin' then insert into public.user_roles(user_id,role) values(p_user,'admin');
 elsif p_role in('trusted','class_leader') then
  insert into public.community_roles(user_id,role,assigned_by) values(p_user,p_role,actor);
  if p_role='class_leader' then insert into public.class_leader_courses(user_id,course_id) select p_user,id from unnest(p_courses) id;end if;
 end if;
 delete from public.material_permissions where user_id=p_user;
 insert into public.admin_audit_log(actor_id,action,target_id,details) values(actor,'community.role_assigned',p_user,jsonb_build_object('before',previous,'role',p_role,'courses',to_jsonb(p_courses),'reason',trim(p_reason)));
end;$$;
create function public.admin_community_roles(p_users uuid[]) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 perform public.assert_admin();if p_users is null or cardinality(p_users)>100 then raise exception 'invalid user list';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'role',case when r.role='admin' then 'admin' else coalesce(c.role,'student') end,'courses',coalesce((select jsonb_agg(l.course_id order by l.course_id) from public.class_leader_courses l where l.user_id=p.id),'[]'::jsonb))) from public.profiles p left join public.user_roles r on r.user_id=p.id left join public.community_roles c on c.user_id=p.id where p.id=any(p_users)),'[]'::jsonb);
end;$$;
revoke all on function public.admin_assign_community_role(uuid,text,uuid[],text,boolean),public.admin_community_roles(uuid[]) from public,anon,authenticated;
grant execute on function public.admin_assign_community_role(uuid,text,uuid[],text,boolean),public.admin_community_roles(uuid[]) to authenticated;

alter table public.resources add column review_state text not null default 'draft' check(review_state in('draft','submitted','rejected','approved'));
alter table public.resources add column submission_version integer not null default 1 check(submission_version>0);
alter table public.resources add column submitted_at timestamptz;
update public.resources set review_state='approved' where status in('published','hidden');
alter table public.resources add constraint published_material_is_approved check(status<>'published' or review_state='approved');
alter table public.resources drop constraint resources_source_payload_check;
alter table public.resources add constraint resources_source_payload_check check(
 (source_kind='external' and external_url is not null and normalized_url is not null and storage_path is null) or
 (source_kind='pdf' and external_url is null and normalized_url is null and storage_path is not null) or
 (source_kind='quiz' and type='question_bank' and external_url is null and normalized_url is null and storage_path is null));
create index resources_review_queue_idx on public.resources(course_id,submitted_at,id) where status='pending' and review_state='submitted';
create table public.resource_reviews (
 id bigint generated always as identity primary key,
 resource_id uuid not null references public.resources on delete cascade,
 reviewer_id uuid references auth.users on delete set null,
 decision text not null check(decision in('approved','rejected')),
 reason text not null check(length(reason) between 4 and 1000),
 submission_version integer not null,
 created_at timestamptz not null default now()
);
create index resource_reviews_resource_idx on public.resource_reviews(resource_id,created_at desc);
create index resource_reviews_reviewer_idx on public.resource_reviews(reviewer_id);
alter table public.resource_reviews enable row level security;
revoke all on public.resource_reviews from public,anon,authenticated;
grant select on public.resource_reviews to authenticated;
create function public.can_review_material(p_resource uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.resources r where r.id=p_resource and r.status='pending' and r.review_state='submitted' and (public.is_admin() or (r.author_id<>auth.uid() and elzatona_private.course_leader(auth.uid(),r.course_id))))
$$;
revoke all on function public.can_review_material(uuid) from public,anon,authenticated;
grant execute on function public.can_review_material(uuid) to authenticated;
-- RLS calls a caller-bound public predicate; private parameterized helpers stay uncallable.
create function public.leads_course(p_course uuid) returns boolean language sql stable security definer set search_path='' as $$select elzatona_private.course_leader(auth.uid(),p_course)$$;
revoke all on function public.leads_course(uuid) from public,anon,authenticated;
grant execute on function public.leads_course(uuid) to anon,authenticated;
create policy resource_reviews_private_read on public.resource_reviews for select to authenticated using((select public.is_admin()) or exists(select 1 from public.resources r where r.id=resource_id and (r.author_id=(select auth.uid()) or (r.review_state in('submitted','approved','rejected') and public.leads_course(r.course_id)))));
drop policy resources_read on public.resources;
create policy resources_read on public.resources for select using(
 (status='published' and exists(select 1 from public.courses where id=course_id)) or author_id=(select auth.uid()) or (select public.is_admin()) or
 (status='pending' and review_state='submitted' and public.leads_course(course_id)));
drop policy quiz_author_admin_read on public.quiz_sets;
create policy quiz_author_admin_read on public.quiz_sets for select to authenticated using(exists(select 1 from public.resources r where r.id=resource_id and (r.author_id=(select auth.uid()) or (select public.is_admin()) or (r.status='pending' and r.review_state='submitted' and public.leads_course(r.course_id)))));

create function elzatona_private.assert_material_url(p_url text) returns void language plpgsql immutable set search_path='' as $$declare host text;begin
 host:=lower(split_part(substring(p_url from '^https://([^/]+)'),':',1));
 if p_url is null or length(p_url)>4096 or p_url!~'^https://[A-Za-z0-9.-]+[.][A-Za-z]{2,}([/?#]|$)' or p_url ~ '[[:space:]\\]' or host ~ '(^|[.])(localhost|local|internal)$' then raise exception 'unsafe URL';end if;
end;$$;
revoke all on function elzatona_private.assert_material_url(text) from public,anon,authenticated;
create or replace function public.submit_resource(p_course uuid,p_topic uuid,p_title text,p_description text,p_type text,p_url text,p_rights boolean,p_ai boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.require_actor('resource',20);rid uuid;existing public.resources;direct boolean:=elzatona_private.material_publisher(actor);begin
 if p_rights is distinct from true then raise exception 'rights required';end if;
 if not exists(select 1 from public.courses c join public.universities u on u.id=c.university_id where c.id=p_course and c.is_active and u.is_active) then raise exception 'course unavailable';end if;
 perform elzatona_private.assert_material_url(p_url);
 select * into existing from public.resources where course_id=p_course and normalized_url=p_url and status<>'hidden';
 if found then if existing.status='published' or existing.author_id=actor then return existing.id;else raise exception 'duplicate source awaiting review';end if;end if;
 insert into public.resources(course_id,topic_id,author_id,title,description,type,source_kind,external_url,normalized_url,rights_confirmed,is_ai_assisted,status,review_state,submitted_at) values(p_course,p_topic,actor,p_title,p_description,p_type,'external',p_url,p_url,true,p_ai,case when direct then 'published' else 'pending' end,case when direct then 'approved' else 'submitted' end,now()) returning id into rid;
 insert into public.product_events(event,actor_id,course_id,resource_id) values('resource_submitted',actor,p_course,rid);
 insert into public.admin_audit_log(actor_id,action,target_id,details)values(actor,case when direct then 'material.published' else 'material.submitted' end,rid,jsonb_build_object('source','external','course_id',p_course));return rid;
end;$$;
create function public.can_submit_materials() returns boolean language sql stable security definer set search_path='' as $$select elzatona_private.material_actor_ready(auth.uid())$$;
revoke all on function public.can_submit_materials() from public,anon,authenticated;
grant execute on function public.can_submit_materials() to anon,authenticated;
alter policy pdf_insert on storage.objects with check(bucket_id='course-pdfs' and (select public.can_submit_materials()) and exists(select 1 from public.resources r where r.author_id=(select auth.uid()) and r.status='pending' and r.review_state='draft' and r.file_verified_at is null and r.source_kind='pdf' and r.storage_path=name));
alter policy pdf_owner_delete on storage.objects using(bucket_id='course-pdfs' and exists(select 1 from public.resources r where r.storage_path=name and r.author_id=(select auth.uid()) and r.status='pending' and r.review_state='draft' and r.file_verified_at is null));
create or replace function public.finalize_pdf_checked(p_resource uuid,p_author uuid) returns void language plpgsql security definer set search_path='' as $$declare direct boolean:=elzatona_private.material_publisher(p_author);begin
 if not elzatona_private.material_actor_ready(p_author) then raise exception 'active onboarded author required';end if;
 update public.resources r set status=case when direct then 'published' else 'pending' end,review_state=case when direct then 'approved' else 'submitted' end,submitted_at=now(),file_verified_at=now(),updated_at=now() where r.id=p_resource and r.author_id=p_author and r.status='pending' and r.review_state='draft' and r.source_kind='pdf' and exists(select 1 from public.courses c join public.universities u on u.id=c.university_id where c.id=r.course_id and c.is_active and u.is_active);
 if not found then raise exception 'pending upload unavailable';end if;
 insert into public.product_events(event,actor_id,resource_id)values('resource_submitted',p_author,p_resource);
 insert into public.admin_audit_log(actor_id,action,target_id,details)values(p_author,case when direct then 'material.published' else 'material.submitted' end,p_resource,jsonb_build_object('source','pdf'));
end;$$;
revoke all on function public.finalize_pdf_checked(uuid,uuid) from public,anon,authenticated;
grant execute on function public.finalize_pdf_checked(uuid,uuid) to service_role;
-- Service-only scope check used before issuing a short-lived PDF review URL.
create function public.review_pdf_path(p_resource uuid,p_reviewer uuid) returns text language sql stable security definer set search_path='' as $$
 select r.storage_path from public.resources r where r.id=p_resource and r.source_kind='pdf' and r.file_verified_at is not null and elzatona_private.material_actor_ready(p_reviewer) and (
 exists(select 1 from public.user_roles where user_id=p_reviewer and role='admin') or (r.author_id=p_reviewer and r.status='pending') or (r.status='pending' and r.review_state='submitted' and r.author_id<>p_reviewer and elzatona_private.course_leader(p_reviewer,r.course_id)))
$$;
revoke all on function public.review_pdf_path(uuid,uuid) from public,anon,authenticated;
grant execute on function public.review_pdf_path(uuid,uuid) to service_role;

create function public.review_material(p_resource uuid,p_version integer,p_decision text,p_reason text) returns void language plpgsql security definer set search_path='' as $$declare actor uuid:=public.require_actor('material_review',60);r public.resources;begin
 if p_decision is null or p_decision not in('approved','rejected') or length(trim(coalesce(p_reason,''))) not between 4 and 1000 then raise exception 'review reason and decision required';end if;
 select * into r from public.resources where id=p_resource for update;
 if not found or not public.can_review_material(p_resource) then raise exception 'review not authorized' using errcode='42501';end if;
 if r.submission_version is distinct from p_version then raise exception 'submission changed; reload before reviewing' using errcode='40001';end if;
 if p_decision='approved' then
  if not exists(select 1 from public.courses c join public.universities u on u.id=c.university_id where c.id=r.course_id and c.is_active and u.is_active) then raise exception 'course unavailable';end if;
  if not elzatona_private.material_actor_ready(r.author_id) or not r.rights_confirmed then raise exception 'author unavailable or rights missing';end if;
  if r.source_kind='pdf' and r.file_verified_at is null then raise exception 'PDF not verified';end if;
  if r.source_kind='quiz' then perform elzatona_private.assert_quiz_document((select document from public.quiz_sets where resource_id=r.id),true);end if;
 end if;
 update public.resources set status=case when p_decision='approved' then 'published' else 'pending' end,review_state=p_decision,updated_at=now() where id=r.id;
 insert into public.resource_reviews(resource_id,reviewer_id,decision,reason,submission_version) values(r.id,actor,p_decision,trim(p_reason),r.submission_version);
 insert into public.admin_audit_log(actor_id,action,target_id,details) values(actor,'material.'||p_decision,r.id,jsonb_build_object('reason',trim(p_reason),'version',r.submission_version,'course_id',r.course_id));
end;$$;
revoke all on function public.review_material(uuid,integer,text,text) from public,anon,authenticated;
grant execute on function public.review_material(uuid,integer,text,text) to authenticated;
create or replace function public.edit_resource(p_resource uuid,p_title text,p_description text,p_topic uuid) returns void language plpgsql security definer set search_path='' as $$declare actor uuid:=public.require_actor('edit',30);r public.resources;begin
 select * into r from public.resources where id=p_resource and status='published' for update;
 if not found or not exists(select 1 from public.courses c join public.universities u on u.id=c.university_id where c.id=r.course_id and c.is_active and u.is_active) or not ((r.author_id=actor and elzatona_private.material_publisher(actor)) or elzatona_private.course_organizer(actor,r.course_id)) then raise exception 'not authorized' using errcode='42501';end if;
 update public.resources set title=p_title,description=p_description,topic_id=p_topic,updated_at=now() where id=p_resource;
 insert into public.admin_audit_log(actor_id,action,target_id,details) values(actor,'material.organized',p_resource,jsonb_build_object('title',p_title,'topic_id',p_topic));
end;$$;
create function public.edit_proposed_resource(p_resource uuid,p_title text,p_description text,p_topic uuid,p_url text) returns void language plpgsql security definer set search_path='' as $$declare actor uuid:=public.require_actor('proposal_edit',30);r public.resources;begin
 select * into r from public.resources where id=p_resource for update;
 if not found or (r.author_id<>actor and not public.is_admin()) or r.status<>'pending' or r.source_kind='quiz' or (r.source_kind='pdf' and r.file_verified_at is null) then raise exception 'proposal not editable' using errcode='42501';end if;
 if not exists(select 1 from public.courses c join public.universities u on u.id=c.university_id where c.id=r.course_id and c.is_active and u.is_active) then raise exception 'course unavailable';end if;
 if r.source_kind='external' then perform elzatona_private.assert_material_url(p_url);elsif p_url is not null then raise exception 'PDF source immutable';end if;
 update public.resources set title=p_title,description=p_description,topic_id=p_topic,external_url=case when source_kind='external' then p_url else null end,normalized_url=case when source_kind='external' then p_url else null end,review_state='submitted',submission_version=submission_version+1,submitted_at=now(),updated_at=now() where id=r.id;
 insert into public.admin_audit_log(actor_id,action,target_id,details)values(actor,'material.resubmitted',r.id,jsonb_build_object('version',r.submission_version+1));
end;$$;
revoke all on function public.edit_proposed_resource(uuid,text,text,uuid,text) from public,anon,authenticated;
grant execute on function public.edit_proposed_resource(uuid,text,text,uuid,text) to authenticated;
create or replace function public.add_material_topic(p_course uuid,p_title text) returns uuid language plpgsql security definer set search_path='' as $$declare actor uuid:=public.require_actor('topic',30);topic uuid;begin
 if not elzatona_private.course_organizer(actor,p_course) then raise exception 'course organization restricted' using errcode='42501';end if;
 if p_title is null or length(trim(p_title)) not between 2 and 120 or not exists(select 1 from public.courses c join public.universities u on u.id=c.university_id where c.id=p_course and c.is_active and u.is_active) then raise exception 'invalid topic or course';end if;
 insert into public.topics(course_id,title,title_ar) values(p_course,trim(p_title),trim(p_title)) on conflict(course_id,title) do nothing returning id into topic;
 if topic is null then select id into topic from public.topics where course_id=p_course and title=trim(p_title);end if;
 insert into public.admin_audit_log(actor_id,action,target_id,details) values(actor,'material.topic_created',topic,jsonb_build_object('course_id',p_course,'title',p_title));return topic;
end;$$;
create function public.organize_topic(p_topic uuid,p_title text,p_order integer) returns void language plpgsql security definer set search_path='' as $$declare actor uuid:=public.require_actor('topic',30);course uuid;begin
 select course_id into course from public.topics where id=p_topic for update;
 if course is null or not elzatona_private.course_organizer(actor,course) then raise exception 'course organization restricted' using errcode='42501';end if;
 if length(trim(coalesce(p_title,''))) not between 2 and 120 or p_order is null or p_order not between 0 and 10000 then raise exception 'invalid topic metadata';end if;
 update public.topics set title=trim(p_title),title_ar=trim(p_title),sort_order=p_order where id=p_topic;
 insert into public.admin_audit_log(actor_id,action,target_id,details) values(actor,'material.topic_updated',p_topic,jsonb_build_object('title',p_title,'order',p_order));
end;$$;
revoke all on function public.organize_topic(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.organize_topic(uuid,text,integer) to authenticated;

create or replace function public.save_quiz(p_course uuid,p_topic uuid,p_document jsonb,p_resource uuid default null,p_publish boolean default false,p_rights boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.require_actor('quiz_draft',30);r public.resources;rid uuid:=coalesce(p_resource,gen_random_uuid());begin
 if p_publish is null or p_rights is null then raise exception 'invalid publication request';end if;
 if not exists(select 1 from public.courses c join public.universities u on u.id=c.university_id where c.id=p_course and c.is_active and u.is_active) then raise exception 'course unavailable';end if;
 if p_resource is not null then
  select * into r from public.resources where id=p_resource for update;
  if not found or r.course_id<>p_course or r.source_kind<>'quiz' or r.status='hidden' or (r.author_id<>actor and not public.is_admin()) then raise exception 'not authorized' using errcode='42501';end if;
  if r.status='published' and not elzatona_private.material_publisher(actor) then raise exception 'published quiz edit restricted' using errcode='42501';end if;
  if r.status='published' and not p_publish then raise exception 'published changes require publication';end if;
 end if;
 if p_publish and not p_rights then raise exception 'material publishing restricted or rights missing' using errcode='42501';end if;
 perform elzatona_private.assert_quiz_document(p_document,p_publish);
 if p_resource is null then
  insert into public.resources(id,course_id,topic_id,author_id,title,description,type,source_kind,rights_confirmed,is_ai_assisted,status) values(rid,p_course,p_topic,actor,trim(p_document->>'title'),coalesce(p_document->>'description',''),'question_bank','quiz',p_rights,coalesce((p_document->>'aiAssisted')::boolean,false),'pending');
 else
  update public.resources set topic_id=p_topic,title=trim(p_document->>'title'),description=coalesce(p_document->>'description',''),is_ai_assisted=coalesce((p_document->>'aiAssisted')::boolean,false),rights_confirmed=rights_confirmed or p_rights,review_state=case when r.status='published' then 'approved' else 'draft' end,submission_version=submission_version+1,updated_at=now() where id=rid;
 end if;
 insert into public.quiz_sets(resource_id,document) values(rid,p_document) on conflict(resource_id) do update set document=excluded.document,revision=public.quiz_sets.revision+1,updated_at=now();
 if p_publish then
  update public.resources set status=case when elzatona_private.material_publisher(actor) then 'published' else 'pending' end,review_state=case when elzatona_private.material_publisher(actor) then 'approved' else 'submitted' end,submission_version=submission_version+1,submitted_at=now() where id=rid;
  if p_resource is null or r.status<>'published' then insert into public.product_events(event,actor_id,course_id,resource_id) values('resource_submitted',actor,p_course,rid);end if;
 end if;
 insert into public.admin_audit_log(actor_id,action,target_id,details) values(actor,case when p_publish and elzatona_private.material_publisher(actor) then 'quiz.published' when p_publish then 'quiz.submitted' else 'quiz.draft_saved' end,rid,jsonb_build_object('questions',jsonb_array_length(p_document->'questions')));
 return rid;
end;$$;

create or replace function public.admin_manage_resource(p_resource uuid,p_title text,p_status text,p_reason text,p_confirm boolean) returns void language plpgsql security definer set search_path='' as $$declare actor uuid:=public.assert_admin();r public.resources;begin
 if p_confirm is distinct from true or p_status not in('published','hidden') or coalesce(length(trim(p_title)),0) not between 4 and 160 or coalesce(length(trim(p_reason)),0) not between 4 and 1000 then raise exception 'invalid resource operation';end if;
 select * into r from public.resources where id=p_resource for update;if not found then raise exception 'resource unavailable';end if;
 if p_status='published' and r.source_kind='pdf' and r.file_verified_at is null then raise exception 'PDF must pass file verification';end if;
 if p_status='published' and r.status='pending' and r.review_state<>'submitted' then raise exception 'submit material before approval';end if;
 update public.resources set title=trim(p_title),status=p_status,review_state=case when p_status='published' then 'approved' else review_state end,updated_at=now() where id=p_resource;
 insert into public.admin_audit_log(actor_id,action,target_id,details) values(actor,'resource.'||p_status,p_resource,jsonb_build_object('reason',trim(p_reason)));end;$$;
create or replace function public.admin_users(p_query text default '',p_university uuid default null,p_faculty uuid default null,p_year integer default null,p_page integer default 1) returns jsonb language plpgsql stable security definer set search_path='' as $$begin perform public.assert_admin();if p_query is null or length(p_query)>100 or p_page is null or p_page not between 1 and 10000 then raise exception 'invalid search';end if;
 return (with filtered as(select p.id,p.full_name,p.username,u.email,p.created_at,a.status,s.university_id,s.faculty_id,s.academic_year,un.name_ar university,f.name_ar faculty from public.profiles p join auth.users u on u.id=p.id join public.account_states a on a.user_id=p.id left join public.student_academics s on s.user_id=p.id left join public.universities un on un.id=s.university_id left join public.faculties f on f.id=s.faculty_id where (p_query='' or p.full_name ilike '%'||p_query||'%' or p.username ilike '%'||p_query||'%' or u.email ilike '%'||p_query||'%') and (p_university is null or s.university_id=p_university) and (p_faculty is null or s.faculty_id=p_faculty) and (p_year is null or s.academic_year=p_year)) select jsonb_build_object('total',(select count(*) from filtered),'page',p_page,'users',coalesce((select jsonb_agg(x) from(select * from filtered order by created_at desc,id limit 25 offset (p_page-1)*25)x),'[]')));end;$$;

-- Trusted owner setup; never callable by anon/authenticated.

create view public.latest_resource_reviews with(security_invoker=true) as select distinct on(resource_id) resource_id,decision,reason,submission_version,created_at from public.resource_reviews order by resource_id,created_at desc,id desc;
revoke all on public.latest_resource_reviews from public,anon,authenticated;
grant select on public.latest_resource_reviews to authenticated;
