-- Lecture-first placement. Legacy operations remain owner-only during cutover.
create table public.material_maintenance(singleton boolean primary key default true check(singleton),paused boolean not null default false);
insert into public.material_maintenance values(true,false);
alter table public.material_maintenance enable row level security;
revoke all on public.material_maintenance from public,anon,authenticated;
create function public.material_writes_open() returns boolean language sql stable security definer set search_path='' as $$select not paused from public.material_maintenance where singleton$$;
revoke all on function public.material_writes_open() from public,anon,authenticated;
grant execute on function public.material_writes_open() to anon,authenticated;
create function elzatona_private.assert_material_open() returns void language plpgsql set search_path='' as $$begin
 -- Shared transaction lock drains all in-flight writes before the reset's exclusive lock.
 perform pg_advisory_xact_lock_shared(20261024,1603);
 if not public.material_writes_open() then raise exception 'material maintenance; try again later' using errcode='55000';end if;
end;$$;
revoke all on function elzatona_private.assert_material_open() from public,anon,authenticated;
create table public.lectures(
 id uuid primary key default gen_random_uuid(),course_id uuid not null references public.courses on delete cascade,
 number integer not null check(number between 1 and 999),title text not null default '' check(length(title)<=120),
 unique(course_id,number),unique(id,course_id)
);
create index lectures_course_idx on public.lectures(course_id,number);
alter table public.lectures enable row level security;
revoke all on public.lectures from public,anon,authenticated;
grant select on public.lectures to anon,authenticated;
create policy lectures_read on public.lectures for select using(exists(select 1 from public.courses c where c.id=course_id));
alter table public.resources add column area text not null default 'general' check(area in('lecture','general','revision','sections'));
create table public.resource_lectures(
 resource_id uuid not null,lecture_id uuid not null,course_id uuid not null,
 is_main boolean not null default false,
 primary key(resource_id,lecture_id),
 foreign key(resource_id,course_id) references public.resources(id,course_id) on delete cascade,
 foreign key(lecture_id,course_id) references public.lectures(id,course_id)
);
create unique index lecture_one_main on public.resource_lectures(lecture_id) where is_main;
create index resource_lectures_lecture_idx on public.resource_lectures(lecture_id,resource_id);
create index resource_lectures_course_idx on public.resource_lectures(course_id);
alter table public.resource_lectures enable row level security;
revoke all on public.resource_lectures from public,anon,authenticated;
grant select on public.resource_lectures to anon,authenticated;
create policy resource_lectures_read on public.resource_lectures for select using(exists(select 1 from public.resources r where r.id=resource_id));
alter table public.discussions add column lecture_id uuid;
alter table public.discussions add foreign key(lecture_id,course_id) references public.lectures(id,course_id);
create index discussions_lecture_idx on public.discussions(lecture_id) where lecture_id is not null;
create index resources_area_idx on public.resources(course_id,area,status,created_at desc);
create function elzatona_private.assert_placement(p_course uuid,p_area text,p_lectures uuid[],p_type text) returns void language plpgsql set search_path='' as $$begin
 if p_area is null or p_area not in('lecture','general','revision','sections') or p_lectures is null or cardinality(p_lectures)>100 or cardinality(p_lectures)<>(select count(distinct x) from unnest(p_lectures)x) then raise exception 'placement required';end if;
 if (p_area='lecture')<>(cardinality(p_lectures)>0) then raise exception 'lecture placement requires lectures; other areas cannot have lectures';end if;
 if exists(select 1 from unnest(p_lectures)x where not exists(select 1 from public.lectures l where l.id=x and l.course_id=p_course)) then raise exception 'lecture outside course';end if;
 if p_type is null or (case p_area
 when 'sections' then p_type<>'sections'
 when 'general' then p_type not in('video','slides','notes','reference','other')
 when 'lecture' then p_type not in('video','slides','notes','reference','other','sheets','question_bank')
 else p_type='sections' end) then raise exception 'type incompatible with placement';end if;
end;$$;
create function elzatona_private.place_resource(p_resource uuid,p_area text,p_lectures uuid[]) returns void language plpgsql set search_path='' as $$declare r public.resources;begin
 select * into r from public.resources where id=p_resource for update;
 if not found then raise exception 'resource unavailable';end if;
 perform elzatona_private.assert_placement(r.course_id,p_area,p_lectures,r.type);
 delete from public.resource_lectures where resource_id=r.id and not(lecture_id=any(p_lectures));
 update public.resources set area=p_area,topic_id=null where id=r.id;
 insert into public.resource_lectures(resource_id,lecture_id,course_id) select r.id,x,r.course_id from unnest(p_lectures)x on conflict do nothing;
end;$$;
revoke all on function elzatona_private.assert_placement(uuid,text,uuid[],text),elzatona_private.place_resource(uuid,text,uuid[]) from public,anon,authenticated;
create function public.save_lecture(p_course uuid,p_number integer,p_title text,p_id uuid default null) returns uuid language plpgsql security definer set search_path='' as $$declare actor uuid:=public.require_actor('lecture',60);rid uuid;begin
 perform elzatona_private.assert_material_open();
 if not elzatona_private.course_organizer(actor,p_course) then raise exception 'course organization restricted' using errcode='42501';end if;
 if p_number is null or p_number not between 1 and 999 or p_title is null or length(trim(p_title))>120 then raise exception 'invalid lecture';end if;
 if p_id is null then insert into public.lectures(course_id,number,title)values(p_course,p_number,trim(p_title)) returning id into rid;
 else update public.lectures set number=p_number,title=trim(p_title) where id=p_id and course_id=p_course returning id into rid;
 if rid is null then raise exception 'lecture unavailable';end if;end if;
 insert into public.admin_audit_log(actor_id,action,target_id,details)values(actor,'lecture.saved',rid,jsonb_build_object('course_id',p_course,'number',p_number,'title',p_title));return rid;
end;$$;
create function public.delete_lecture(p_id uuid) returns void language plpgsql security definer set search_path='' as $$declare actor uuid:=public.require_actor('lecture',60);c uuid;begin
 perform elzatona_private.assert_material_open();select course_id into c from public.lectures where id=p_id for update;
 if c is null or not elzatona_private.course_organizer(actor,c) then raise exception 'course organization restricted' using errcode='42501';end if;
 if exists(select 1 from public.resource_lectures where lecture_id=p_id) then raise exception 'move materials before deleting lecture';end if;
 update public.discussions set lecture_id=null where lecture_id=p_id;
 delete from public.lectures where id=p_id;
 insert into public.admin_audit_log(actor_id,action,target_id,details)values(actor,'lecture.deleted',p_id,jsonb_build_object('course_id',c));
end;$$;
-- Old public signatures are retired, so no caller can bypass required placement.
alter function public.submit_resource(uuid,uuid,text,text,text,text,boolean,boolean) set schema elzatona_private;
revoke all on function elzatona_private.submit_resource(uuid,uuid,text,text,text,text,boolean,boolean) from public,anon,authenticated;
alter function public.prepare_pdf(uuid,uuid,text,text,text,boolean,boolean) set schema elzatona_private;
revoke all on function elzatona_private.prepare_pdf(uuid,uuid,text,text,text,boolean,boolean) from public,anon,authenticated;
alter function public.save_quiz(uuid,uuid,jsonb,uuid,boolean,boolean) set schema elzatona_private;
revoke all on function elzatona_private.save_quiz(uuid,uuid,jsonb,uuid,boolean,boolean) from public,anon,authenticated;
alter function public.edit_resource(uuid,text,text,uuid) set schema elzatona_private;
revoke all on function elzatona_private.edit_resource(uuid,text,text,uuid) from public,anon,authenticated;
alter function public.edit_proposed_resource(uuid,text,text,uuid,text) set schema elzatona_private;
revoke all on function elzatona_private.edit_proposed_resource(uuid,text,text,uuid,text) from public,anon,authenticated;
alter function public.review_material(uuid,integer,text,text) set schema elzatona_private;
revoke all on function elzatona_private.review_material(uuid,integer,text,text) from public,anon,authenticated;
revoke all on function public.add_material_topic(uuid,text),public.organize_topic(uuid,text,integer) from public,anon,authenticated;
create function public.submit_material(p_course uuid,p_area text,p_lectures uuid[],p_title text,p_description text,p_type text,p_url text,p_rights boolean,p_ai boolean default false) returns uuid language plpgsql security definer set search_path='' as $$declare rid uuid;existing uuid;begin
 perform elzatona_private.assert_material_open();perform elzatona_private.assert_placement(p_course,p_area,p_lectures,p_type);
 perform pg_advisory_xact_lock(hashtextextended(p_course::text||p_url,0));
 select id into existing from public.resources where course_id=p_course and normalized_url=p_url and status<>'hidden';
 rid:=elzatona_private.submit_resource(p_course,null,p_title,p_description,p_type,p_url,p_rights,p_ai);
 -- Duplicate URLs keep their original placement and attribution.
 if existing is null then perform elzatona_private.place_resource(rid,p_area,p_lectures);end if;
 return rid;
end;$$;
create function public.prepare_material_pdf(p_course uuid,p_area text,p_lectures uuid[],p_title text,p_description text,p_type text,p_rights boolean,p_ai boolean default false) returns uuid language plpgsql security definer set search_path='' as $$declare rid uuid;begin
 perform elzatona_private.assert_material_open();perform elzatona_private.assert_placement(p_course,p_area,p_lectures,p_type);
 rid:=elzatona_private.prepare_pdf(p_course,null,p_title,p_description,p_type,p_rights,p_ai);
 perform elzatona_private.place_resource(rid,p_area,p_lectures);return rid;
end;$$;
create function public.save_material_quiz(p_course uuid,p_area text,p_lectures uuid[],p_document jsonb,p_resource uuid default null,p_publish boolean default false,p_rights boolean default false) returns uuid language plpgsql security definer set search_path='' as $$declare rid uuid;begin
 perform elzatona_private.assert_material_open();perform elzatona_private.assert_placement(p_course,p_area,p_lectures,'question_bank');
 -- General and sections fail placement even for a private draft.
 rid:=elzatona_private.save_quiz(p_course,null,p_document,p_resource,p_publish,p_rights);
 perform elzatona_private.place_resource(rid,p_area,p_lectures);return rid;
end;$$;
create function public.edit_material(p_resource uuid,p_title text,p_description text,p_area text,p_lectures uuid[]) returns void language plpgsql security definer set search_path='' as $$begin
 perform elzatona_private.assert_material_open();perform elzatona_private.edit_resource(p_resource,p_title,p_description,null);
 perform elzatona_private.place_resource(p_resource,p_area,p_lectures);
 update public.resources set submission_version=submission_version+1 where id=p_resource;
end;$$;
create function public.edit_proposed_material(p_resource uuid,p_title text,p_description text,p_area text,p_lectures uuid[],p_url text) returns void language plpgsql security definer set search_path='' as $$begin
 perform elzatona_private.assert_material_open();perform elzatona_private.edit_proposed_resource(p_resource,p_title,p_description,null,p_url);
 perform elzatona_private.place_resource(p_resource,p_area,p_lectures);
end;$$;
create function public.review_placed_material(p_resource uuid,p_version integer,p_decision text,p_reason text,p_area text,p_lectures uuid[]) returns void language plpgsql security definer set search_path='' as $$declare r public.resources;v integer;changed boolean;begin
 perform elzatona_private.assert_material_open();
 select * into r from public.resources where id=p_resource for update;
 if not found or not public.can_review_material(p_resource) then raise exception 'not authorized' using errcode='42501';end if;
 if r.submission_version is distinct from p_version then raise exception 'submission changed; reload before reviewing' using errcode='40001';end if;
 perform elzatona_private.assert_placement(r.course_id,p_area,p_lectures,r.type);
 changed:=r.area<>p_area or (select coalesce(array_agg(lecture_id order by lecture_id),array[]::uuid[]) from public.resource_lectures where resource_id=r.id)<>(select coalesce(array_agg(x order by x),array[]::uuid[]) from unnest(p_lectures)x);
 perform elzatona_private.place_resource(r.id,p_area,p_lectures);
 v:=r.submission_version+case when changed then 1 else 0 end;
 update public.resources set submission_version=v where id=r.id;
 perform elzatona_private.review_material(r.id,v,p_decision,p_reason);
end;$$;
create function public.set_lecture_main(p_lecture uuid,p_resource uuid default null) returns void language plpgsql security definer set search_path='' as $$declare actor uuid:=public.require_actor('lecture_main',60);c uuid;begin
 perform elzatona_private.assert_material_open();select course_id into c from public.lectures where id=p_lecture for update;
 if c is null or not elzatona_private.course_organizer(actor,c) then raise exception 'course organization restricted' using errcode='42501';end if;
 if p_resource is not null and not exists(select 1 from public.resource_lectures rl join public.resources r on r.id=rl.resource_id where rl.lecture_id=p_lecture and r.id=p_resource and r.status='published' and r.area='lecture' and r.type in('video','slides','notes','reference','other')) then raise exception 'main must be published study material in this lecture';end if;
 update public.resource_lectures set is_main=false where lecture_id=p_lecture and is_main;
 if p_resource is not null then update public.resource_lectures set is_main=true where lecture_id=p_lecture and resource_id=p_resource;end if;
 insert into public.admin_audit_log(actor_id,action,target_id,details)values(actor,'lecture.main_selected',p_lecture,jsonb_build_object('resource_id',p_resource));
end;$$;
-- Hidden/moved/recategorized content cannot remain a recommendation.
create function elzatona_private.clear_invalid_main() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.status<>'published' or new.area<>'lecture' or new.type not in('video','slides','notes','reference','other') then update public.resource_lectures set is_main=false where resource_id=new.id and is_main;end if;return new;
end;$$;
create trigger clear_invalid_main after update of status,area,type on public.resources for each row execute function elzatona_private.clear_invalid_main();
revoke all on function elzatona_private.clear_invalid_main() from public,anon,authenticated;
-- Guard ALL material writes, including service finalization and raw Storage inserts.
create function elzatona_private.guard_material_write() returns trigger language plpgsql security definer set search_path='' as $$begin
 perform elzatona_private.assert_material_open();if tg_op='DELETE' then return old;else return new;end if;
end;$$;
revoke all on function elzatona_private.guard_material_write() from public,anon,authenticated;
create trigger material_write_guard before insert or update or delete on public.resources for each statement execute function elzatona_private.guard_material_write();
create trigger lecture_write_guard before insert or update or delete on public.lectures for each statement execute function elzatona_private.guard_material_write();
create trigger association_write_guard before insert or update or delete on public.resource_lectures for each statement execute function elzatona_private.guard_material_write();
-- INSERT's storage transaction shares the same gate lock; deletions stay available to the reset operator.
create function elzatona_private.guard_material_storage() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.bucket_id='course-pdfs' then perform elzatona_private.assert_material_open();end if;return new;
end;$$;
revoke all on function elzatona_private.guard_material_storage() from public,anon,authenticated;
create trigger material_storage_gate before insert or update on storage.objects for each row execute function elzatona_private.guard_material_storage();
create function public.ask_lecture_question(p_course uuid,p_resource uuid,p_lecture uuid,p_title text,p_body text) returns uuid language plpgsql security definer set search_path='' as $$declare rid uuid;begin
 if p_lecture is not null and not exists(select 1 from public.lectures where id=p_lecture and course_id=p_course) then raise exception 'invalid lecture context';end if;
 rid:=public.ask_question(p_course,p_resource,p_title,p_body);
 update public.discussions set lecture_id=p_lecture where id=rid;return rid;
end;$$;
-- Append placement context to the existing card interface; one row per material.
create or replace view public.resource_cards with(security_invoker=true) as
 select r.id,r.course_id,r.topic_id,r.author_id,r.title,r.description,r.type,r.source_kind,r.external_url,r.is_ai_assisted,r.created_at,r.status,r.score,p.display_name author_name,
 coalesce((select string_agg('المحاضرة '||l.number::text||case when l.title='' then '' else ' · '||l.title end,' / ' order by l.number) from public.resource_lectures rl join public.lectures l on l.id=rl.lecture_id where rl.resource_id=r.id),case r.area when 'general' then 'ملفات المادة' when 'revision' then 'المراجعة والامتحانات' when 'sections' then 'السكاشن واللابات' end) topic_title,
 c.slug course_slug,coalesce(c.title_ar,c.title) course_title,r.area,
 coalesce((select array_agg(rl.lecture_id order by l.number) from public.resource_lectures rl join public.lectures l on l.id=rl.lecture_id where rl.resource_id=r.id),array[]::uuid[]) lecture_ids
 from public.resources r join public.courses c on c.id=r.course_id join public.profiles p on p.id=r.author_id;
revoke all on function public.save_lecture(uuid,integer,text,uuid) from public,anon,authenticated;
grant execute on function public.save_lecture(uuid,integer,text,uuid) to authenticated;
revoke all on function public.delete_lecture(uuid) from public,anon,authenticated;
grant execute on function public.delete_lecture(uuid) to authenticated;
revoke all on function public.submit_material(uuid,text,uuid[],text,text,text,text,boolean,boolean) from public,anon,authenticated;
grant execute on function public.submit_material(uuid,text,uuid[],text,text,text,text,boolean,boolean) to authenticated;
revoke all on function public.prepare_material_pdf(uuid,text,uuid[],text,text,text,boolean,boolean) from public,anon,authenticated;
grant execute on function public.prepare_material_pdf(uuid,text,uuid[],text,text,text,boolean,boolean) to authenticated;
revoke all on function public.save_material_quiz(uuid,text,uuid[],jsonb,uuid,boolean,boolean) from public,anon,authenticated;
grant execute on function public.save_material_quiz(uuid,text,uuid[],jsonb,uuid,boolean,boolean) to authenticated;
revoke all on function public.edit_material(uuid,text,text,text,uuid[]) from public,anon,authenticated;
grant execute on function public.edit_material(uuid,text,text,text,uuid[]) to authenticated;
revoke all on function public.edit_proposed_material(uuid,text,text,text,uuid[],text) from public,anon,authenticated;
grant execute on function public.edit_proposed_material(uuid,text,text,text,uuid[],text) to authenticated;
revoke all on function public.review_placed_material(uuid,integer,text,text,text,uuid[]) from public,anon,authenticated;
grant execute on function public.review_placed_material(uuid,integer,text,text,text,uuid[]) to authenticated;
revoke all on function public.set_lecture_main(uuid,uuid) from public,anon,authenticated;
grant execute on function public.set_lecture_main(uuid,uuid) to authenticated;
revoke all on function public.ask_lecture_question(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.ask_lecture_question(uuid,uuid,uuid,text,text) to authenticated;
-- Validate the final state of the whole transaction, including quiz drafts and joins.
-- Existing obsolete rows are not reclassified; they are removed by the bounded reset.
create function elzatona_private.check_final_placement() returns trigger language plpgsql security definer set search_path='' as $$declare rid uuid;r public.resources;ids uuid[];begin
 if tg_table_name='resources' then rid:=coalesce(new.id,old.id);else rid:=coalesce(new.resource_id,old.resource_id);end if;
 select * into r from public.resources where id=rid;if not found then return null;end if;
 select coalesce(array_agg(lecture_id),array[]::uuid[]) into ids from public.resource_lectures where resource_id=rid;
 perform elzatona_private.assert_placement(r.course_id,r.area,ids,r.type);return null;
end;$$;
revoke all on function elzatona_private.check_final_placement() from public,anon,authenticated;
create constraint trigger resource_final_placement after insert or update on public.resources deferrable initially deferred for each row execute function elzatona_private.check_final_placement();
create constraint trigger association_final_placement after insert or update or delete on public.resource_lectures deferrable initially deferred for each row execute function elzatona_private.check_final_placement();
