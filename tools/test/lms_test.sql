\set ON_ERROR_STOP on
\c lmstest
-- users
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a','admin@x','{"full_name":"Admin"}'),
 ('00000000-0000-0000-0000-00000000000b','stu@x','{"full_name":"ছাত্র এক"}'),
 ('00000000-0000-0000-0000-00000000000c','other@x','{"full_name":"অন্য"}');
update profiles set is_admin = true where email = 'admin@x';

-- ===== admin creates content via RLS =====
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
insert into lms_courses (id, slug, title, status, price) values ('11111111-1111-1111-1111-111111111111','test-course','টেস্ট কোর্স','open',2500);
insert into lms_chapters (id, course_id, title, sort) values ('22222222-2222-2222-2222-222222222221','11111111-1111-1111-1111-111111111111','অধ্যায় ১',1);
insert into lms_lessons (id, course_id, chapter_id, title, sort, published, completion, youtube_id, is_preview) values
 ('33333333-3333-3333-3333-333333333331','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222221','দরস ১',1,true,'manual','dQw4w9WgXcQ',false),
 ('33333333-3333-3333-3333-333333333332','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222221','দরস ২',2,true,'quiz',null,false),
 ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222221','দরস ৩',3,true,'embedded',null,false),
 ('33333333-3333-3333-3333-333333333334','11111111-1111-1111-1111-111111111111',null,'অপ্রকাশিত',4,false,'manual',null,false);
insert into lms_quiz (id, lesson_id, question, options, correct, sort) values
 ('44444444-4444-4444-4444-444444444441','33333333-3333-3333-3333-333333333332','প্রশ্ন ১','["ক","খ","গ"]',1,1),
 ('44444444-4444-4444-4444-444444444442','33333333-3333-3333-3333-333333333332','প্রশ্ন ২','["ক","খ"]',0,2);
select 'admin course rows', count(*) from lms_courses;

-- ===== anonymous visitor =====
reset role; set role anon;
select set_config('request.jwt.claim.sub','',false);
select 'anon outline states', jsonb_path_query_array(lms_get_course('test-course'), '$.lessons[*].state');
select 'anon lesson1', lms_get_lesson('33333333-3333-3333-3333-333333333331')->>'state';
select 'anon quiz rows (must be 0)', count(*) from lms_quiz;
select 'anon lesson rows (must be 0)', count(*) from lms_lessons;
select 'anon enrollments rows (must be 0)', count(*) from lms_enrollments;

-- ===== student, not enrolled =====
reset role; set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',false);
select 'stu direct quiz rows (must be 0)', count(*) from lms_quiz;
select 'stu direct lessons rows (must be 0)', count(*) from lms_lessons;
select 'stu lesson1 before enroll', lms_get_lesson('33333333-3333-3333-3333-333333333331')->>'state';
select 'request', lms_request_enrollment('11111111-1111-1111-1111-111111111111','বিকাশ','017','TRX1','2500','017');
select 'stu lesson1 pending', lms_get_lesson('33333333-3333-3333-3333-333333333331')->>'state';
do $$ begin
  update lms_enrollments set status='active' where user_id = auth.uid();
  if found then raise exception 'student self-activated!'; end if;
  raise notice 'ok: student cannot self-activate';
end $$;

-- admin approves
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
update lms_enrollments set status='active', activated_at=now() where user_id='00000000-0000-0000-0000-00000000000b';
select 'admin students', jsonb_array_length(lms_admin_students());

-- student learns
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',false);
select 'outline after approve', jsonb_path_query_array(lms_get_course('test-course'), '$.lessons[*].state');
select 'lesson1 ok', lms_get_lesson('33333333-3333-3333-3333-333333333331')->>'state', lms_get_lesson('33333333-3333-3333-3333-333333333331')->>'youtube_id';
select 'lesson2 locked', lms_get_lesson('33333333-3333-3333-3333-333333333332')->>'state';
select 'quiz not completable by button';
do $$ begin perform lms_complete_lesson('33333333-3333-3333-3333-333333333332'); raise exception 'bad';
exception when others then if sqlerrm = 'bad' then raise; end if; raise notice 'ok: %', sqlerrm; end $$;
select 'complete1', lms_complete_lesson('33333333-3333-3333-3333-333333333331');
select 'lesson2 quiz has no answers', lms_get_lesson('33333333-3333-3333-3333-333333333332')->'quiz';
select 'quiz fail', lms_submit_quiz('33333333-3333-3333-3333-333333333332','{"44444444-4444-4444-4444-444444444441":"0","44444444-4444-4444-4444-444444444442":"0"}')->>'score';
select 'lesson3 still locked', lms_get_lesson('33333333-3333-3333-3333-333333333333')->>'state';
select 'quiz pass', lms_submit_quiz('33333333-3333-3333-3333-333333333332','{"44444444-4444-4444-4444-444444444441":"1","44444444-4444-4444-4444-444444444442":"0"}')->>'score';
select 'lesson3 open', lms_get_lesson('33333333-3333-3333-3333-333333333333')->>'state';
select 'cert too early';
do $$ begin perform lms_claim_certificate('11111111-1111-1111-1111-111111111111'); raise exception 'bad';
exception when others then if sqlerrm = 'bad' then raise; end if; raise notice 'ok: %', sqlerrm; end $$;
select 'embedded low', lms_report_score('33333333-3333-3333-3333-333333333333', 50);
select 'embedded pass', lms_report_score('33333333-3333-3333-3333-333333333333', 80);
select 'my courses', lms_my_courses();
select 'cert', lms_claim_certificate('11111111-1111-1111-1111-111111111111')->>'name';
select 'unpublished lesson', lms_get_lesson('33333333-3333-3333-3333-333333333334')->>'state';
select 'file rule course-level', lms_can_read_file('11111111-1111-1111-1111-111111111111/course/a.pdf'),
       'lesson-level', lms_can_read_file('11111111-1111-1111-1111-111111111111/33333333-3333-3333-3333-333333333331/a.pdf'),
       'bad path', lms_can_read_file('../../etc');

-- other student cannot read files
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000c',false);
select 'other file', lms_can_read_file('11111111-1111-1111-1111-111111111111/course/a.pdf'), 'other progress rows', (select count(*) from lms_progress);
select 'other lesson', lms_get_lesson('33333333-3333-3333-3333-333333333331')->>'state';

reset role;
select code as certcode from lms_certificates limit 1 \gset
set role anon;
select 'verify', lms_verify_certificate(:'certcode')->>'name';
reset role;
select 'ALL TESTS PASSED';
