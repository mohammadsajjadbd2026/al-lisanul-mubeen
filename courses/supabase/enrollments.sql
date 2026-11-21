-- কোর্সভিত্তিক ভর্তি ও অ্যাডমিন অনুমোদন
-- Supabase → SQL Editor-এ একবার চালান (schema.sql ও lessons.sql চালানোর পর)।

-- ১. ভর্তির আবেদন: প্রতি শিক্ষার্থী × প্রতি কোর্সে একটি সারি
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  course text not null check (course in ('hatekhori','nahw','sarf')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  method text,
  sender text,
  trx_id text,
  amount text,
  note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (user_id, course)
);
alter table public.enrollments enable row level security;

drop policy if exists "read own enrollments" on public.enrollments;
create policy "read own enrollments" on public.enrollments
  for select to authenticated using (auth.uid() = user_id);

-- শিক্ষার্থী শুধু নিজের নামে "pending" আবেদন করতে পারবে; নিজে approved করতে পারবে না
drop policy if exists "request own enrollment" on public.enrollments;
create policy "request own enrollment" on public.enrollments
  for insert to authenticated with check (auth.uid() = user_id and status = 'pending');

-- পেন্ডিং বা বাতিল আবেদনে ট্রানজেকশন-তথ্য সংশোধন (status বদলানো যাবে না — নিচের trigger আটকায়)
drop policy if exists "edit own pending enrollment" on public.enrollments;
create policy "edit own pending enrollment" on public.enrollments
  for update to authenticated
  using (auth.uid() = user_id and status in ('pending','rejected'))
  with check (auth.uid() = user_id and status = 'pending');

-- ২. অ্যাডমিন-যাচাই
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false)
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ৩. অ্যাডমিনের জন্য: সব আবেদনের তালিকা
create or replace function public.admin_list_enrollments()
returns table (id uuid, user_id uuid, full_name text, email text, course text, status text,
               method text, sender text, trx_id text, amount text, created_at timestamptz, decided_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  return query
    select e.id, e.user_id, p.full_name, p.email, e.course, e.status,
           e.method, e.sender, e.trx_id, e.amount, e.created_at, e.decided_at
    from enrollments e left join profiles p on p.id = e.user_id
    order by (e.status = 'pending') desc, e.created_at desc;
end $$;
revoke all on function public.admin_list_enrollments() from public, anon;
grant execute on function public.admin_list_enrollments() to authenticated;

-- ৪. অ্যাডমিনের জন্য: অনুমোদন / বাতিল / আবার পেন্ডিং
create or replace function public.admin_set_enrollment(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  if p_status not in ('pending','approved','rejected') then raise exception 'bad status'; end if;
  update enrollments set status = p_status,
         decided_at = case when p_status = 'pending' then null else now() end
   where id = p_id;
end $$;
revoke all on function public.admin_set_enrollment(uuid, text) from public, anon;
grant execute on function public.admin_set_enrollment(uuid, text) to authenticated;

-- ৫. নাহুর নম্বর জমা এখন নাহু-কোর্সে অনুমোদিত শিক্ষার্থীর জন্য
create or replace function public.submit_score(p_lesson text, p_score int)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_ord int; v_prev text; v_ok boolean; v_admin boolean;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select coalesce(is_admin,false) into v_admin from profiles where id = auth.uid();
  v_ok := v_admin or exists (select 1 from enrollments where user_id = auth.uid() and course = 'nahw' and status = 'approved');
  if not v_ok then raise exception 'not approved'; end if;
  select ord into v_ord from lessons where id = p_lesson;
  if v_ord is null then raise exception 'unknown lesson'; end if;
  if v_ord > 1 and not v_admin then
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

-- ৬. আগে যারা নাহুতে অনুমোদিত ছিল, তাদের নাহু-ভর্তি অনুমোদিত হিসেবে তুলে আনা
insert into public.enrollments (user_id, course, status, decided_at)
select id, 'nahw', 'approved', now() from public.profiles where approved
on conflict (user_id, course) do nothing;

-- ৭. নিজেকে অ্যাডমিন করুন (আপনার ইমেইল বসিয়ে একবার চালান):
-- update public.profiles set is_admin = true where email = 'আপনার-ইমেইল@example.com';
