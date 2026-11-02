-- Push notifications for shift cancellations.
-- Flow: cancel (user_jobs / jobs update) -> trigger inserts into notifications -> trigger calls the
-- send-push Edge Function through pg_net -> Expo push API.
-- Needs two Vault secrets (set once per project, never committed):
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   select vault.create_secret('<random string>', 'push_webhook_secret');  -- same value as the function's PUSH_WEBHOOK_SECRET
-- Safe to re-run: every object is dropped/replaced before it is created.

create extension if not exists pg_net with schema extensions;

-- One row per device. Token is the key so a device that changes accounts moves to the new user.
create table if not exists public.push_tokens (
  token text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user_id_idx on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;

drop policy if exists "Users delete own push tokens" on public.push_tokens;
create policy "Users delete own push tokens" on public.push_tokens
  for delete to authenticated using (user_id = (select auth.uid()));

-- security definer: claiming a token another account registered on this device must bypass RLS
create or replace function public.register_push_token(p_token text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.push_tokens (token, user_id) values (p_token, auth.uid())
  on conflict (token) do update set user_id = excluded.user_id, updated_at = now();
$$;
revoke execute on function public.register_push_token(text) from public, anon;
grant execute on function public.register_push_token(text) to authenticated;

-- Table already existed in the project (created outside migrations); this matches its shape.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null,
  is_read boolean not null default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('job_posted', 'job_cancelled', 'worker_cancelled', 'shift_reminder', 'verification_status', 'slots_filled'));
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;

-- No insert policy: rows only come from the triggers below. Replaces the old FOR ALL policy,
-- which let clients insert (and so push) rows themselves.
drop policy if exists "Users can view and update own notifications" on public.notifications;
drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications" on public.notifications
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "Users delete own notifications" on public.notifications;
create policy "Users delete own notifications" on public.notifications
  for delete to authenticated using (user_id = (select auth.uid()));

-- Clients may only flip is_read, not rewrite the message
revoke insert, update on public.notifications from anon, authenticated;
grant update (is_read) on public.notifications to authenticated;

-- Worker cancelled their shift -> tell the admin who posted the job
create or replace function public.notify_user_job_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, message, metadata)
  select j.created_by,
         'worker_cancelled',
         'Worker cancelled a shift',
         -- format() turns nulls into '', so a missing field can never null the message and roll back the cancel
         format('%s (%s) cancelled %s on %s%s',
           coalesce(nullif(trim(concat_ws(' ', u.first_name, u.last_name)), ''), 'A worker'),
           new.role, j.company_name, to_char(j.job_date, 'FMDD Mon'),
           '. Reason: ' || nullif(new.cancel_reason, '')),
         jsonb_build_object('route', '/admin-job/[id]', 'jobId', j.id)
  from public.jobs j
  left join public.users u on u.id = new.user_id
  where j.id = new.job_id and j.created_by is not null;
  return null;
end;
$$;

drop trigger if exists on_user_job_cancelled on public.user_jobs;
create trigger on_user_job_cancelled
  after update of status on public.user_jobs
  for each row
  when (new.status = 'cancelled_by_user' and old.status is distinct from new.status)
  execute function public.notify_user_job_cancelled();

-- Admin cancelled the job -> tell every worker still booked on it
create or replace function public.notify_job_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, message, metadata)
  select uj.user_id,
         'job_cancelled',
         'Shift cancelled',
         format('%s on %s, %s was cancelled%s',
           new.company_name, to_char(new.job_date, 'FMDD Mon'), to_char(new.start_time, 'FMHH12:MI AM'),
           '. Reason: ' || nullif(new.cancel_reason, '')),
         jsonb_build_object('route', '/job/[id]', 'jobId', new.id)
  from public.user_jobs uj
  where uj.job_id = new.id and uj.status = 'accepted';
  return null;
end;
$$;

drop trigger if exists on_job_cancelled on public.jobs;
create trigger on_job_cancelled
  after update of status on public.jobs
  for each row
  when (new.status = 'cancelled' and old.status is distinct from new.status)
  execute function public.notify_job_cancelled();

-- New notification row -> push it. pg_net is async, so a slow or failing push never blocks the cancel.
create or replace function public.push_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url');
  v_secret text := (select decrypted_secret from vault.decrypted_secrets where name = 'push_webhook_secret');
begin
  if v_url is null or v_secret is null then
    raise warning 'push_notification: vault secrets project_url / push_webhook_secret missing, push skipped';
    return null;
  end if;
  perform net.http_post(
    url := v_url || '/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body := jsonb_build_object('record', to_jsonb(new))
  );
  return null;
end;
$$;

drop trigger if exists on_notification_created on public.notifications;
create trigger on_notification_created
  after insert on public.notifications
  for each row execute function public.push_notification();

-- Trigger functions are not meant to be called over the API
revoke execute on function public.notify_user_job_cancelled() from public, anon, authenticated;
revoke execute on function public.notify_job_cancelled() from public, anon, authenticated;
revoke execute on function public.push_notification() from public, anon, authenticated;
