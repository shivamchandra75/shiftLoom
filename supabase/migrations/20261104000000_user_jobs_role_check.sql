-- A worker can only accept an open, upcoming job that has their own role.
drop policy if exists "Users can apply for jobs" on public.user_jobs;
create policy "Users can apply for jobs" on public.user_jobs
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and role = (select u.role from public.users u where u.id = auth.uid())
    and exists (
      select 1
      from public.job_roles r
      join public.jobs j on j.id = r.job_id
      where r.job_id = user_jobs.job_id
        and r.role = user_jobs.role
        and j.status = 'open'
        and j.job_date >= (now() at time zone 'Asia/Kolkata')::date
    )
  );
