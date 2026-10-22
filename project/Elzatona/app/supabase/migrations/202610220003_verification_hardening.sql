-- Keep the existing server upload below Vercel's 4.5 MB request cap (including multipart overhead).
update storage.buckets set public=false,file_size_limit=3145728,allowed_mime_types=array['application/pdf'] where id='course-pdfs';
create or replace function public.finalize_pdf(p_resource uuid) returns void language plpgsql security definer set search_path='' as $$declare actor uuid:=public.require_actor('finalize',30);r public.resources;begin
 select * into r from public.resources where id=p_resource and author_id=actor and source_kind='pdf' and status='pending' for update;if not found then raise exception 'upload unavailable';end if;
 if not exists(select 1 from public.courses where id=r.course_id and is_active) or not exists(select 1 from storage.objects where bucket_id='course-pdfs' and name=r.storage_path and (metadata->>'size')::bigint between 5 and 3145728 and metadata->>'mimetype'='application/pdf') then raise exception 'file missing or invalid';end if;
 update public.resources set status='published',updated_at=now() where id=p_resource;insert into public.product_events(event,actor_id,course_id,resource_id) values('resource_submitted',actor,r.course_id,p_resource);end;$$;
-- Account deletion cascades vote rows; totals must stay correct for that path too.
create function public.vote_count_delta() returns trigger language plpgsql security definer set search_path='' as $$begin
 if TG_OP='INSERT' then update public.resources set upvotes_count=upvotes_count+(new.value=1)::integer,downvotes_count=downvotes_count+(new.value=-1)::integer where id=new.resource_id;
 elsif TG_OP='DELETE' then update public.resources set upvotes_count=upvotes_count-(old.value=1)::integer,downvotes_count=downvotes_count-(old.value=-1)::integer where id=old.resource_id;
 else update public.resources set upvotes_count=upvotes_count-(old.value=1)::integer+(new.value=1)::integer,downvotes_count=downvotes_count-(old.value=-1)::integer+(new.value=-1)::integer where id=new.resource_id;end if;
 return coalesce(new,old);end;$$;
create trigger votes_count after insert or update or delete on public.resource_votes for each row execute function public.vote_count_delta();
revoke all on function public.vote_count_delta() from public,anon,authenticated;
create or replace function public.create_profile() returns trigger language plpgsql security definer set search_path='' as $$declare label text:=trim(coalesce(new.raw_user_meta_data->>'full_name',''));begin
 if length(label)<2 then label:='طالب جديد';end if;
 insert into public.profiles(id,display_name) values(new.id,left(label,80));return new;end;$$;
-- Public PDF reads must also honor active course state. No object UPDATE/overwrite policy exists.
drop policy pdf_owner_read on storage.objects;
create policy pdf_owner_read on storage.objects for select to authenticated using(bucket_id='course-pdfs' and exists(select 1 from public.resources r join public.courses c on c.id=r.course_id where r.storage_path=name and (r.author_id=auth.uid() or (r.status='published' and c.is_active) or public.is_moderator())));
-- Explicitly keep trigger-only functions inaccessible after CREATE OR REPLACE.
revoke all on function public.create_profile() from public,anon,authenticated;
