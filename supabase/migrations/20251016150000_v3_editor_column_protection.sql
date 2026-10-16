-- V3: DB-enforced column protection on document updates + safer share lookup

create or replace function public.enforce_documents_update_privileges()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() = old.owner_id then
    if new.owner_id is distinct from old.owner_id then
      raise exception 'Cannot change document ownership' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.title is distinct from old.title then
    raise exception 'Editors cannot rename documents' using errcode = '42501';
  end if;
  if new.owner_id is distinct from old.owner_id then
    raise exception 'Cannot change document ownership' using errcode = '42501';
  end if;
  if new.created_at is distinct from old.created_at then
    raise exception 'Cannot modify created_at' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists documents_enforce_update_privileges on public.documents;
create trigger documents_enforce_update_privileges
  before update on public.documents
  for each row
  execute function public.enforce_documents_update_privileges();

drop policy if exists "Update documents you own or can edit" on public.documents;

create policy "Owners can update owned documents"
  on public.documents for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Editors can update shared documents"
  on public.documents for update
  to authenticated
  using (public.has_document_share(id, 'editor'))
  with check (public.has_document_share(id, 'editor'));

create or replace function public.lookup_profile_by_email_for_document_share(
  doc_id uuid,
  target_email text
)
returns table (id uuid, display_name text)
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.id, p.display_name
  from auth.users u
  inner join public.profiles p on p.id = u.id
  where public.is_document_owner(doc_id)
    and lower(u.email) = lower(trim(target_email))
  limit 1;
$$;

revoke all on function public.lookup_profile_by_email_for_document_share(uuid, text) from public;
grant execute on function public.lookup_profile_by_email_for_document_share(uuid, text) to authenticated;

revoke execute on function public.lookup_profile_by_email(text) from authenticated;
revoke execute on function public.lookup_profile_by_email(text) from anon;
