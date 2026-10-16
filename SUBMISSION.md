# Submission checklist

**Last verification:** 2026-10-16 (local machine, local Supabase on `127.0.0.1:54321`, app E2E on `127.0.0.1:3000`)

## URLs

| Item | Value |
| ---- | ----- |
| Deployed app | **TODO:** `https://` |
| Repository | **TODO:** `https://github.com/...` |
| Walkthrough video | See `VIDEO_URL.md` |

## Test status (actual exit codes)

| Command | Exit | Result |
| ------- | ---- | ------ |
| `npm test` | **0** | **21 passed**, **5 skipped** (RLS suite skipped without `RUN_RLS_TESTS=1`) — Vitest, mostly mocks |
| `npx tsc --noEmit` | **0** | TypeScript |
| `npm run lint` | **0** | ESLint |
| `npm run build` | **0** | Next.js production build |
| `npm run test:e2e` | **0** | **1 passed**, **1 skipped** — Playwright + local dev server; sharing flow; smoke skipped (no `E2E_USER_*`) |
| `RUN_RLS_TESTS=1 npm test -- src/test/rls-rest.security.test.ts` | **0** | **5 passed** — live local Supabase REST |

## Environment for E2E

Set in the shell (never commit values):

```bash
# Smoke (single user)
E2E_USER_EMAIL=
E2E_USER_PASSWORD=

# Two-account sharing (+ Supabase for REST step in spec)
E2E_OWNER_EMAIL=
E2E_OWNER_PASSWORD=
E2E_RECIPIENT_EMAIL=
E2E_RECIPIENT_PASSWORD=
E2E_STRANGER_EMAIL=
E2E_STRANGER_PASSWORD=
SUPABASE_URL=              # e.g. http://127.0.0.1:54321 locally
SUPABASE_ANON_KEY=
```

## Hosted Supabase migrations (human — not run automatically)

Apply the same three files as local, in order:

1. `20251016120000_initial_schema.sql`
2. `20251016143000_v2_sharing_rls.sql`
3. `20251016150000_v3_editor_column_protection.sql`

**Option A — Supabase CLI (recommended after `supabase link`):**

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

**Option B — Dashboard:** SQL Editor → run each migration file contents in order.

**After push:** Sign in on the deployed app and smoke-test create, share, editor save, viewer read-only, owner delete.

Production DB is **not verified** until you complete the above on your hosted project.

## Deliverables

| Deliverable | Status |
| ----------- | ------ |
| README.md | Done |
| ARCHITECTURE.md | Done |
| AI_WORKFLOW.md | Done |
| SUBMISSION.md | This file |
| VIDEO_URL.md | **TODO** — real URL |
| `docs/screenshots/` | **TODO** — see `docs/screenshots/README.md` |

## Known limitations

- No real-time collaboration, public share links, or outbound email for invites.
- Invites require an existing Papertrail account.
- Use **127.0.0.1:3000** on this host if `localhost:3000` is occupied.
- Viewer REST write denial returns **no updated rows** (`[]` with `Prefer: return=representation`), not always HTTP 4xx.
- Hosted deploy + migration not verified in this checklist.

## Screenshots

**TODO:** Add PNGs under `docs/screenshots/` per `docs/screenshots/README.md`.
