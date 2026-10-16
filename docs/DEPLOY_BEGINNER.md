# Deploy Papertrail from scratch (beginner guide)

You need **two free accounts** and about **30–45 minutes**:

1. **Supabase** — database + login (backend)
2. **Vercel** — hosts the Next.js website (frontend)

You also need **GitHub** (or similar) so Vercel can pull your code. This guide uses GitHub + Vercel + Supabase.

---

## Part A — Put your code on GitHub

### A1. Create a GitHub account

Go to [https://github.com/signup](https://github.com/signup) if you do not have one.

### A2. Create a new empty repository

1. GitHub → **+** → **New repository**
2. Name: `papertrail` (or any name)
3. **Private** is fine for assignments
4. Do **not** add README, .gitignore, or license (you already have them locally)
5. Click **Create repository**

### A3. Push your project from your Mac

Open Terminal in your project folder (`ajaia`) and run:

```bash
cd /Users/masifk/ajaia

# First-time only: make sure secrets are NOT committed
git status
# You must NOT see .env.local staged. It should be ignored.

git add -A
git commit -m "Papertrail assignment submission"

git remote add origin https://github.com/YOUR_USERNAME/papertrail.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` and repo name with yours. GitHub may ask you to sign in (browser or token).

**If `git commit` says “nothing to commit”:** you may already be committed; skip to `git push`.

---

## Part B — Create cloud Supabase (database + auth)

### B1. New project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. **New project**
3. Pick an organization (create one if needed)
4. **Name:** `papertrail` (any name)
5. **Database password:** generate a strong password and **save it** in a password manager (you rarely need it day-to-day; migrations use the dashboard/CLI)
6. **Region:** choose closest to you
7. Wait until status is **Healthy** (a few minutes)

### B2. Run the database migrations (SQL)

You must run **three files in order**. Easiest way for beginners: **SQL Editor**.

1. Supabase dashboard → **SQL Editor** → **New query**
2. Open on your computer: `supabase/migrations/20251016120000_initial_schema.sql`
3. Copy **all** contents → paste into SQL Editor → **Run**
4. Repeat for:
   - `20251016143000_v2_sharing_rls.sql`
   - `20251016150000_v3_editor_column_protection.sql`

Each should finish with “Success”. If one fails, **stop** and fix that error before running the next file.

### B3. Make sign-up easy for reviewers (recommended)

1. Dashboard → **Authentication** → **Providers** → **Email**
2. Turn **off** “Confirm email” (wording may be “Enable email confirmations”) for the assignment demo  
   — so reviewers can sign up and sign in immediately.

### B4. Copy API keys for Vercel

1. Dashboard → **Project Settings** (gear) → **API**
2. Copy:
   - **Project URL** → you will set `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → you will set `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Never put the **service_role** key in Vercel or GitHub.

---

## Part C — Deploy the website on Vercel

### C1. Vercel account

Go to [https://vercel.com/signup](https://vercel.com/signup) and sign up ( **Continue with GitHub** is easiest).

### C2. Import the project

1. Vercel dashboard → **Add New…** → **Project**
2. **Import** your `papertrail` GitHub repo
3. Framework should detect **Next.js** automatically
4. **Environment variables** — add these (paste from Supabase B4):

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (anon key) |

5. Click **Deploy**
6. Wait until **Congratulations** — you get a URL like `https://papertrail-xxxxx.vercel.app`

### C3. Tell Supabase your Vercel URL (required for login)

1. Copy your Vercel URL (no trailing slash), e.g. `https://papertrail-xxxxx.vercel.app`
2. Supabase → **Authentication** → **URL configuration**
3. **Site URL:** paste your Vercel URL
4. **Redirect URLs:** add these two lines (replace with your URL):

```
https://papertrail-xxxxx.vercel.app/**
http://localhost:3000/**
```

5. **Save**

### C4. Redeploy once (optional but safe)

Vercel → your project → **Deployments** → latest → **⋯** → **Redeploy**

---

## Part D — Test the live site (5 minutes)

On your **Vercel URL**:

1. **Sign up** with a test email + password (8+ chars)
2. **New Document** → type title and body → wait for **Saved**
3. **Import** a small `.txt` file
4. Sign up a **second account** in another browser (or incognito)
5. As owner: **Share** → second email → **Editor**
6. As guest: **Shared with Me** → open → edit
7. Owner: change guest to **Viewer** → guest should see **Read-only**, no “Saved”
8. Owner: **Delete** a test document

If login fails after deploy, recheck **Part C3** (Site URL + Redirect URLs).

---

## Part E — What to submit to your assignment

1. **Live URL** → paste into `SUBMISSION.md` and your Google Drive `reviewer-credentials.txt`
2. **Two test accounts** (example):

```text
Live app: https://YOUR-APP.vercel.app

Owner:  reviewer1@yourdomain.com  /  YourSecurePass1!
Guest:  reviewer2@yourdomain.com  /  YourSecurePass2!

Create these by signing up on the live site before submitting.
```

3. **GitHub** link or zip in Drive
4. **Video** → record 3–5 min → put link in `VIDEO_URL.md`
5. **Screenshots** → `docs/screenshots/`

---

## Troubleshooting

| Problem | Fix |
|--------|-----|
| “Invalid API key” | Wrong anon key or URL in Vercel env; redeploy after fixing |
| Sign-in loops or 401 | Supabase **Site URL** and **Redirect URLs** (Part C3) |
| “Email not confirmed” | Disable email confirmations (Part B3) or confirm via email |
| Sharing fails “user not found” | Guest must **sign up first** on the live site |
| Works locally, not on Vercel | Migrations only on local — run Part B2 on **cloud** project |
| Blank page after deploy | Vercel → Deployment → **Logs**; usually missing env vars |

---

## Quick reference: migration order

1. `20251016120000_initial_schema.sql`
2. `20251016143000_v2_sharing_rls.sql`
3. `20251016150000_v3_editor_column_protection.sql`

Local (optional): `npx supabase db push --local`  
Cloud: SQL Editor or `npx supabase link` then `npx supabase db push` (advanced).
