-- Curriculum metadata is public catalogue information, never student enrollment.
alter table public.courses
  add column code_ar text check(length(code_ar)<=40),
  add column credit_hours smallint check(credit_hours between 1 and 6),
  add column prerequisite_note text check(length(prerequisite_note)<=1000),
  add column curriculum_source text check(length(curriculum_source)<=120);

create table public.course_requirements (
  course_id uuid not null references public.courses on delete cascade,
  scope text not null check(scope in ('general','faculty','cs','it','is','ai')),
  kind text not null check(kind in ('required','elective')),
  source_page smallint not null check(source_page > 0),
  primary key(course_id,scope)
);
alter table public.course_requirements enable row level security;
grant select on public.course_requirements to anon,authenticated;
create policy curriculum_read on public.course_requirements for select to anon,authenticated
using(exists(select 1 from public.courses c where c.id=course_id and c.is_active));
create index course_requirements_scope on public.course_requirements(scope,kind,course_id);

-- Additive and idempotent: selecting a group never toggles existing follows off.
-- The actor comes from the verified session, never a supplied student ID.
create function public.add_courses(p_courses uuid[]) returns integer
language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.require_actor('follow',60); added integer;
begin
  if p_courses is null or cardinality(p_courses) not between 1 and 100
     or array_position(p_courses,null) is not null then
    raise exception 'choose between 1 and 100 courses';
  end if;
  if exists(select 1 from unnest(p_courses) chosen(id)
    where not exists(select 1 from public.courses c where c.id=chosen.id and c.is_active)) then
    raise exception 'course unavailable';
  end if;
  with inserted as (
    insert into public.user_courses(user_id,course_id)
      select actor,id from (select distinct unnest(p_courses) as id) chosen
      on conflict(user_id,course_id) do nothing returning course_id
  ), events as (
    insert into public.product_events(event,actor_id,course_id)
      select 'course_followed',actor,course_id from inserted
  ) select count(*) into added from inserted;
  return added;
end;$$;
revoke all on function public.add_courses(uuid[]) from public,anon,authenticated;
grant execute on function public.add_courses(uuid[]) to authenticated;
