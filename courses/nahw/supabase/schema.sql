-- নাহুর সহজ পাঠ: নিবন্ধন, অনুমোদন ও দারস-লকের ডেটাবেস
-- Supabase → SQL Editor-এ একবার চালাতে হবে। তারপর lessons.sql চালাতে হবে।

-- ১. শিক্ষার্থীর প্রোফাইল (নিবন্ধনের সময় নিজে থেকে তৈরি হয়)
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  email text,
  approved boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select to authenticated using (auth.uid() = id);
-- শিক্ষার্থী নিজের approved/is_admin বদলাতে পারবে না: কোনো update/insert নীতি নেই।

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ২. দারসের ক্রম
create table if not exists public.lessons (
  id text primary key,
  ord int not null unique
);
alter table public.lessons enable row level security;
drop policy if exists "read lessons" on public.lessons;
create policy "read lessons" on public.lessons for select to authenticated using (true);

-- ৩. অগ্রগতি (প্রতি দারসের সেরা নম্বর)
create table if not exists public.progress (
  user_id uuid not null references auth.users on delete cascade,
  lesson_id text not null references public.lessons on delete cascade,
  best_score int not null check (best_score between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
alter table public.progress enable row level security;
drop policy if exists "read own progress" on public.progress;
create policy "read own progress" on public.progress for select to authenticated using (auth.uid() = user_id);
-- সরাসরি লেখা বন্ধ; নম্বর জমা হয় শুধু submit_score দিয়ে, যা তালা যাচাই করে।

create or replace function public.submit_score(p_lesson text, p_score int)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_ord int; v_prev text; v_approved boolean; v_admin boolean;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select approved, is_admin into v_approved, v_admin from profiles where id = auth.uid();
  if not coalesce(v_approved or v_admin, false) then raise exception 'not approved'; end if;
  select ord into v_ord from lessons where id = p_lesson;
  if v_ord is null then raise exception 'unknown lesson'; end if;
  if v_ord > 1 and not coalesce(v_admin, false) then
    select id into v_prev from lessons where ord = v_ord - 1;
    if not exists (select 1 from progress where user_id = auth.uid() and lesson_id = v_prev and best_score >= 70) then
      raise exception 'lesson locked';
    end if;
  end if;
  insert into progress (user_id, lesson_id, best_score)
  values (auth.uid(), p_lesson, greatest(0, least(100, p_score)))
  on conflict (user_id, lesson_id)
  do update set best_score = greatest(progress.best_score, excluded.best_score), updated_at = now();
end $$;
revoke all on function public.submit_score(text, int) from public, anon;
grant execute on function public.submit_score(text, int) to authenticated;

-- ৪. শিক্ষকের জন্য: শিক্ষার্থীদের তালিকা ও অগ্রগতি এক নজরে (Table Editor/SQL থেকে দেখবেন)
create or replace view public.student_overview with (security_invoker = true) as
select p.full_name, p.email, p.approved, p.created_at,
       count(g.*) filter (where g.best_score >= 70) as lessons_passed,
       max(g.updated_at) as last_activity
from public.profiles p left join public.progress g on g.user_id = p.id
group by p.id;
revoke all on public.student_overview from anon, authenticated;
