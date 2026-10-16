# Papertrail

A calm, minimalist collaborative document workspace. Built with Next.js, Supabase Auth/PostgreSQL, Tiptap, and Tailwind.

## Features

### Core (V1)

- Email/password sign-up and sign-in (Supabase Auth)
- Protected workspace with document list and rich-text editor
- Debounced autosave with explicit **Saving…**, **Unsaved changes**, **Saved**, and **Save failed** states
- Owner-only rename and **permanent delete** (confirmation dialog); structured Tiptap JSON persistence

### Sharing (V2)

- Share with registered users by email (Editor or Viewer)
- **My Documents**, **Shared with Me**, and **All Documents** (owned ∪ shared, deduplicated)
- Title search within your authorized document set
- Read-only viewer mode in the UI + server enforcement
- Row Level Security with non-recursive `SECURITY DEFINER` helpers

### Import (V2)

- Import `.txt` and `.md` files (max **1 MB**)
- Markdown → Tiptap JSON (headings, emphasis, lists, links; raw HTML skipped)
- Creates a new owned document via server actions

## Prerequisites

- Node.js 20+
- [Supabase](https://supabase.com) project or local Supabase (`npx supabase start`)

## Setup

1. `npm install`
2. `cp .env.example .env.local` and set `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Apply migrations (in order):

   ```bash
   npx supabase start            # optional local stack
   npx supabase db push --local  # local
   # Hosted (after supabase link):
   npx supabase db push
   # Or run SQL files in supabase/migrations/ in the dashboard, in order
   ```

   Files:

   - `20251016120000_initial_schema.sql`
   - `20251016143000_v2_sharing_rls.sql`
   - `20251016150000_v3_editor_column_protection.sql`

4. `npm run dev -- -p 3000 -H 127.0.0.1` (recommended on macOS if `localhost:3000` is used by another app)

## Role semantics

| Role | Read | Edit body | Rename | Share | Delete |
| ---- | ---- | --------- | ------ | ----- | ------ |
| Owner | ✓ | ✓ | ✓ | ✓ | ✓ |
| Editor | ✓ | ✓ | ✗ | ✗ | ✗ |
| Viewer | ✓ | ✗ | ✗ | ✗ | ✗ |

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm test` | Vitest unit tests |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright (starts its own server on `127.0.0.1:3000`) |
| `npm run test:rls` | Live Supabase REST security tests (`RUN_RLS_TESTS=1`) |

### E2E

Playwright always starts `next dev` on **`http://127.0.0.1:3000`**. Stop any other process on port 3000 first.

```bash
# Smoke (single user)
E2E_USER_EMAIL=you@example.com E2E_USER_PASSWORD=secret npm run test:e2e e2e/smoke.spec.ts

# Two-account sharing (six env vars — see SUBMISSION.md)
npm run test:e2e e2e/sharing-two-account.spec.ts
```

## Environment variables

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` | E2E | Smoke test account |
| `E2E_OWNER_*` / `E2E_RECIPIENT_*` / `E2E_STRANGER_*` | E2E | Two-account sharing spec |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | E2E / RLS tests | Same project as the app |

Never expose the **service role** key in the Next.js app.

## Known limitations

- No public links, email delivery, or real-time co-editing
- Editors can update document rows at the DB level; the app only sends title changes for owners
- Optimistic concurrency uses `updated_at` when provided; simultaneous edits may still conflict
- RLS integration tests require a live Supabase instance (not run in default CI unless configured)

## UX

- Sonner toasts for import, sharing, save failures, and auth messages
- Account menu and `/logout` fallback route

## Future ideas

- Profile editing, share notifications, DOCX import, trash/soft delete
