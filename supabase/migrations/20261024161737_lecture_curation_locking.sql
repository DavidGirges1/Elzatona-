-- Serialize a recommendation with hiding/replacement of its source. Authorization
-- stays in the caller-bound RPC; this trigger also protects owner-side maintenance.
create function elzatona_private.check_lecture_main() returns trigger language plpgsql security definer set search_path='' as $$declare r public.resources;begin
 if new.is_main then
  select * into r from public.resources where id=new.resource_id for share;
  if not found or r.status<>'published' or r.area<>'lecture' or r.course_id<>new.course_id or r.type not in('video','slides','notes','reference','other') then raise exception 'main must be published study material in this lecture';end if;
 end if;return new;
end;$$;
revoke all on function elzatona_private.check_lecture_main() from public,anon,authenticated;
create trigger lecture_main_integrity before insert or update on public.resource_lectures for each row execute function elzatona_private.check_lecture_main();
