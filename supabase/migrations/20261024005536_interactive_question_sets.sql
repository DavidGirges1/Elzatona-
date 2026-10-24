-- Native question banks reuse resource attribution, moderation, voting and discussion.
alter table public.resources drop constraint resources_source_kind_check;
alter table public.resources add constraint resources_source_kind_check check(source_kind in('external','pdf','quiz'));
alter table public.resources drop constraint resources_check;
alter table public.resources add constraint resources_source_payload_check check(
 (source_kind='external' and external_url is not null and normalized_url is not null and storage_path is null and status<>'pending') or
 (source_kind='pdf' and external_url is null and normalized_url is null and storage_path is not null) or
 (source_kind='quiz' and type='question_bank' and external_url is null and normalized_url is null and storage_path is null));
alter table public.resources drop constraint resources_rights_confirmed_check;
alter table public.resources add constraint resources_rights_for_publication_check check(rights_confirmed or (source_kind='quiz' and status<>'published'));
create table public.quiz_sets (
 resource_id uuid primary key references public.resources on delete cascade,
 document jsonb not null,
 revision integer not null default 1 check(revision>0),
 updated_at timestamptz not null default now()
);
alter table public.quiz_sets enable row level security;
revoke all on public.quiz_sets from public,anon,authenticated;
grant select on public.quiz_sets to authenticated;
create policy quiz_author_admin_read on public.quiz_sets for select to authenticated using(exists(select 1 from public.resources r where r.id=resource_id and (r.author_id=(select auth.uid()) or (select public.is_admin()))));

create function elzatona_private.assert_quiz_document(d jsonb,publish boolean) returns void language plpgsql immutable set search_path='' as $$
declare q jsonb;o jsonb;v jsonb;ids text[]:=array[]::text[];opts text[];keys text[];n numeric;begin
 if jsonb_typeof(d) is distinct from 'object' or octet_length(d::text)>262144 or d->>'format' is distinct from 'elzatona.quiz' or d->'version' is distinct from '1'::jsonb then raise exception 'invalid quiz format or size';end if;
 if exists(select 1 from jsonb_object_keys(d) k where k not in('format','version','title','description','language','aiAssisted','questions')) then raise exception 'unsupported quiz fields';end if;
 if jsonb_typeof(d->'title') is distinct from 'string' or length(trim(d->>'title')) not between 4 and 160 or length(coalesce(d->>'description',''))>2000 or coalesce(d->>'language','mixed') not in('ar','en','mixed') or (d ? 'aiAssisted' and jsonb_typeof(d->'aiAssisted')<>'boolean') then raise exception 'invalid quiz metadata';end if;
 if (d ? 'description' and jsonb_typeof(d->'description')<>'string') or (d ? 'language' and jsonb_typeof(d->'language')<>'string') then raise exception 'invalid quiz metadata types';end if;
 if jsonb_typeof(d->'questions') is distinct from 'array' then raise exception 'questions array required';end if;
 if jsonb_array_length(d->'questions') not between 1 and 100 then raise exception 'quiz needs 1 to 100 questions';end if;
 for q in select value from jsonb_array_elements(d->'questions') loop
  if jsonb_typeof(q) is distinct from 'object' or jsonb_typeof(q->'id') is distinct from 'string' or (q->>'id') !~ '^[A-Za-z0-9_-]{1,64}$' or (q->>'id')=any(ids) then raise exception 'invalid or duplicate question id';end if;ids:=array_append(ids,q->>'id');
  if jsonb_typeof(q->'prompt') is distinct from 'string' or length(q->>'prompt')>3000 or (publish and length(trim(q->>'prompt'))=0) or length(coalesce(q->>'explanation',''))>2000 or length(coalesce(q->>'source',''))>500 then raise exception 'invalid question text';end if;
  if (q ? 'explanation' and jsonb_typeof(q->'explanation')<>'string') or (q ? 'source' and jsonb_typeof(q->'source')<>'string') or (q ? 'points' and jsonb_typeof(q->'points')<>'number') then raise exception 'invalid question metadata';end if;
  n:=coalesce((q->>'points')::numeric,1);if n not between 1 and 10 or n<>trunc(n) then raise exception 'invalid points';end if;
  if q->>'type'='mcq' then
   keys:=array['id','type','prompt','explanation','points','source','options','correctOptionIds'];
   if jsonb_typeof(q->'options') is distinct from 'array' then raise exception 'options required';end if;
   if jsonb_array_length(q->'options') not between 2 and 8 then raise exception 'invalid option count';end if;opts:=array[]::text[];
   for o in select value from jsonb_array_elements(q->'options') loop
    if jsonb_typeof(o) is distinct from 'object' or exists(select 1 from jsonb_object_keys(o) k where k not in('id','text')) or jsonb_typeof(o->'id') is distinct from 'string' or (o->>'id') !~ '^[A-Za-z0-9_-]{1,64}$' or (o->>'id')=any(opts) or jsonb_typeof(o->'text') is distinct from 'string' or length(o->>'text')>500 or (publish and length(trim(o->>'text'))=0) then raise exception 'invalid option';end if;opts:=array_append(opts,o->>'id');
   end loop;
   if not q ? 'correctOptionIds' or jsonb_typeof(q->'correctOptionIds') not in('array','null') then raise exception 'invalid MCQ key';end if;
   if publish and (q->'correctOptionIds'='null'::jsonb or jsonb_array_length(q->'correctOptionIds')=0) then raise exception 'answer key required';end if;
   if jsonb_typeof(q->'correctOptionIds')='array' then
    if jsonb_array_length(q->'correctOptionIds')>8 or (select count(*)<>count(distinct value) from jsonb_array_elements(q->'correctOptionIds')) then raise exception 'invalid MCQ keys';end if;
    for v in select value from jsonb_array_elements(q->'correctOptionIds') loop if jsonb_typeof(v)<>'string' or not (v#>>'{}')=any(opts) then raise exception 'answer option missing';end if;end loop;
   end if;
  elsif q->>'type'='true_false' then
   keys:=array['id','type','prompt','explanation','points','source','answer'];
   if not q ? 'answer' or jsonb_typeof(q->'answer') not in('boolean','null') or (publish and q->'answer'='null'::jsonb) then raise exception 'true/false key required';end if;
  elsif q->>'type'='written' then
   keys:=array['id','type','prompt','explanation','points','source','grading','modelAnswer','acceptedAnswers'];
   if q ? 'grading' and jsonb_typeof(q->'grading')<>'string' then raise exception 'invalid grading type';end if;
   if coalesce(q->>'grading','self') not in('self','exact') or jsonb_typeof(q->'modelAnswer') is distinct from 'string' or length(q->>'modelAnswer')>3000 or (publish and length(trim(q->>'modelAnswer'))=0) then raise exception 'written model answer required';end if;
   if q ? 'acceptedAnswers' then
    if jsonb_typeof(q->'acceptedAnswers')<>'array' or jsonb_array_length(q->'acceptedAnswers')>20 then raise exception 'invalid accepted answers';end if;
    for v in select value from jsonb_array_elements(q->'acceptedAnswers') loop if jsonb_typeof(v)<>'string' or length(trim(v#>>'{}')) not between 1 and 500 then raise exception 'invalid accepted answer';end if;end loop;
   end if;
   if publish and q->>'grading'='exact' and jsonb_array_length(coalesce(q->'acceptedAnswers','[]'))=0 then raise exception 'accepted answers required';end if;
  else raise exception 'unsupported question type';end if;
  if exists(select 1 from jsonb_object_keys(q) k where not k=any(keys)) then raise exception 'unsupported question fields';end if;
 end loop;
end;$$;
revoke all on function elzatona_private.assert_quiz_document(jsonb,boolean) from public,anon,authenticated;

create function elzatona_private.guard_quiz_publication() returns trigger language plpgsql security definer set search_path='' as $$declare d jsonb;begin
 if new.source_kind='quiz' and new.status='published' then
  if TG_OP='INSERT' or old.status is distinct from new.status then
   select document into d from public.quiz_sets where resource_id=new.id;
   if d is null or not new.rights_confirmed then raise exception 'quiz not ready for publication';end if;
   perform elzatona_private.assert_quiz_document(d,true);
  end if;
 end if;return new;
end;$$;
revoke all on function elzatona_private.guard_quiz_publication() from public,anon,authenticated;
create trigger quiz_publication_guard before insert or update on public.resources for each row execute function elzatona_private.guard_quiz_publication();

create function public.save_quiz(p_course uuid,p_topic uuid,p_document jsonb,p_resource uuid default null,p_publish boolean default false,p_rights boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.require_actor('quiz_draft',30);r public.resources;rid uuid:=coalesce(p_resource,gen_random_uuid());begin
 if p_publish is null or p_rights is null then raise exception 'invalid publication request';end if;
 if not exists(select 1 from public.courses c join public.universities u on u.id=c.university_id where c.id=p_course and c.is_active and u.is_active) then raise exception 'course unavailable';end if;
 if p_resource is not null then
  select * into r from public.resources where id=p_resource for update;
  if not found or r.course_id<>p_course or r.source_kind<>'quiz' or r.status='hidden' or (r.author_id<>actor and not public.is_admin()) then raise exception 'not authorized' using errcode='42501';end if;
  if r.status='published' and not p_publish then raise exception 'published changes require publication';end if;
 end if;
 if p_publish and (not elzatona_private.material_publisher(actor) or not p_rights) then raise exception 'material publishing restricted or rights missing' using errcode='42501';end if;
 perform elzatona_private.assert_quiz_document(p_document,p_publish);
 if p_resource is null then
  insert into public.resources(id,course_id,topic_id,author_id,title,description,type,source_kind,rights_confirmed,is_ai_assisted,status) values(rid,p_course,p_topic,actor,trim(p_document->>'title'),coalesce(p_document->>'description',''),'question_bank','quiz',p_rights,coalesce((p_document->>'aiAssisted')::boolean,false),'pending');
 else
  update public.resources set topic_id=p_topic,title=trim(p_document->>'title'),description=coalesce(p_document->>'description',''),is_ai_assisted=coalesce((p_document->>'aiAssisted')::boolean,false),rights_confirmed=rights_confirmed or p_rights,updated_at=now() where id=rid;
 end if;
 insert into public.quiz_sets(resource_id,document) values(rid,p_document) on conflict(resource_id) do update set document=excluded.document,revision=public.quiz_sets.revision+1,updated_at=now();
 if p_publish then
  update public.resources set status='published' where id=rid;
  if p_resource is null or r.status<>'published' then insert into public.product_events(event,actor_id,course_id,resource_id) values('resource_submitted',actor,p_course,rid);end if;
 end if;
 insert into public.admin_audit_log(actor_id,action,target_id,details) values(actor,case when p_publish then 'quiz.published' else 'quiz.draft_saved' end,rid,jsonb_build_object('questions',jsonb_array_length(p_document->'questions')));
 return rid;
end;$$;
revoke all on function public.save_quiz(uuid,uuid,jsonb,uuid,boolean,boolean) from public,anon,authenticated;
grant execute on function public.save_quiz(uuid,uuid,jsonb,uuid,boolean,boolean) to authenticated;

create function public.read_quiz(p_resource uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('resourceId',r.id,'revision',s.revision,'title',r.title,'description',coalesce(r.description,''),'questions',(
  select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',q->'id','type',q->'type','prompt',q->'prompt','points',coalesce(q->'points','1'::jsonb),'source',coalesce(q->'source','""'::jsonb),'options',q->'options','multiple',case when q->>'type'='mcq' then jsonb_array_length(q->'correctOptionIds')>1 else null end,'grading',case when q->>'type'='written' then coalesce(q->>'grading','self') else null end)) order by n) from jsonb_array_elements(s.document->'questions') with ordinality x(q,n)))
 from public.resources r join public.quiz_sets s on s.resource_id=r.id join public.courses c on c.id=r.course_id join public.universities u on u.id=c.university_id
 where r.id=p_resource and r.status='published' and c.is_active and u.is_active
$$;
create function public.export_quiz(p_resource uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select s.document||jsonb_build_object('title',r.title,'description',coalesce(r.description,'')) from public.resources r join public.quiz_sets s on s.resource_id=r.id join public.courses c on c.id=r.course_id join public.universities u on u.id=c.university_id where r.id=p_resource and r.status='published' and c.is_active and u.is_active
$$;
create function public.grade_quiz(p_resource uuid,p_revision integer,p_answers jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare d jsonb;rev integer;a jsonb;q jsonb;v jsonb;answer jsonb;correct boolean;status text;result jsonb:='[]'::jsonb;item jsonb;ids text[]:=array[]::text[];begin
 select s.document,s.revision into d,rev from public.resources r join public.quiz_sets s on s.resource_id=r.id join public.courses c on c.id=r.course_id join public.universities u on u.id=c.university_id where r.id=p_resource and r.status='published' and c.is_active and u.is_active;
 if d is null then raise exception 'quiz unavailable' using errcode='42501';end if;
 if rev is distinct from p_revision then raise exception 'quiz revision changed' using errcode='40001';end if;
 if jsonb_typeof(p_answers) is distinct from 'array' or octet_length(p_answers::text)>400000 then raise exception 'invalid answers';end if;
 if jsonb_array_length(p_answers) not between 1 and 100 then raise exception 'invalid answer count';end if;
 for a in select value from jsonb_array_elements(p_answers) loop
  if jsonb_typeof(a) is distinct from 'object' or not a ? 'answer' or a->>'id' is null or (a->>'id')=any(ids) then raise exception 'invalid or duplicate answer';end if;ids:=array_append(ids,a->>'id');
  select value into q from jsonb_array_elements(d->'questions') where value->>'id'=a->>'id';if q is null then raise exception 'unknown question';end if;
  answer:=a->'answer';correct:=false;status:='incorrect';
  if answer='null'::jsonb or answer='""'::jsonb or answer='[]'::jsonb or (jsonb_typeof(answer)='string' and length(trim(answer#>>'{}'))=0) then status:='unanswered';
  elsif q->>'type'='mcq' then
   if jsonb_typeof(answer)<>'array' or jsonb_array_length(answer)>8 or (select count(*)<>count(distinct value) from jsonb_array_elements(answer)) then raise exception 'invalid selections';end if;
   for v in select value from jsonb_array_elements(answer) loop if jsonb_typeof(v)<>'string' or not exists(select 1 from jsonb_array_elements(q->'options') o where o->'id'=v) then raise exception 'unknown option';end if;end loop;
   correct:=(q->'correctOptionIds') @> answer and jsonb_array_length(answer)=jsonb_array_length(q->'correctOptionIds');
  elsif q->>'type'='true_false' then
   if jsonb_typeof(answer)<>'boolean' then raise exception 'boolean answer required';end if;correct:=answer=q->'answer';
  else
   if jsonb_typeof(answer)<>'string' or length(answer#>>'{}')>3000 then raise exception 'written answer required';end if;
   if coalesce(q->>'grading','self')='self' then status:='self';else
    select exists(select 1 from jsonb_array_elements_text(q->'acceptedAnswers') t where lower(regexp_replace(trim(t),'\s+',' ','g'))=lower(regexp_replace(trim(answer#>>'{}'),'\s+',' ','g'))) into correct;
   end if;
  end if;
  if correct then status:='correct';end if;
  item:=jsonb_build_object('id',q->>'id','type',q->>'type','status',status,'points',coalesce(q->'points','1'::jsonb),'explanation',coalesce(q->>'explanation',''));
  if q->>'type'='mcq' then item:=item||jsonb_build_object('correctOptionIds',q->'correctOptionIds');elsif q->>'type'='true_false' then item:=item||jsonb_build_object('answer',q->'answer');else item:=item||jsonb_build_object('modelAnswer',q->'modelAnswer','acceptedAnswers',coalesce(q->'acceptedAnswers','[]'::jsonb));end if;
  result:=result||jsonb_build_array(item);
 end loop;return result;
end;$$;
revoke all on function public.read_quiz(uuid),public.export_quiz(uuid),public.grade_quiz(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.read_quiz(uuid),public.export_quiz(uuid),public.grade_quiz(uuid,integer,jsonb) to anon,authenticated;
