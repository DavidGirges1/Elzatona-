-- Owner clarification: a course leader may review their own submitted material.
-- Keep the same readiness, course assignment, submission-state and review safeguards.
create or replace function public.can_review_material(p_resource uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(
  select 1 from public.resources r
  where r.id=p_resource and r.status='pending' and r.review_state='submitted'
   and (public.is_admin() or elzatona_private.course_leader(auth.uid(),r.course_id))
 )
$$;
revoke all on function public.can_review_material(uuid) from public,anon,authenticated;
grant execute on function public.can_review_material(uuid) to authenticated;
