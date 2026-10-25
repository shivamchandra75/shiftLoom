-- Worker verification documents: private storage bucket + one row per (user, document type).
-- Safe to re-run. Run after 20261021000000_admin_role.sql (uses public.is_admin()).

create table if not exists public.user_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  doc_type text not null check (doc_type in (
    'identity_proof', 'driving_license', 'hygiene_certificate', 'medical_clearance',
    'culinary_degree', 'food_safety_certificate', 'work_experience_proof'
  )),
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 5242880), -- 5 MB
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, doc_type)
);

alter table public.user_documents enable row level security;

drop policy if exists "Users read own documents" on public.user_documents;
create policy "Users read own documents" on public.user_documents
  for select to authenticated using (auth.uid() = user_id or public.is_admin());

-- Workers can only ever submit (or re-submit) a document as pending
drop policy if exists "Users submit own documents" on public.user_documents;
create policy "Users submit own documents" on public.user_documents
  for insert to authenticated with check (auth.uid() = user_id and status = 'pending' and rejection_reason is null);

drop policy if exists "Users resubmit own documents" on public.user_documents;
create policy "Users resubmit own documents" on public.user_documents
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and status = 'pending' and rejection_reason is null);

drop policy if exists "Admins review documents" on public.user_documents;
create policy "Admins review documents" on public.user_documents
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Private bucket; the 5 MB limit and file types are also enforced by Storage itself
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('user-documents', 'user-documents', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Files live under "<user id>/..." so each worker can only touch their own folder
drop policy if exists "Users upload own document files" on storage.objects;
create policy "Users upload own document files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'user-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users read own document files" on storage.objects;
create policy "Users read own document files" on storage.objects
  for select to authenticated
  using (bucket_id = 'user-documents' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

drop policy if exists "Users delete own document files" on storage.objects;
create policy "Users delete own document files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'user-documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- Workers may move their own verification_status back to 'pending' (when resubmitting),
-- but only an admin (or the SQL editor) can set 'verified' or 'rejected'.
create or replace function public.prevent_self_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.verification_status is distinct from old.verification_status
     and new.verification_status <> 'pending'
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only an admin can change verification status';
  end if;
  return new;
end;
$$;

drop trigger if exists users_prevent_self_verification on public.users;
create trigger users_prevent_self_verification
  before update of verification_status on public.users
  for each row execute function public.prevent_self_verification();

notify pgrst, 'reload schema';
