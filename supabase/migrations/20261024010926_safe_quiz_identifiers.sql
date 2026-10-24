-- Imported identifiers must not collide with JavaScript object prototype keys.
create function elzatona_private.guard_quiz_identifiers() returns trigger language plpgsql set search_path='' as $$
declare ids text[]:=array['__proto__','constructor','__defineGetter__','__defineSetter__','hasOwnProperty','__lookupGetter__','__lookupSetter__','isPrototypeOf','propertyIsEnumerable','toString','valueOf','toLocaleString','prototype'];q jsonb;o jsonb;begin
 for q in select value from jsonb_array_elements(new.document->'questions') loop
  if (q->>'id')=any(ids) then raise exception 'reserved quiz identifier';end if;
  if q->>'type'='mcq' then
   for o in select value from jsonb_array_elements(q->'options') loop
    if (o->>'id')=any(ids) then raise exception 'reserved option identifier';end if;
   end loop;
  end if;
 end loop;return new;
end;$$;
revoke all on function elzatona_private.guard_quiz_identifiers() from public,anon,authenticated;
create trigger quiz_identifiers_guard before insert or update of document on public.quiz_sets for each row execute function elzatona_private.guard_quiz_identifiers();
