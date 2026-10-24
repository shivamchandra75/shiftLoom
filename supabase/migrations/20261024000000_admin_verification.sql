-- Admin document review. Run after 20261023000000_user_documents.sql. Safe to re-run.

-- Required documents per worker role. Keep in sync with REQUIRED_DOCS in src/services/documentService.ts
create or replace function public.required_doc_types(p_role text)
returns text[]
language sql
immutable
as $$
  select case p_role
    when 'driver' then array['identity_proof', 'driving_license']
    when 'steward' then array['identity_proof', 'hygiene_certificate', 'medical_clearance']
    when 'chef' then array['identity_proof', 'culinary_degree', 'food_safety_certificate', 'work_experience_proof']
    else array[]::text[]
  end;
$$;

-- Approve or reject one or more documents of a single worker, then recompute the worker's
-- verification_status in the same transaction. Returns the new status.
create or replace function public.review_documents(p_document_ids uuid[], p_status text, p_reason text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_role text;
  v_required text[];
  v_new_status text;
begin
  if not public.is_admin() then
    raise exception 'Only admins can review documents';
  end if;
  if p_status not in ('verified', 'rejected') then
    raise exception 'Invalid review status';
  end if;
  if p_status = 'rejected' and coalesce(length(trim(p_reason)), 0) = 0 then
    raise exception 'A rejection reason is required';
  end if;
  if coalesce(array_length(p_document_ids, 1), 0) = 0 then
    raise exception 'No documents selected';
  end if;

  select min(user_id::text)::uuid into v_user_id from public.user_documents where id = any(p_document_ids);
  if v_user_id is null then
    raise exception 'Documents not found';
  end if;
  if exists (select 1 from public.user_documents where id = any(p_document_ids) and user_id <> v_user_id) then
    raise exception 'Documents must belong to one worker';
  end if;

  -- Business rule: a worker who already accepted a shift cannot be rejected
  if p_status = 'rejected' and exists (
    select 1 from public.user_jobs uj join public.jobs j on j.id = uj.job_id
    where uj.user_id = v_user_id and uj.status = 'accepted' and j.status in ('open', 'closed')
  ) then
    raise exception 'This worker has accepted upcoming shifts and cannot be rejected';
  end if;

  update public.user_documents
  set status = p_status,
      rejection_reason = case when p_status = 'rejected' then left(trim(p_reason), 500) end,
      updated_at = now()
  where id = any(p_document_ids);

  select role into v_role from public.users where id = v_user_id;
  v_required := public.required_doc_types(v_role);

  select case
    when exists (select 1 from public.user_documents where user_id = v_user_id and status = 'rejected' and doc_type = any(v_required)) then 'rejected'
    when (select count(*) from public.user_documents where user_id = v_user_id and status = 'verified' and doc_type = any(v_required)) = cardinality(v_required)
      and cardinality(v_required) > 0 then 'verified'
    else 'pending'
  end into v_new_status;

  update public.users set verification_status = v_new_status where id = v_user_id;
  return v_new_status;
end;
$$;

revoke all on function public.review_documents(uuid[], text, text) from public, anon;
grant execute on function public.review_documents(uuid[], text, text) to authenticated;

notify pgrst, 'reload schema';
