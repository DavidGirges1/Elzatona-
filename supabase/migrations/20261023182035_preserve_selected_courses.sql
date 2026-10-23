-- Keep explicitly selected course groups when a student edits their academic year or faculty.
create or replace function public.set_academic_context(p_university uuid,p_faculty uuid default null,p_year integer default null) returns void language plpgsql security definer set search_path='' as $$declare actor uuid:=public.require_actor('onboarding',60);begin
 if not exists(select 1 from public.universities where id=p_university and is_active and onboarding_enabled) then raise exception 'university unavailable';end if;
 if p_faculty is not null and not exists(select 1 from public.university_faculties uf join public.faculties f on f.id=uf.faculty_id where uf.university_id=p_university and uf.faculty_id=p_faculty and uf.is_active and f.is_active) then raise exception 'faculty unavailable';end if;
 if p_year is not null and (p_faculty is null or not exists(select 1 from public.academic_years where university_id=p_university and faculty_id=p_faculty and year=p_year)) then raise exception 'year unavailable';end if;
 if p_year is not null and not exists(select 1 from public.profiles where id=actor and username_claimed) then raise exception 'choose username';end if;
 update public.student_academics set university_id=p_university,faculty_id=p_faculty,academic_year=p_year,completed_at=case when p_year is not null then now() else null end,updated_at=now() where user_id=actor;
 -- Academic context controls suggestions, not the student's explicit library.
end;$$;
