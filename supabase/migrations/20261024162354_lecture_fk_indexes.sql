-- Cover both columns of same-course foreign keys and avoid a duplicate lecture-map index.
drop index public.lectures_course_idx;
drop index public.resource_lectures_lecture_idx;
create index resource_lectures_lecture_idx on public.resource_lectures(lecture_id,course_id,resource_id);
create index resource_lectures_resource_course_idx on public.resource_lectures(resource_id,course_id);
drop index public.discussions_lecture_idx;
create index discussions_lecture_idx on public.discussions(lecture_id,course_id);
