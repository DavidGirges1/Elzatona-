-- Supabase projects can grant default table privileges to API roles.
-- Keep the curriculum read-only at both the privilege and row-policy layers.
revoke all on public.course_requirements from public,anon,authenticated;
grant select on public.course_requirements to anon,authenticated;
