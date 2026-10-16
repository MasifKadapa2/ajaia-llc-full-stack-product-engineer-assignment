# AI usage in Papertrail engineering

Papertrail the product contains **no AI features** — no assistant, summarizer, generator, or MCP client. AI was used as a **build tool**. Prior chat prompts and agent execution logs are **not in this repo and inaccessible**; claims below rest on files present (`AI_WORKFLOW.md`, tests, migrations, git history), not on recalled conversations.

## Tools actually used

- AI coding agents (Cursor / Claude-style) for scaffolding, feature drafts, migrations, tests, docs.
- Terminal AI assistant for deploy debugging, perf triage, and bug fixes.
- No MCP servers, agent-transcript logs, or `.opencode/` / `opencode.json` / `.cursor/` configs exist in this repo (verified by search).

## Where AI helped

- **Scaffolding:** Next.js App Router shell, Supabase SSR clients + middleware (`src/lib/supabase/*`, `src/middleware.ts`), shadcn/ui wiring, Tiptap editor + toolbar shell (`src/components/editor/*`).
- **Boilerplate features:** sharing dialog + server actions (`src/components/sharing/share-document-dialog.tsx`, `src/app/actions/shares.ts`), import pipeline (`.txt`/`.md` → Tiptap JSON: `src/app/actions/import.ts`, `src/lib/import/*`, `src/lib/validation/import.ts`), list pages + search (`src/app/(app)/documents/*`), Zod schemas (`src/lib/validation/*`), Vitest/Playwright/RLS suites (`src/lib/documents/*.test.ts`, `e2e/*`, `src/test/rls-rest.security.test.ts`).
- **Docs drafts:** `README.md`, `ARCHITECTURE.md`, `SUBMISSION.md`, `docs/DEPLOY_BEGINNER.md` outlines; all URLs/statuses corrected to explicit TODOs where unverified.
- **Log diagnosis:** Vercel `ERESOLVE vitest/@types/node` → `.npmrc legacy-peer-deps`; wrong `NEXT_PUBLIC_SUPABASE_URL` caught via `vercel env pull`; N+1 lists from behavior + code reading.

## What I changed or rejected (human judgment)

- Fake `Saved` during debounce → explicit `Saving…` / `Unsaved changes` / `Saved`-only-after-server-confirm + generation counter (`src/components/editor/document-editor.tsx`).
- `startTransition(async…)` breaking New Document / Delete / Import navigation → plain async handlers + `router.replace`.
- Stale `updatedAt` closure causing false conflicts → `updatedAtRef`.
- Open email lookup RPC → owner-scoped `lookup_profile_by_email_for_document_share(doc_id, email)`.
- UI-only permissions → server `resolveDocumentAccess()` re-checks (`src/lib/documents/access.ts`) + RLS split UPDATE policies + `enforce_documents_update_privileges` trigger (`supabase/migrations/20251016150000_v3_editor_column_protection.sql`), added after REST probing showed editors could PATCH `title`.
- `select *` + per-row queries + per-keystroke `revalidatePath` → minimal columns, batched shares/profiles, `limit 100`, revalidate only on title rename; `loading.tsx` skeletons.
- Duplicate Tiptap underline → `StarterKit.configure({ underline: false })`.
- False `Sign out failed` toast on `NEXT_REDIRECT` → digest check (`src/components/layout/user-menu.tsx`).

## Verification (human-owned)

- `npm test` (21 passed, 5 skipped without live RLS), `npx tsc --noEmit`, `npm run lint`, `npm run build` after substantive changes.
- Local Supabase migrations in order (V1→V2→V3); hosted verified via `SELECT policyname FROM pg_policies`.
- `RUN_RLS_TESTS=1` suite: editor content 2xx, title PATCH ≥400, stranger read `[]`, editor delete `[]` + row survives, owner delete ok. Playwright `sharing-two-account.spec.ts`: invite → edit → viewer read-only → revoke → stranger blocked. Smoke spec asserts exact `Saved` + reload persistence.
- Manual prod pass per demo step; console clean; no `.env.local`, service_role, or passwords committed (anon key only in Vercel env).

## Multi-agent / MCP — honest status

- **Not evidenced:** no concurrent specialized agents, no MCP configured/connected/invoked in this repo. Do not claim otherwise.
- **Actual method:** single assistant + human reviewer with one task list, small diffs, deterministic gates (tests) before commit.
- **Future ideas (not past usage):** planner/implementer/tester/security-reviewer roles with acceptance criteria per task; preserved transcripts; optional Supabase MCP for policy diffing. Adopt only when repeated DB/doc operations justify it.

## What to verify before citing this file

- Re-run `npm test`, `tsc`, `lint`, `build`; note exit codes/dates in `SUBMISSION.md`.
- Re-confirm hosted `pg_policies` = V3 final and Vercel envs via `vercel env pull` (check prefixes only).
- Keep prior-prompt/productivity claims out of the demo — cite files + tests, not memory.
