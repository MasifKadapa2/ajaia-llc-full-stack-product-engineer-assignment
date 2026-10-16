-- Papertrail initial schema (V1) with document_shares prepared for V2

create extension if not exists "pgcrypto";

-- Profiles linked to Supabase Auth users
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(new.email, '@', 1),
      'User'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Documents
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documents_title_length check (
    char_length(title) <= 200 and char_length(trim(title)) > 0
  )
);

create index documents_owner_id_updated_at_idx
  on public.documents (owner_id, updated_at desc);

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- V2 sharing (schema only in V1)
create table public.document_shares (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  shared_with_user_id uuid not null references public.profiles (id) on delete cascade,
  permission text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_shares_permission_check
    check (permission in ('editor', 'viewer')),
  constraint document_shares_unique_recipient
    unique (document_id, shared_with_user_id)
);

create trigger document_shares_set_updated_at
  before update on public.document_shares
  for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.document_shares enable row level security;

-- Profiles: users can read any profile (for display names) and update their own
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Documents: owner-only access for V1
create policy "Owners can select documents"
  on public.documents for select
  to authenticated
  using (owner_id = auth.uid());

create policy "Owners can insert documents"
  on public.documents for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "Owners can update documents"
  on public.documents for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Owners can delete documents"
  on public.documents for delete
  to authenticated
  using (owner_id = auth.uid());

-- document_shares: no V1 policies (sharing in V2)
