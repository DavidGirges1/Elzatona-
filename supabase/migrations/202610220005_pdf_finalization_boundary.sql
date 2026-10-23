-- A student must not publish arbitrary Storage bytes by calling finalize directly.
-- The server verifies the PDF signature first; only the server secret role may finalize.
create function public.finalize_pdf_checked(p_resource uuid,p_author uuid) returns void language plpgsql security definer set search_path='' as $$declare r public.resources;begin
 select * into r from public.resources where id=p_resource and author_id=p_author and source_kind='pdf' and status='pending' for update;if not found then raise exception 'upload unavailable';end if;
 if not exists(select 1 from public.courses where id=r.course_id and is_active) or not exists(select 1 from storage.objects where bucket_id='course-pdfs' and name=r.storage_path and (metadata->>'size')::bigint between 5 and 3145728 and metadata->>'mimetype'='application/pdf') then raise exception 'file missing or invalid';end if;
 update public.resources set status='published',updated_at=now() where id=p_resource;insert into public.product_events(event,actor_id,course_id,resource_id) values('resource_submitted',p_author,r.course_id,p_resource);end;$$;
revoke all on function public.finalize_pdf(uuid),public.finalize_pdf_checked(uuid,uuid) from public,anon,authenticated;
grant execute on function public.finalize_pdf_checked(uuid,uuid) to service_role;
