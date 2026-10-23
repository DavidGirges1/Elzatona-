-- Launch mode is closed by default, including for existing students.
create table public.material_publishing_settings (
  singleton boolean primary key default true check(singleton),
  open_to_all boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users on delete set null
);
insert into public.material_publishing_settings(singleton) values(true);
create table public.material_permissions (
  user_id uuid primary key references public.profiles on delete cascade,
  can_publish boolean not null default false,
  can_organize boolean not null default false,
  updated_by uuid references auth.users on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.material_publishing_settings enable row level security;
alter table public.material_permissions enable row level security;
revoke all on public.material_publishing_settings,public.material_permissions from public,anon,authenticated;
grant select on public.material_publishing_settings,public.material_permissions to authenticated;
create policy material_settings_admin_read on public.material_publishing_settings for select to authenticated using((select public.is_admin()));
create policy material_permissions_owner_admin_read on public.material_permissions for select to authenticated using(user_id=(select auth.uid()) or (select public.is_admin()));

-- Parameterized privileged helpers are private and not reachable through the Data API.
create schema if not exists elzatona_private;
revoke all on schema elzatona_private from public,anon,authenticated;
create function elzatona_private.material_actor_ready(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.account_states a join auth.users u on u.id=a.user_id where a.user_id=p_user and a.status='active' and u.email_confirmed_at is not null)
 and (exists(select 1 from public.user_roles where user_id=p_user and role='admin') or exists(
 select 1 from public.student_academics s join public.profiles p on p.id=s.user_id join public.universities u on u.id=s.university_id join public.university_faculties uf on uf.university_id=s.university_id and uf.faculty_id=s.faculty_id join public.faculties f on f.id=s.faculty_id join public.academic_years y on y.university_id=s.university_id and y.faculty_id=s.faculty_id and y.year=s.academic_year
 where s.user_id=p_user and s.completed_at is not null and p.username_claimed and u.is_active and u.onboarding_enabled and f.is_active and uf.is_active))
$$;
create function elzatona_private.material_publisher(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select elzatona_private.material_actor_ready(p_user) and (
 exists(select 1 from public.user_roles where user_id=p_user and role='admin') or
 exists(select 1 from public.material_publishing_settings where singleton and open_to_all) or
 exists(select 1 from public.material_permissions where user_id=p_user and can_publish))
$$;
create function elzatona_private.material_organizer(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select elzatona_private.material_actor_ready(p_user) and (exists(select 1 from public.user_roles where user_id=p_user and role='admin') or exists(select 1 from public.material_permissions where user_id=p_user and can_organize))
$$;
revoke all on all functions in schema elzatona_private from public,anon,authenticated;
create function public.can_publish_materials() returns boolean language sql stable security definer set search_path='' as $$select elzatona_private.material_publisher(auth.uid())$$;
create function public.material_access() returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object(
 'open_to_all',coalesce((select open_to_all from public.material_publishing_settings where singleton),false),
 'can_publish',elzatona_private.material_publisher(auth.uid()),
 'can_organize',elzatona_private.material_organizer(auth.uid()))$$;
revoke all on function public.can_publish_materials(),public.material_access() from public,anon,authenticated;
grant execute on function public.can_publish_materials(),public.material_access() to anon,authenticated;

-- Keep community actions available. Only material mutation actions require approval.
create or replace function public.require_actor(p_action text,p_limit integer default 30) returns uuid language plpgsql security definer set search_path='' as $$declare actor uuid:=auth.uid();n integer;begin
 if actor is null or not public.account_active() then raise exception 'active account required' using errcode='42501';end if;
 if p_action not in('profile','onboarding') and not public.can_contribute() then raise exception 'complete academic onboarding' using errcode='42501';end if;
 if p_action in('resource','pdf','finalize') and not elzatona_private.material_publisher(actor) then raise exception 'material publishing restricted' using errcode='42501';end if;
 if p_action='edit' and not (elzatona_private.material_publisher(actor) or elzatona_private.material_organizer(actor)) then raise exception 'material organization restricted' using errcode='42501';end if;
 insert into public.mutation_limits values(actor,p_action,date_trunc('hour',now()),1) on conflict(user_id,action,bucket) do update set count=public.mutation_limits.count+1 returning count into n;
 if n>p_limit then raise exception 'rate limit exceeded' using errcode='P0001';end if;return actor;end;$$;
revoke all on function public.require_actor(text,integer) from public,anon,authenticated;
alter policy pdf_insert on storage.objects with check(bucket_id='course-pdfs' and (select public.can_publish_materials()) and exists(select 1 from public.resources r where r.author_id=auth.uid() and r.status='pending' and r.source_kind='pdf' and r.storage_path=name));
-- Pending object deletion remains available to its owner for failure recovery.
create or replace function public.finalize_pdf_checked(p_resource uuid,p_author uuid) returns void language plpgsql security definer set search_path='' as $$begin
 if not elzatona_private.material_actor_ready(p_author) then raise exception 'active onboarded author required' using errcode='42501';end if;
 if not elzatona_private.material_publisher(p_author) then raise exception 'material publishing restricted' using errcode='42501';end if;
 update public.resources r set status='published',file_verified_at=now(),updated_at=now() where r.id=p_resource and r.author_id=p_author and r.status='pending' and r.source_kind='pdf' and exists(select 1 from public.courses c join public.universities u on u.id=c.university_id where c.id=r.course_id and c.is_active and u.is_active);
 if not found then raise exception 'pending resource unavailable';end if;end;$$;
revoke all on function public.finalize_pdf_checked(uuid,uuid) from public,anon,authenticated;
grant execute on function public.finalize_pdf_checked(uuid,uuid) to service_role;

create or replace function public.edit_resource(p_resource uuid,p_title text,p_description text,p_topic uuid) returns void language plpgsql security definer set search_path='' as $$declare actor uuid:=public.require_actor('edit',30);r public.resources;begin
 select * into r from public.resources where id=p_resource and status='published' for update;
 if not found or not exists(select 1 from public.courses c join public.universities u on u.id=c.university_id where c.id=r.course_id and c.is_active and u.is_active) or not ((r.author_id=actor and elzatona_private.material_publisher(actor)) or elzatona_private.material_organizer(actor)) then raise exception 'not authorized' using errcode='42501';end if;
 update public.resources set title=p_title,description=p_description,topic_id=p_topic,updated_at=now() where id=p_resource;
 insert into public.admin_audit_log(actor_id,action,target_id,details) values(actor,'material.organized',p_resource,jsonb_build_object('before',jsonb_build_object('title',r.title,'description',r.description,'topic_id',r.topic_id),'after',jsonb_build_object('title',p_title,'description',p_description,'topic_id',p_topic)));
end;$$;

create function public.admin_set_material_permissions(p_user uuid,p_publish boolean,p_organize boolean,p_reason text,p_confirm boolean) returns void language plpgsql security definer set search_path='' as $$declare actor uuid:=public.assert_admin();previous jsonb;begin
 if p_confirm is distinct from true or p_publish is null or p_organize is null or p_reason is null or length(trim(p_reason)) not between 4 and 1000 then raise exception 'confirmation and reason required';end if;
 if not exists(select 1 from public.account_states where user_id=p_user) or exists(select 1 from public.user_roles where user_id=p_user and role='admin') then raise exception 'student account required';end if;
 select to_jsonb(m) into previous from public.material_permissions m where user_id=p_user;
 insert into public.material_permissions(user_id,can_publish,can_organize,updated_by) values(p_user,p_publish,p_organize,actor) on conflict(user_id) do update set can_publish=excluded.can_publish,can_organize=excluded.can_organize,updated_by=actor,updated_at=now();
 insert into public.admin_audit_log(actor_id,action,target_id,details) values(actor,'material.permissions_changed',p_user,jsonb_build_object('before',previous,'can_publish',p_publish,'can_organize',p_organize,'reason',trim(p_reason)));
end;$$;
create function public.admin_set_publishing_mode(p_open boolean,p_reason text,p_confirm boolean) returns void language plpgsql security definer set search_path='' as $$declare actor uuid:=public.assert_admin();previous boolean;begin
 if p_confirm is distinct from true or p_open is null or p_reason is null or length(trim(p_reason)) not between 4 and 1000 then raise exception 'confirmation and reason required';end if;
 select open_to_all into previous from public.material_publishing_settings where singleton for update;
 update public.material_publishing_settings set open_to_all=p_open,updated_at=now(),updated_by=actor where singleton;
 if not found then raise exception 'publishing settings unavailable';end if;
 insert into public.admin_audit_log(actor_id,action,details) values(actor,'material.publishing_mode_changed',jsonb_build_object('before',previous,'open_to_all',p_open,'reason',trim(p_reason)));
end;$$;
revoke all on function public.admin_set_material_permissions(uuid,boolean,boolean,text,boolean),public.admin_set_publishing_mode(boolean,text,boolean) from public,anon,authenticated;
grant execute on function public.admin_set_material_permissions(uuid,boolean,boolean,text,boolean),public.admin_set_publishing_mode(boolean,text,boolean) to authenticated;

create function public.add_material_topic(p_course uuid,p_title text) returns uuid language plpgsql security definer set search_path='' as $$declare actor uuid:=public.require_actor('topic',30);topic uuid;begin
 if not elzatona_private.material_organizer(actor) then raise exception 'material organization restricted' using errcode='42501';end if;
 if p_title is null or length(trim(p_title)) not between 2 and 120 or not exists(select 1 from public.courses c join public.universities u on u.id=c.university_id where c.id=p_course and c.is_active and u.is_active) then raise exception 'invalid topic or course';end if;
 insert into public.topics(course_id,title,title_ar) values(p_course,trim(p_title),trim(p_title)) on conflict(course_id,title) do nothing returning id into topic;
 if topic is null then select id into topic from public.topics where course_id=p_course and title=trim(p_title);return topic;end if;
 insert into public.admin_audit_log(actor_id,action,target_id,details) values(actor,'material.topic_created',topic,jsonb_build_object('course_id',p_course,'title',trim(p_title)));
 return topic;
end;$$;
revoke all on function public.add_material_topic(uuid,text) from public,anon,authenticated;
grant execute on function public.add_material_topic(uuid,text) to authenticated;
create index material_permissions_updated_by_idx on public.material_permissions(updated_by);
create index material_settings_updated_by_idx on public.material_publishing_settings(updated_by);
