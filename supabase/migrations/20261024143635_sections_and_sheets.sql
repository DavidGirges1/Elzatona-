-- Sections/labs and professor exercise sheets are distinct material types.
-- Publication, review, private file access and quiz payload constraints remain in force.
alter table public.resources drop constraint resources_type_check;
alter table public.resources add constraint resources_type_check check (
 type in ('notes','slides','sections','past_exam','video','question_bank','sheets','reference','other')
);
