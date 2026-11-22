-- আল-লিসানুল মুবীন — সাইটের অংশ: শিক্ষকমণ্ডলী, শিক্ষার্থীদের মতামত, কোর্স কার্ডের দরস-সংখ্যা
-- lms.sql চালানোর পরে Supabase → SQL Editor-এ একবার চালান। বারবার চালালেও ক্ষতি নেই।

-- ---------- শিক্ষকমণ্ডলী ----------
create table if not exists public.lms_teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  bio text,
  photo_url text,
  sort int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.lms_teachers enable row level security;
drop policy if exists "public read teachers" on public.lms_teachers;
create policy "public read teachers" on public.lms_teachers for select using (published or public.lms_is_admin());
drop policy if exists "admin all" on public.lms_teachers;
create policy "admin all" on public.lms_teachers for all to authenticated using (public.lms_is_admin()) with check (public.lms_is_admin());

insert into public.lms_teachers (name, role, bio, sort)
select 'মুহাম্মাদ সাজ্জাদ ইউনুস', 'প্রতিষ্ঠাতা ও প্রধান শিক্ষক',
       'ইমাম মুহাম্মাদ ইবনে সাউদ ইসলামিক বিশ্ববিদ্যালয়, রিয়াদ থেকে শরীয়াহতে স্নাতক; বর্তমানে একই বিশ্ববিদ্যালয়ে ফিকহে মাস্টার্স। সৌদি বিচার মন্ত্রণালয়ের অধীনে অনুবাদক।', 1
where not exists (select 1 from public.lms_teachers);

-- ---------- শিক্ষার্থীদের মতামত ----------
create table if not exists public.lms_testimonials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  course_title text,
  body text not null check (char_length(body) between 10 and 1200),
  rating int check (rating between 1 and 5),
  approved boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.lms_testimonials enable row level security;
drop policy if exists "public read approved" on public.lms_testimonials;
create policy "public read approved" on public.lms_testimonials for select using (approved or user_id = auth.uid() or public.lms_is_admin());
drop policy if exists "admin all" on public.lms_testimonials;
create policy "admin all" on public.lms_testimonials for all to authenticated using (public.lms_is_admin()) with check (public.lms_is_admin());

-- ভর্তি থাকা শিক্ষার্থী নিজের মতামত দেয় (প্রতি জনে একটি; শিক্ষক অনুমোদন করলে সাইটে দেখায়)
create or replace function public.lms_submit_testimonial(p_name text, p_body text, p_rating int, p_course text)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); v_id uuid;
begin
  if uid is null then return 'login'; end if;
  if not exists (select 1 from lms_enrollments where user_id = uid and status = 'active') then return 'not_enrolled'; end if;
  if char_length(coalesce(trim(p_body), '')) < 10 then return 'short'; end if;
  select id into v_id from lms_testimonials where user_id = uid limit 1;
  if v_id is null then
    insert into lms_testimonials (user_id, name, course_title, body, rating)
    values (uid, left(trim(p_name), 80), left(p_course, 120), left(trim(p_body), 1200), least(greatest(coalesce(p_rating, 5), 1), 5));
  else
    update lms_testimonials set name = left(trim(p_name), 80), course_title = left(p_course, 120),
      body = left(trim(p_body), 1200), rating = least(greatest(coalesce(p_rating, 5), 1), 5), approved = false, created_at = now()
    where id = v_id;
  end if;
  return 'ok';
end $$;
revoke all on function public.lms_submit_testimonial(text, text, int, text) from public;
grant execute on function public.lms_submit_testimonial(text, text, int, text) to authenticated;

-- ---------- প্রকাশ্য কোর্স তালিকা (দরস ও অধ্যায়ের সংখ্যাসহ) ----------
create or replace function public.lms_public_courses()
returns table (slug text, title text, subtitle text, level text, price int, old_price int,
               poster_url text, status text, sort int, lessons bigint, chapters bigint)
language sql stable security definer set search_path = public as $$
  select c.slug, c.title, c.subtitle, c.level, c.price, c.old_price, c.poster_url, c.status, c.sort,
         (select count(*) from lms_lessons l where l.course_id = c.id and l.published),
         (select count(*) from lms_chapters h where h.course_id = c.id)
  from lms_courses c where c.status <> 'draft' order by c.sort, c.created_at;
$$;
grant execute on function public.lms_public_courses() to anon, authenticated;
