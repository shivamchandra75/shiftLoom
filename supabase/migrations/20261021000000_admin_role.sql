-- Admin role + read access to workers' assignments.
-- Safe to re-run: every object is dropped/replaced before it is created.
-- Assumes the default constraint name; check with \d public.users if this fails.
alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check
  check (role in ('steward', 'chef', 'driver', 'admin'));

-- security definer so policies on public.users can call it without recursing into RLS
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'admin');
$$;

drop policy if exists "Admins read all user_jobs" on public.user_jobs;
create policy "Admins read all user_jobs" on public.user_jobs
  for select to authenticated using (public.is_admin());

drop policy if exists "Admins read all users" on public.users;
create policy "Admins read all users" on public.users
  for select to authenticated using (public.is_admin());

-- Then mark admin accounts by hand, e.g.:
-- update public.users set role = 'admin', verification_status = 'verified' where email = '<admin email>';

-- Admins cancel (update) only the jobs they created
drop policy if exists "Admins update own jobs" on public.jobs;
create policy "Admins update own jobs" on public.jobs
  for update to authenticated
  using (public.is_admin() and created_by = auth.uid())
  with check (public.is_admin() and created_by = auth.uid());

-- Admins insert jobs and roles (through create_job below, which runs with the caller's RLS)
drop policy if exists "Admins insert jobs" on public.jobs;
create policy "Admins insert jobs" on public.jobs
  for insert to authenticated
  with check (public.is_admin() and created_by = auth.uid());

drop policy if exists "Admins insert job_roles" on public.job_roles;
create policy "Admins insert job_roles" on public.job_roles
  for insert to authenticated
  with check (public.is_admin());

-- Job + roles in one transaction: if any role row fails, the job is rolled back too
create or replace function public.create_job(p_job jsonb, p_roles jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  if jsonb_array_length(coalesce(p_roles, '[]'::jsonb)) = 0 then
    raise exception 'A job needs at least one role';
  end if;
  if (p_job->>'end_time')::time <= (p_job->>'start_time')::time then
    raise exception 'End time must be after start time';
  end if;

  insert into public.jobs (company_name, location_address, latitude, longitude, job_date, start_time, end_time, status, created_by)
  values (
    p_job->>'company_name',
    p_job->>'location_address',
    (p_job->>'latitude')::double precision,
    (p_job->>'longitude')::double precision,
    (p_job->>'job_date')::date,
    (p_job->>'start_time')::time,
    (p_job->>'end_time')::time,
    'open',
    auth.uid()
  )
  returning id into v_id;

  insert into public.job_roles (job_id, role, total_slots, wage_inr)
  select v_id, r->>'role', (r->>'total_slots')::int, (r->>'wage_inr')::numeric
  from jsonb_array_elements(p_roles) r;

  return v_id;
end;
$$;

-- Block workers from making themselves admin (the users UPDATE policy lets them edit their own row).
-- auth.uid() is null in the SQL editor / service role, so admins can still be promoted by hand there.
create or replace function public.prevent_admin_self_promotion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'admin'
     and (tg_op = 'INSERT' or old.role is distinct from 'admin')
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only an admin can grant the admin role';
  end if;
  return new;
end;
$$;

drop trigger if exists users_prevent_admin_self_promotion on public.users;
create trigger users_prevent_admin_self_promotion
  before insert or update of role on public.users
  for each row execute function public.prevent_admin_self_promotion();

-- Make PostgREST see create_job immediately
notify pgrst, 'reload schema';
