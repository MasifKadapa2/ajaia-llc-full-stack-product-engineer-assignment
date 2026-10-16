# AI workflow — honest disclosure

## Which AI tools I used

- **AI coding agents (Cursor / Claude-style)** for scaffolding, feature drafts, migrations, tests, and docs.
- **AI pair-programming assistant in terminal** for deploy debugging (Vercel ERESOLVE, env vars), perf triage, conflict/redirect/toast bugs, and demo scripting.
- No autonomous agents with write access to production data. All DB changes via reviewed SQL I ran in Supabase SQL Editor.

## Where AI materially sped up my work

- **Scaffolding (hours → minutes):** Next.js App Router shell, Supabase SSR clients + middleware, shadcn/ui wiring, Tiptap editor + toolbar shell.
- **Boilerplate-heavy features:** sharing dialog + server actions, import pipeline (`.txt`/`.md` → Tiptap JSON), list pages with search, Zod schemas, Vitest + Playwright + RLS REST suites.
- **Docs first drafts:** README, ARCHITECTURE, SUBMISSION table, deploy guide — I corrected all URLs/statuses to explicit TODOs where unverified.
- **Deploy + perf debugging:** diagnosed Vercel `ERESOLVE vitest/@types/node` (fixed with `.npmrc legacy-peer-deps`), wrong `NEXT_PUBLIC_SUPABASE_URL`, and N+1 list queries from log snippets.

## What AI output I changed or rejected

- **Rejected false “Saved”:** AI showed `Saved` during debounce. I added explicit `Unsaved changes` vs `Saved-only-after-server-confirm` + generation counter.
- **Rejected `startTransition(async…)` navigation:** broke New Document / Delete / Import redirects. Replaced with plain async handlers + `router.replace`.
- **Rejected stale autosave:** editor closure kept sending old `updated_at` → false conflicts on second save. Fixed with `updatedAtRef`.
- **Rejected open user lookup:** AI drafted global email RPC. Replaced with owner-scoped `lookup_profile_by_email_for_document_share(doc_id,email)`.
- **Rejected weak authorization:** AI relied on hidden buttons. I added server `resolveDocumentAccess` re-checks + RLS split UPDATE policies + `enforce_documents_update_privileges` trigger after REST probing showed editors could PATCH `title`.
- **Rejected N+1 + `select *` lists:** AI fetched full JSON bodies + per-row profile/share queries. Rewrote to minimal columns, batched shares/profiles, `limit 100`, skeleton UI.
- **Rejected double revalidation:** AI revalidated 3 paths on every autosave (~800ms). Now only title renames revalidate; content saves skip.
- **Rejected noisy sign-out:** AI toasted `Sign out failed` on `NEXT_REDIRECT`. Now swallows redirect digest, toasts only real errors.
- **Rejected duplicate Tiptap extension:** `StarterKit.configure({ underline:false })` + standalone Underline.
- I did not accept any AI claim about deployment, URLs, or test results without running them.

## How I verified correctness, UX, and reliability

- **Correctness:** `npm test` (21 passed, 5 skipped without live RLS), `npx tsc --noEmit`, `npm run lint`, `npm run build` after every substantive change. Local Supabase (`npx supabase start`) for migrations in order. `RUN_RLS_TESTS=1` REST suite: editor content ok, title `>=400`, stranger `[]`, editor delete `[]`, owner delete ok. Playwright sharing spec: invite → edit → viewer read-only → revoke → stranger blocked.
- **UX:** manual pass on prod URL for every demo step (create → Saved → refresh persists → share → edit → viewer badge → revoke not-found → import → delete lands `/documents/mine`). Fixed frozen navigations with `loading.tsx` skeletons. Checked toasts readable, no passwords/tokens on screen, console clean.
- **Reliability:** hosted DB verified via `SELECT policyname FROM pg_policies` (V3 final state). Vercel envs verified via `vercel env pull` (URL `https://…`, key `eyJ…`). Pinned `vercel.json regions: ["bom1"]` near Supabase `ap-south-1` after measuring 2s cross-region APIs. Never committed `.env.local` or service_role; anon key only in Vercel env.
- **What remains human:** prod redeploy after each fix, reviewer accounts, video, screenshots. All placeholders use explicit TODOs — nothing invented.
