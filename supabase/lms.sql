-- =====================================================================
--  আল-লিসানুল মুবীন — LMS ডেটাবেস
--  Supabase → SQL Editor-এ পুরো ফাইলটি একবার চালান (বারবার চালালেও ক্ষতি নেই)।
--  নাহুর পুরোনো profiles টেবিল ব্যবহার করে; পুরোনো lessons/progress যেমন ছিল থাকে।
-- =====================================================================

-- ---------- সহায়ক: অ্যাডমিন কি না ----------
create or replace function public.lms_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false)
$$;
grant execute on function public.lms_is_admin() to anon, authenticated;

-- ---------- টেবিল ----------
create table if not exists public.lms_courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  subtitle text,
  description text,                 -- HTML
  level text,
  price int,
  old_price int,
  poster_url text,
  status text not null default 'draft' check (status in ('draft','soon','open','closed')),
  sort int not null default 0,
  pass_mark int not null default 70 check (pass_mark between 0 and 100),
  sequential boolean not null default true,
  certificate boolean not null default true,
  theme_css text,                   -- কোর্সের নিজস্ব নকশা (দরসের ফ্রেমে)
  theme_js text,                    -- কোর্সের নিজস্ব স্ক্রিপ্ট (দরসের ফ্রেমে)
  legacy_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lms_chapters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.lms_courses on delete cascade,
  title text not null,
  sort int not null default 0,
  legacy_key text,
  created_at timestamptz not null default now()
);
create index if not exists lms_chapters_course on public.lms_chapters(course_id, sort);

create table if not exists public.lms_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.lms_courses on delete cascade,
  chapter_id uuid references public.lms_chapters on delete set null,
  title text not null,
  sort int not null default 0,
  youtube_id text check (youtube_id is null or youtube_id ~ '^[A-Za-z0-9_-]{6,20}$'),
  body_html text,
  duration_min int,
  is_preview boolean not null default false,
  published boolean not null default false,
  completion text not null default 'manual' check (completion in ('manual','quiz','embedded')),
  legacy_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lms_lessons_course on public.lms_lessons(course_id, sort);
create unique index if not exists lms_lessons_legacy on public.lms_lessons(course_id, legacy_key) where legacy_key is not null;

create table if not exists public.lms_files (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.lms_courses on delete cascade,
  lesson_id uuid references public.lms_lessons on delete cascade,   -- null = পুরো কোর্সের উপকরণ
  name text not null,
  path text not null unique,          -- storage: lms-files/<course>/<lesson|course>/<file>
  mime text,
  size bigint,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.lms_quiz (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lms_lessons on delete cascade,
  question text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 8),
  correct int not null check (correct >= 0),
  explanation text,
  sort int not null default 0
);
create index if not exists lms_quiz_lesson on public.lms_quiz(lesson_id, sort);

create table if not exists public.lms_enrollments (
  user_id uuid not null references auth.users on delete cascade,
  course_id uuid not null references public.lms_courses on delete cascade,
  status text not null default 'pending' check (status in ('pending','active','rejected')),
  pay_method text, pay_sender text, pay_trx text, pay_amount text, phone text, note text,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  primary key (user_id, course_id)
);

create table if not exists public.lms_progress (
  user_id uuid not null references auth.users on delete cascade,
  lesson_id uuid not null references public.lms_lessons on delete cascade,
  best_score int not null default 0 check (best_score between 0 and 100),
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.lms_certificates (
  code text primary key,
  user_id uuid not null references auth.users on delete cascade,
  course_id uuid not null references public.lms_courses on delete cascade,
  name text not null,
  issued_at timestamptz not null default now(),
  unique (user_id, course_id)
);

-- ---------- Row Level Security ----------
-- শিক্ষার্থী সরাসরি কিছুই লিখতে পারে না; সব লেখা নিচের নিরাপদ ফাংশন দিয়ে। অ্যাডমিন সব পারে।
do $$
declare t text;
begin
  foreach t in array array['lms_courses','lms_chapters','lms_lessons','lms_files','lms_quiz','lms_enrollments','lms_progress','lms_certificates'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "admin all" on public.%I', t);
    execute format('create policy "admin all" on public.%I for all to authenticated using (public.lms_is_admin()) with check (public.lms_is_admin())', t);
  end loop;
end $$;

drop policy if exists "public courses" on public.lms_courses;
create policy "public courses" on public.lms_courses for select to anon, authenticated using (status <> 'draft');
drop policy if exists "own enrollments" on public.lms_enrollments;
create policy "own enrollments" on public.lms_enrollments for select to authenticated using (user_id = auth.uid());
drop policy if exists "own progress" on public.lms_progress;
create policy "own progress" on public.lms_progress for select to authenticated using (user_id = auth.uid());
drop policy if exists "own certificates" on public.lms_certificates;
create policy "own certificates" on public.lms_certificates for select to authenticated using (user_id = auth.uid());
-- lms_chapters / lms_lessons / lms_files / lms_quiz: শিক্ষার্থীর জন্য সরাসরি পড়া বন্ধ — ফাংশন দিয়ে আসে।

-- অ্যাডমিন সব প্রোফাইল দেখতে ও অনুমোদন বদলাতে পারবেন
drop policy if exists "admin read profiles" on public.profiles;
create policy "admin read profiles" on public.profiles for select to authenticated using (public.lms_is_admin());
drop policy if exists "admin update profiles" on public.profiles;
create policy "admin update profiles" on public.profiles for update to authenticated using (public.lms_is_admin()) with check (public.lms_is_admin());

-- ---------- দরসের ক্রম ও প্রবেশাধিকার ----------
create or replace function public.lms_lesson_order(p_course uuid)
returns table (lesson_id uuid, pos int) language sql stable security definer set search_path = public as $$
  select l.id, (row_number() over (order by coalesce(c.sort, 0), c.created_at nulls first, l.sort, l.created_at))::int
  from lms_lessons l left join lms_chapters c on c.id = l.chapter_id
  where l.course_id = p_course and l.published
$$;
revoke all on function public.lms_lesson_order(uuid) from public, anon, authenticated;

-- 'ok' | 'login' | 'not_enrolled' | 'pending' | 'locked' | 'missing'
create or replace function public.lms_lesson_state(p_uid uuid, p_lesson uuid)
returns text language plpgsql stable security definer set search_path = public as $$
declare l lms_lessons; c lms_courses; v_status text; v_pos int; v_prev uuid; v_admin boolean;
begin
  select * into l from lms_lessons where id = p_lesson;
  if not found then return 'missing'; end if;
  select coalesce(is_admin, false) into v_admin from profiles where id = p_uid;
  if coalesce(v_admin, false) then return 'ok'; end if;
  select * into c from lms_courses where id = l.course_id;
  if not l.published or c.status = 'draft' then return 'missing'; end if;
  if l.is_preview then return 'ok'; end if;
  if p_uid is null then return 'login'; end if;
  select status into v_status from lms_enrollments where user_id = p_uid and course_id = l.course_id;
  if v_status is null or v_status = 'rejected' then return 'not_enrolled'; end if;
  if v_status = 'pending' then return 'pending'; end if;
  if c.sequential then
    select pos into v_pos from lms_lesson_order(l.course_id) where lesson_id = l.id;
    select lesson_id into v_prev from lms_lesson_order(l.course_id) where pos = v_pos - 1;
    if v_prev is not null and not exists (select 1 from lms_progress where user_id = p_uid and lesson_id = v_prev and completed) then
      return 'locked';
    end if;
  end if;
  return 'ok';
end $$;
revoke all on function public.lms_lesson_state(uuid, uuid) from public, anon, authenticated;

-- ---------- কোর্সের পাতা (সবার জন্য): তথ্য + অধ্যায় + দরসের তালিকা + নিজের অবস্থা ----------
create or replace function public.lms_get_course(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c lms_courses; uid uuid := auth.uid(); v_enr text; v_admin boolean := lms_is_admin(); res jsonb;
begin
  select * into c from lms_courses where slug = p_slug;
  if not found or (c.status = 'draft' and not v_admin) then return null; end if;
  select status into v_enr from lms_enrollments where user_id = uid and course_id = c.id;
  with ord as (select * from lms_lesson_order(c.id)),
  ls as (
    select l.id, l.title, l.chapter_id, o.pos, l.is_preview, l.duration_min,
           (l.youtube_id is not null) as has_video,
           exists (select 1 from lms_quiz q where q.lesson_id = l.id) as has_quiz,
           exists (select 1 from lms_files f where f.lesson_id = l.id) as has_files,
           coalesce(p.completed, false) as completed, coalesce(p.best_score, 0) as best_score
    from lms_lessons l join ord o on o.lesson_id = l.id
    left join lms_progress p on p.lesson_id = l.id and p.user_id = uid
  ),
  ls2 as (
    select ls.*, case
      when v_admin or ls.is_preview then 'ok'
      when uid is null then 'login'
      when v_enr is null or v_enr = 'rejected' then 'not_enrolled'
      when v_enr = 'pending' then 'pending'
      when not c.sequential or ls.pos = 1 then 'ok'
      when (select p2.completed from ls p2 where p2.pos = ls.pos - 1) then 'ok'
      else 'locked' end as state
    from ls
  )
  select jsonb_build_object(
    'course', jsonb_build_object('id', c.id, 'slug', c.slug, 'title', c.title, 'subtitle', c.subtitle,
       'description', c.description, 'level', c.level, 'price', c.price, 'old_price', c.old_price,
       'poster_url', c.poster_url, 'status', c.status, 'pass_mark', c.pass_mark,
       'sequential', c.sequential, 'certificate', c.certificate),
    'enrollment', v_enr,
    'is_admin', v_admin,
    'chapters', coalesce((select jsonb_agg(jsonb_build_object('id', ch.id, 'title', ch.title) order by ch.sort, ch.created_at)
                          from lms_chapters ch where ch.course_id = c.id), '[]'::jsonb),
    'lessons', coalesce((select jsonb_agg(to_jsonb(ls2) order by ls2.pos) from ls2), '[]'::jsonb),
    'materials', case when v_admin or v_enr = 'active' then coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name, 'path', f.path, 'mime', f.mime, 'size', f.size) order by f.sort, f.created_at)
                          from lms_files f where f.course_id = c.id and f.lesson_id is null), '[]'::jsonb) else '[]'::jsonb end,
    'certificate', (select code from lms_certificates where user_id = uid and course_id = c.id)
  ) into res;
  return res;
end $$;
grant execute on function public.lms_get_course(text) to anon, authenticated;

-- ---------- একটি দরস (প্রবেশাধিকার যাচাই করে) ----------
create or replace function public.lms_get_lesson(p_lesson uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare l lms_lessons; c lms_courses; v_state text; v_pos int; uid uuid := auth.uid();
begin
  v_state := lms_lesson_state(uid, p_lesson);
  select * into l from lms_lessons where id = p_lesson;
  if v_state = 'missing' then return jsonb_build_object('state', 'missing'); end if;
  select * into c from lms_courses where id = l.course_id;
  if v_state <> 'ok' then
    return jsonb_build_object('state', v_state, 'course_slug', c.slug, 'title', l.title);
  end if;
  select pos into v_pos from lms_lesson_order(c.id) where lesson_id = l.id;
  return jsonb_build_object(
    'state', 'ok',
    'id', l.id, 'title', l.title, 'youtube_id', l.youtube_id, 'body_html', l.body_html,
    'completion', l.completion, 'duration_min', l.duration_min,
    'chapter', (select title from lms_chapters where id = l.chapter_id),
    'course', jsonb_build_object('id', c.id, 'slug', c.slug, 'title', c.title, 'pass_mark', c.pass_mark,
                                 'theme_css', c.theme_css, 'theme_js', c.theme_js),
    'prev', (select o.lesson_id from lms_lesson_order(c.id) o where o.pos = v_pos - 1),
    'next', (select o.lesson_id from lms_lesson_order(c.id) o where o.pos = v_pos + 1),
    'files', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name, 'path', f.path, 'mime', f.mime, 'size', f.size) order by f.sort, f.created_at)
                       from lms_files f where f.lesson_id = l.id), '[]'::jsonb),
    'quiz', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'question', q.question, 'options', q.options) order by q.sort)
                      from lms_quiz q where q.lesson_id = l.id), '[]'::jsonb),
    'progress', (select jsonb_build_object('best_score', p.best_score, 'completed', p.completed)
                 from lms_progress p where p.user_id = uid and p.lesson_id = l.id)
  );
end $$;
grant execute on function public.lms_get_lesson(uuid) to anon, authenticated;

-- ---------- অগ্রগতি জমা ----------
create or replace function public.lms_save_progress(p_uid uuid, p_lesson uuid, p_score int, p_pass int)
returns void language sql security definer set search_path = public as $$
  insert into lms_progress (user_id, lesson_id, best_score, completed)
  values (p_uid, p_lesson, greatest(0, least(100, p_score)), p_score >= p_pass)
  on conflict (user_id, lesson_id) do update
    set best_score = greatest(lms_progress.best_score, excluded.best_score),
        completed = lms_progress.completed or excluded.completed,
        updated_at = now()
$$;
revoke all on function public.lms_save_progress(uuid, uuid, int, int) from public, anon, authenticated;

-- কুইজ ছাড়া দরস: "সম্পন্ন" বোতাম
create or replace function public.lms_complete_lesson(p_lesson uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l lms_lessons; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  if lms_lesson_state(uid, p_lesson) <> 'ok' then raise exception 'lesson not available'; end if;
  select * into l from lms_lessons where id = p_lesson;
  if l.completion <> 'manual' then raise exception 'this lesson needs a test'; end if;
  perform lms_save_progress(uid, p_lesson, 100, 0);
  return jsonb_build_object('completed', true, 'best_score', 100);
end $$;
grant execute on function public.lms_complete_lesson(uuid) to authenticated;

-- দরসের ভেতরের নিজস্ব অনুশীলনের নম্বর (পুরোনো নাহু দরসের মতো)
create or replace function public.lms_report_score(p_lesson uuid, p_score int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l lms_lessons; v_pass int; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  if lms_lesson_state(uid, p_lesson) <> 'ok' then raise exception 'lesson not available'; end if;
  select * into l from lms_lessons where id = p_lesson;
  if l.completion <> 'embedded' then raise exception 'wrong lesson type'; end if;
  select pass_mark into v_pass from lms_courses where id = l.course_id;
  perform lms_save_progress(uid, p_lesson, p_score, v_pass);
  return (select jsonb_build_object('best_score', best_score, 'completed', completed) from lms_progress where user_id = uid and lesson_id = p_lesson);
end $$;
grant execute on function public.lms_report_score(uuid, int) to authenticated;

-- কুইজ জমা: নম্বর সার্ভারে গোনা হয় (সঠিক উত্তর শিক্ষার্থী আগে দেখতে পায় না)
create or replace function public.lms_submit_quiz(p_lesson uuid, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l lms_lessons; v_pass int; uid uuid := auth.uid(); v_total int; v_right int; v_score int; v_detail jsonb;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if lms_lesson_state(uid, p_lesson) <> 'ok' then raise exception 'lesson not available'; end if;
  select * into l from lms_lessons where id = p_lesson;
  select pass_mark into v_pass from lms_courses where id = l.course_id;
  select count(*), count(*) filter (where (p_answers ->> q.id::text) = q.correct::text),
         jsonb_object_agg(q.id, jsonb_build_object('correct', q.correct, 'explanation', q.explanation))
    into v_total, v_right, v_detail
  from lms_quiz q where q.lesson_id = p_lesson;
  if v_total = 0 then raise exception 'no quiz'; end if;
  v_score := round(100.0 * v_right / v_total);
  perform lms_save_progress(uid, p_lesson, v_score, v_pass);
  return jsonb_build_object('score', v_score, 'right', v_right, 'total', v_total, 'pass_mark', v_pass,
    'passed', v_score >= v_pass, 'detail', v_detail,
    'best_score', (select best_score from lms_progress where user_id = uid and lesson_id = p_lesson),
    'completed', (select completed from lms_progress where user_id = uid and lesson_id = p_lesson));
end $$;
grant execute on function public.lms_submit_quiz(uuid, jsonb) to authenticated;

-- ---------- ভর্তি ----------
create or replace function public.lms_request_enrollment(p_course uuid, p_method text, p_sender text, p_trx text, p_amount text, p_phone text, p_note text default null)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); v_status text;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from lms_courses where id = p_course and status = 'open') then raise exception 'course not open'; end if;
  select status into v_status from lms_enrollments where user_id = uid and course_id = p_course;
  if v_status = 'active' then return 'active'; end if;
  insert into lms_enrollments (user_id, course_id, status, pay_method, pay_sender, pay_trx, pay_amount, phone, note)
  values (uid, p_course, 'pending', left(p_method, 40), left(p_sender, 60), left(p_trx, 60), left(p_amount, 20), left(p_phone, 30), left(p_note, 500))
  on conflict (user_id, course_id) do update set status = 'pending', pay_method = excluded.pay_method,
    pay_sender = excluded.pay_sender, pay_trx = excluded.pay_trx, pay_amount = excluded.pay_amount,
    phone = excluded.phone, note = excluded.note, created_at = now();
  return 'pending';
end $$;
grant execute on function public.lms_request_enrollment(uuid, text, text, text, text, text, text) to authenticated;

-- আমার কোর্সসমূহ
create or replace function public.lms_my_courses()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x->>'title'), '[]'::jsonb) from (
    select jsonb_build_object('slug', c.slug, 'title', c.title, 'poster_url', c.poster_url, 'status', e.status,
      'total', (select count(*) from lms_lesson_order(c.id)),
      'done', (select count(*) from lms_lesson_order(c.id) o join lms_progress p on p.lesson_id = o.lesson_id and p.user_id = auth.uid() and p.completed),
      'certificate', (select code from lms_certificates where user_id = auth.uid() and course_id = c.id)) as x
    from lms_enrollments e join lms_courses c on c.id = e.course_id
    where e.user_id = auth.uid()
  ) t
$$;
grant execute on function public.lms_my_courses() to authenticated;

-- নিজের নাম (সার্টিফিকেটে যাবে) ঠিক করা
create or replace function public.lms_set_my_name(p_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'name too short'; end if;
  update profiles set full_name = left(trim(p_name), 80) where id = auth.uid();
end $$;
grant execute on function public.lms_set_my_name(text) to authenticated;

-- ---------- সার্টিফিকেট ----------
create or replace function public.lms_claim_certificate(p_course uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c lms_courses; v_total int; v_done int; v_code text; v_name text;
begin
  if uid is null then raise exception 'not signed in'; end if;
  select * into c from lms_courses where id = p_course;
  if not found or not c.certificate then raise exception 'no certificate for this course'; end if;
  if not exists (select 1 from lms_enrollments where user_id = uid and course_id = p_course and status = 'active') then raise exception 'not enrolled'; end if;
  select count(*) into v_total from lms_lesson_order(p_course);
  select count(*) into v_done from lms_lesson_order(p_course) o join lms_progress p on p.lesson_id = o.lesson_id and p.user_id = uid and p.completed;
  if v_total = 0 or v_done < v_total then raise exception 'course not complete'; end if;
  select code into v_code from lms_certificates where user_id = uid and course_id = p_course;
  if v_code is null then
    select coalesce(nullif(full_name, ''), email) into v_name from profiles where id = uid;
    v_code := upper(substr(md5(gen_random_uuid()::text), 1, 10));
    insert into lms_certificates (code, user_id, course_id, name) values (v_code, uid, p_course, v_name);
  end if;
  return (select jsonb_build_object('code', code, 'name', name, 'issued_at', issued_at, 'course', c.title) from lms_certificates where code = v_code);
end $$;
grant execute on function public.lms_claim_certificate(uuid) to authenticated;

create or replace function public.lms_verify_certificate(p_code text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('code', x.code, 'name', x.name, 'issued_at', x.issued_at, 'course', c.title)
  from lms_certificates x join lms_courses c on c.id = x.course_id where x.code = upper(p_code)
$$;
grant execute on function public.lms_verify_certificate(text) to anon, authenticated;

-- ---------- অ্যাডমিন: শিক্ষার্থীর তালিকা ----------
create or replace function public.lms_admin_students()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not lms_is_admin() then raise exception 'admin only'; end if;
  return coalesce((select jsonb_agg(x order by x->>'created_at' desc) from (
    select jsonb_build_object('id', p.id, 'name', p.full_name, 'email', p.email, 'created_at', p.created_at, 'is_admin', p.is_admin,
      'enrollments', coalesce((select jsonb_agg(jsonb_build_object('course_id', e.course_id, 'status', e.status,
          'pay_method', e.pay_method, 'pay_sender', e.pay_sender, 'pay_trx', e.pay_trx, 'pay_amount', e.pay_amount,
          'phone', e.phone, 'note', e.note, 'created_at', e.created_at,
          'done', (select count(*) from lms_lesson_order(e.course_id) o join lms_progress g on g.lesson_id = o.lesson_id and g.user_id = p.id and g.completed),
          'total', (select count(*) from lms_lesson_order(e.course_id))))
        from lms_enrollments e where e.user_id = p.id), '[]'::jsonb)) as x
    from profiles p) t), '[]'::jsonb);
end $$;
grant execute on function public.lms_admin_students() to authenticated;

-- ---------- অ্যাডমিন: পুরোনো ব্যবস্থার ভর্তি ও অগ্রগতি নতুন কোর্সে আনা ----------
-- p_key: 'hatekhori' বা 'nahw'। পুরোনো enrollments টেবিল (কোর্সভিত্তিক আবেদন) থাকলে সেটিও আনে।
drop function if exists public.lms_admin_migrate_nahw(uuid);
create or replace function public.lms_admin_migrate(p_key text, p_course uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_enr int := 0; v_n int := 0; v_prog int := 0;
begin
  if not lms_is_admin() then raise exception 'admin only'; end if;
  if p_key not in ('hatekhori', 'nahw') then raise exception 'unknown course'; end if;
  -- ১. কোর্সভিত্তিক পুরোনো আবেদন/অনুমোদন (যদি সেই টেবিল থাকে)
  if to_regclass('public.enrollments') is not null then
    execute $q$
      insert into lms_enrollments (user_id, course_id, status, pay_method, pay_sender, pay_trx, pay_amount, note, created_at, activated_at)
      select e.user_id, $1,
             case e.status when 'approved' then 'active' when 'rejected' then 'rejected' else 'pending' end,
             e.method, e.sender, e.trx_id, e.amount, coalesce(e.note, 'পুরোনো ভর্তি-ব্যবস্থা থেকে'), e.created_at,
             case when e.status = 'approved' then coalesce(e.decided_at, now()) end
      from enrollments e where e.course = $2
      on conflict (user_id, course_id) do update set status = excluded.status,
        activated_at = coalesce(lms_enrollments.activated_at, excluded.activated_at)
      where lms_enrollments.status <> 'active'
    $q$ using p_course, p_key;
    get diagnostics v_n = row_count; v_enr := v_enr + v_n;
  end if;
  if p_key = 'nahw' then
    -- ২. নাহুর আরও পুরোনো "অনুমোদিত প্রোফাইল"
    insert into lms_enrollments (user_id, course_id, status, note, activated_at)
    select p.id, p_course, 'active', 'পুরোনো নাহু ব্যবস্থা থেকে', now() from profiles p where p.approved
    on conflict (user_id, course_id) do nothing;
    get diagnostics v_n = row_count; v_enr := v_enr + v_n;
    -- ৩. নাহুর দরসভিত্তিক অগ্রগতি
    insert into lms_progress (user_id, lesson_id, best_score, completed, updated_at)
    select g.user_id, l.id, g.best_score, g.best_score >= (select pass_mark from lms_courses where id = p_course), g.updated_at
    from progress g join lms_lessons l on l.course_id = p_course and l.legacy_key = g.lesson_id
    on conflict (user_id, lesson_id) do update
      set best_score = greatest(lms_progress.best_score, excluded.best_score),
          completed = lms_progress.completed or excluded.completed;
    get diagnostics v_prog = row_count;
  end if;
  return jsonb_build_object('enrollments', v_enr, 'progress', v_prog);
end $$;
grant execute on function public.lms_admin_migrate(text, uuid) to authenticated;

-- ---------- ফাইল রাখার জায়গা (Storage) ----------
insert into storage.buckets (id, name, public, file_size_limit)
values ('lms-files', 'lms-files', false, 52428800), ('lms-public', 'lms-public', true, 10485760)
on conflict (id) do nothing;

-- ফাইলের পথ: <course_id>/<lesson_id অথবা course>/<নাম>
create or replace function public.lms_can_read_file(p_name text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare seg text[] := string_to_array(p_name, '/'); v_course uuid; v_lesson uuid;
begin
  if lms_is_admin() then return true; end if;
  if array_length(seg, 1) < 3 then return false; end if;
  begin v_course := seg[1]::uuid; exception when others then return false; end;
  if seg[2] = 'course' then
    return exists (select 1 from lms_enrollments where user_id = auth.uid() and course_id = v_course and status = 'active');
  end if;
  begin v_lesson := seg[2]::uuid; exception when others then return false; end;
  return exists (select 1 from lms_lessons where id = v_lesson and course_id = v_course)
     and lms_lesson_state(auth.uid(), v_lesson) = 'ok';
end $$;
grant execute on function public.lms_can_read_file(text) to anon, authenticated;

drop policy if exists "lms files read" on storage.objects;
create policy "lms files read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'lms-files' and public.lms_can_read_file(name));
drop policy if exists "lms admin write" on storage.objects;
create policy "lms admin write" on storage.objects for insert to authenticated
  with check (bucket_id in ('lms-files', 'lms-public') and public.lms_is_admin());
drop policy if exists "lms admin update" on storage.objects;
create policy "lms admin update" on storage.objects for update to authenticated
  using (bucket_id in ('lms-files', 'lms-public') and public.lms_is_admin());
drop policy if exists "lms admin delete" on storage.objects;
create policy "lms admin delete" on storage.objects for delete to authenticated
  using (bucket_id in ('lms-files', 'lms-public') and public.lms_is_admin());

-- ---------- updated_at ----------
create or replace function public.lms_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists lms_courses_touch on public.lms_courses;
create trigger lms_courses_touch before update on public.lms_courses for each row execute function public.lms_touch();
drop trigger if exists lms_lessons_touch on public.lms_lessons;
create trigger lms_lessons_touch before update on public.lms_lessons for each row execute function public.lms_touch();

-- =====================================================================
--  শেষ ধাপ: নিজের অ্যাকাউন্টকে অ্যাডমিন করুন (ইমেইল বদলে চালান, একবারই)
--  update public.profiles set is_admin = true, approved = true where email = 'আপনার-ইমেইল@example.com';
-- =====================================================================
