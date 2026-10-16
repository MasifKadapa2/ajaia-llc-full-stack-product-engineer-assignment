-- V2: sharing RLS and helpers (non-recursive)

create or replace function public.is_document_owner(doc_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.documents d
    where d.id = doc_id
      and d.owner_id = auth.uid()
  );
$$;

revoke all on function public.is_document_owner(uuid) from public;
grant execute on function public.is_document_owner(uuid) to authenticated;

create or replace function public.has_document_share(doc_id uuid, required_permission text default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.document_shares s
    where s.document_id = doc_id
      and s.shared_with_user_id = auth.uid()
      and (
        required_permission is null
        or s.permission = required_permission
        or (required_permission = 'viewer' and s.permission in ('viewer', 'editor'))
      )
  );
$$;

revoke all on function public.has_document_share(uuid, text) from public;
grant execute on function public.has_document_share(uuid, text) to authenticated;

create or replace function public.lookup_profile_by_email(target_email text)
returns table (id uuid, display_name text)
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.id, p.display_name
  from auth.users u
  inner join public.profiles p on p.id = u.id
  where lower(u.email) = lower(trim(target_email))
  limit 1;
$$;

revoke all on function public.lookup_profile_by_email(text) from public;
grant execute on function public.lookup_profile_by_email(text) to authenticated;

-- Replace owner-only document policies
drop policy if exists "Owners can select documents" on public.documents;
drop policy if exists "Owners can update documents" on public.documents;
drop policy if exists "Owners can delete documents" on public.documents;

create policy "Read documents you own or that are shared with you"
  on public.documents for select
  to authenticated
  using (
    owner_id = auth.uid()
    or public.has_document_share(id, 'viewer')
  );

create policy "Update documents you own or can edit"
  on public.documents for update
  to authenticated
  using (
    owner_id = auth.uid()
    or public.has_document_share(id, 'editor')
  )
  with check (
    owner_id = auth.uid()
    or public.has_document_share(id, 'editor')
  );

create policy "Delete only documents you own"
  on public.documents for delete
  to authenticated
  using (owner_id = auth.uid());

-- document_shares policies
create policy "View shares on your documents or shares involving you"
  on public.document_shares for select
  to authenticated
  using (
    shared_with_user_id = auth.uid()
    or public.is_document_owner(document_id)
  );

create policy "Owners manage shares"
  on public.document_shares for insert
  to authenticated
  with check (public.is_document_owner(document_id));

create policy "Owners update shares"
  on public.document_shares for update
  to authenticated
  using (public.is_document_owner(document_id))
  with check (public.is_document_owner(document_id));

create policy "Owners delete shares"
  on public.document_shares for delete
  to authenticated
  using (public.is_document_owner(document_id));
