# Papertrail architecture

## Overview

Papertrail is a Next.js App Router application backed by Supabase (PostgreSQL + Auth). The browser talks to Supabase through the anon key with cookie-backed sessions (`@supabase/ssr`). Business rules live in server actions, a repository layer, Zod validation, and PostgreSQL RLS.

## Main components

| Layer | Responsibility |
| ----- | -------------- |
| `src/app/(auth)/*` | Sign-in / sign-up |
| `src/app/(app)/documents/*` | Lists, editor route, shared views |
| `src/app/actions/*` | Server actions (documents, shares, import, auth) |
| `src/lib/documents/*` | Repository, permissions, access resolution, shares |
| `src/lib/validation/*` | Zod schemas for documents and imports |
| `src/components/editor/*` | Tiptap editor, toolbar, debounced autosave |
| `src/components/sharing/*` | Owner share dialog |
| `src/components/documents/delete-document-dialog.tsx` | Owner delete with confirmation |
| `supabase/migrations/*` | Versioned schema and RLS |

## Data model

- **profiles** — `id` → `auth.users`, `display_name`
- **documents** — `title`, `content` (JSONB Tiptap doc), `owner_id`, timestamps
- **document_shares** — `document_id`, `shared_with_user_id`, `permission` (`editor` \| `viewer`), unique `(document_id, shared_with_user_id)`

Ownership is never transferred by sharing.

## Permission design

### Application layer

`resolveDocumentAccess()` returns capabilities: read, edit content, rename, delete, manage shares. Server actions call repository functions that re-check access before mutations.

### Database layer

- **RLS** on all three tables; no service role in the app.
- **SECURITY DEFINER** helpers (`is_document_owner`, `has_document_share`) use fixed `search_path` and minimal `GRANT EXECUTE` to `authenticated`.
- **Trigger** `enforce_documents_update_privileges` blocks non-owners from changing `title`, `owner_id`, or `created_at`; blocks owners from reassigning `owner_id`.
- **Split UPDATE policies** — owners vs editors on `documents`.
- **Share lookup** — `lookup_profile_by_email_for_document_share(doc_id, email)` only returns a row when the caller owns `doc_id` (reduces open email enumeration).

### Role matrix (intended)

| Role | SELECT | UPDATE content | UPDATE title | DELETE | Shares |
| ---- | ------ | -------------- | ------------ | ------ | ------ |
| Owner | ✓ | ✓ | ✓ | ✓ | ✓ |
| Editor | ✓ | ✓ | ✗ (DB + app) | ✗ | ✗ |
| Viewer | ✓ | ✗ | ✗ | ✗ | ✗ |
| Other | ✗ | ✗ | ✗ | ✗ | ✗ |

## Autosave strategy

- Client debounce (~800ms) with generation counter so stale responses are ignored.
- UI states: **Saving…**, **Unsaved changes** (debounce pending), **Saved** (server confirmed, no pending edits), **Save failed**.
- Editors send **content only** on save; owners may send title + content.
- Optional `expectedUpdatedAt` optimistic check returns a conflict error instead of silently overwriting.

## Import pipeline

`.txt` / `.md` (≤ 1 MB) → parse on server → Tiptap JSON → `createDocument()` with session-derived `owner_id`.

## Delete workflow

- **UI:** Owners see **Delete** on the document page; `alertdialog` confirms permanent removal.
- **Server:** `deleteDocumentAction` → `deleteDocument()` checks `access.canDelete`, then `DELETE` with `owner_id` match.
- **RLS:** Policy `Delete only documents you own` — editors/viewers/strangers cannot delete via REST.
- **After delete:** Revalidate list paths; client navigates to `/documents/mine` with success toast.
