-- Reviewers inspect keys; only the author edits them.
create or replace function public.save_material_quiz(p_course uuid,p_area text,p_lectures uuid[],p_document jsonb,p_resource uuid default null,p_publish boolean default false,p_rights boolean default false) returns uuid language plpgsql security definer set search_path='' as $$declare rid uuid;begin
 perform elzatona_private.assert_material_open();
 if p_resource is not null and exists(select 1 from public.resources where id=p_resource and author_id is distinct from auth.uid()) then raise exception 'only author can edit quiz answers' using errcode='42501';end if;perform elzatona_private.assert_placement(p_course,p_area,p_lectures,'question_bank');
 -- General and sections fail placement even for a private draft.
 rid:=elzatona_private.save_quiz(p_course,null,p_document,p_resource,p_publish,p_rights);
 perform elzatona_private.place_resource(rid,p_area,p_lectures);return rid;
end;$$;
