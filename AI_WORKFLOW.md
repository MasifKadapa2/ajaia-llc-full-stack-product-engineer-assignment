# AI workflow (honest disclosure)

This project was built with AI-assisted engineering (Cursor / Claude-style agents) under human direction.

## How AI was used

- **Scaffolding** — Next.js, Supabase client setup, shadcn/ui, Tiptap editor shell.
- **Feature implementation** — Sharing, import, list views, migrations, and tests were drafted by AI and then run, fixed, and re-run locally.
- **Security review** — V3 added DB triggers and split RLS policies after AI + manual REST probing showed editors could PATCH `title` without DB enforcement.
- **Documentation** — README, architecture, and submission templates drafted by AI; URLs and deployment status use explicit TODOs where not verified.

## Verification practices

- `npm test`, `tsc`, `lint`, `build` run after substantive changes.
- Local Supabase (`npx supabase start`) for migrations and REST checks.
- Playwright smoke on `127.0.0.1:3000` with env-based test users (no hardcoded passwords in repo).
- Optional `RUN_RLS_TESTS=1` integration file for direct REST assertions.

## Corrections made after AI output

- Autosave falsely showing “Saved” during pending debounce — fixed with explicit unsaved state.
- `startTransition(async …)` breaking “New Document” navigation — replaced with async handler.
- Editor not reloading content on navigation — `key={documentId}` remount.
- Editor REST title mutation — V3 trigger + split policies.
- Open email lookup RPC — replaced with document-scoped lookup for owners only.

## Final completion gate (2026-10-16)

- Implemented **owner document delete** (server action, RLS-aligned repository, confirmation UI, unit + REST tests).
- Fixed Tiptap duplicate **underline** extension (`StarterKit.configure({ underline: false })`).
- Re-ran `npm test`, `tsc`, `lint`, `build`, `test:e2e`, and `RUN_RLS_TESTS=1` locally; results recorded in `SUBMISSION.md`.

## Human responsibilities before submission

- Deploy to production and fill `SUBMISSION.md` URLs.
- Run `npx supabase db push` (or SQL) on the **hosted** project.
- Record walkthrough video and link in `VIDEO_URL.md`.
- Add screenshots under `docs/screenshots/`.
