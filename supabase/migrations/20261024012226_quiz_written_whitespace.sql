-- Align exact-answer normalization with JavaScript trim()/\\s, including PDF copy whitespace.
create function elzatona_private.normalize_quiz_answer(v text) returns text language sql immutable strict set search_path='' as $$
 select lower(trim(regexp_replace(v,U&'[\0009\000a\000b\000c\000d\0020\00a0\1680\2000-\200a\2028\2029\202f\205f\3000\feff]+',' ','g')))
$$;
revoke all on function elzatona_private.normalize_quiz_answer(text) from public,anon,authenticated;
create or replace function public.grade_quiz(p_resource uuid,p_revision integer,p_answers jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$
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
    select exists(select 1 from jsonb_array_elements_text(q->'acceptedAnswers') t where elzatona_private.normalize_quiz_answer(t)=elzatona_private.normalize_quiz_answer(answer#>>'{}')) into correct;
   end if;
  end if;
  if correct then status:='correct';end if;
  item:=jsonb_build_object('id',q->>'id','type',q->>'type','status',status,'points',coalesce(q->'points','1'::jsonb),'explanation',coalesce(q->>'explanation',''));
  if q->>'type'='mcq' then item:=item||jsonb_build_object('correctOptionIds',q->'correctOptionIds');elsif q->>'type'='true_false' then item:=item||jsonb_build_object('answer',q->'answer');else item:=item||jsonb_build_object('modelAnswer',q->'modelAnswer','acceptedAnswers',coalesce(q->'acceptedAnswers','[]'::jsonb));end if;
  result:=result||jsonb_build_array(item);
 end loop;return result;
end;$$;
