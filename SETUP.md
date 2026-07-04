# Resolve AI — Access Gate + Usage Logging Setup

## What this adds
- Public demo now requires a password (`/login.html`).
- `/admin.html` is a separate dashboard requiring a separate admin password.
- Every `/api/analyze` call logs metadata (channel, category, urgency, flags,
  errors) to Supabase — no complaint text is stored, only classifications.

## 1. Copy files into your project
Drop these into your existing repo (same structure):
```
middleware.js
login.html
admin-login.html
admin.html
api/auth.js
api/admin-auth.js
api/admin-stats.js
api/analyze.js   (replace your existing one)
```
Your existing `index.html` and `package.json` are untouched.

## 2. Create the Supabase project (free tier)
1. [UNVERIFIED — verify current UI] Go to supabase.com, create a new project.
2. Open the SQL Editor, paste and run `supabase-setup.sql`.
3. Go to Project Settings → API. Copy:
   - `Project URL` → this is `SUPABASE_URL`
   - `service_role` key (NOT the anon key — service_role bypasses RLS,
     which is what lets your edge function write logs) → `SUPABASE_SERVICE_ROLE_KEY`

**Never expose the service_role key to the browser.** It only belongs in
Vercel's server-side environment variables, which is where we're using it
(inside `api/analyze.js` and `api/admin-stats.js`, both edge functions —
never sent to the client).

## 3. Set environment variables in Vercel
Project → Settings → Environment Variables, add:
| Key | Value |
|---|---|
| `SITE_PASSWORD` | whatever code you'll give pilot users |
| `ADMIN_PASSWORD` | a different, stronger password — only you use this |
| `SUPABASE_URL` | from step 2 |
| `SUPABASE_SERVICE_ROLE_KEY` | from step 2 |
| `GEMINI_API_KEY` | (you already have this) |

Redeploy after adding env vars — Vercel doesn't hot-reload them.

## 4. Test
1. Visit your site → should redirect to `/login.html`.
2. Enter `SITE_PASSWORD` → should land on the main app.
3. Run one complaint through it.
4. Visit `/admin.html` → should redirect to `/admin-login.html`.
5. Enter `ADMIN_PASSWORD` → should see the request you just made logged.

## Known limitations (by design — this is an MVP gate, not enterprise auth)
- One shared password per audience, not per-user accounts.
- No rate limiting yet — someone with the password could hammer your Gemini
  quota. Fine for a handful of pilot users; not fine at 50+ external users.
- Cookie-based, no session revocation UI. To force logout everyone, rotate
  `SITE_PASSWORD`/`ADMIN_PASSWORD`.
- When you get a real paying customer who needs their own users/roles,
  replace this with Supabase Auth (same Supabase project, minimal extra
  cost) rather than patching this further.
