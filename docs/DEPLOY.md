# 🚀 Resolve AI - Complete Deployment Guide

## Step 1: Create Supabase Project (5 minutes)

### 1.1 Go to Supabase
- Visit https://supabase.com
- Click **"Start your project"**
- Sign up with GitHub or email

### 1.2 Create New Project
- Click **"New Project"**
- Fill in:
  - **Project name**: `resolve-ai` (or any name)
  - **Database password**: Create a strong password (save it!)
  - **Region**: Choose closest to you
- Click **"Create new project"** (wait 2-3 minutes)

### 1.3 Get Your Credentials
Once project is created, go to **Settings** → **API**

Copy these values:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role key** (secret) → `SUPABASE_SERVICE_ROLE_KEY`

### 1.4 Get Database URL
Go to **Settings** → **Database**

Copy:
- **Connection string** (psycopg2) → `DATABASE_URL`
- **Direct connection string** → `DIRECT_URL`

---

## Step 2: Local Development Setup (10 minutes)

### 2.1 Create `.env.local` file
In your project root, create `.env.local`:

```bash
# Supabase URLs
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database URLs (from Supabase Settings → Database)
DATABASE_URL=postgresql://postgres.xxxxx:password@aws-0-us-west-1.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.xxxxx:password@db.xxxxx.supabase.co:5432/postgres

# NextAuth (for session security)
NEXTAUTH_SECRET=your-random-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# AI Keys (optional for now)
GEMINI_API_KEY=your-gemini-key-here
```

**⚠️ IMPORTANT**: 
- Replace `https://your-project-ref.supabase.co` with YOUR actual Supabase URL
- Replace `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` with YOUR actual keys
- Generate a random secret: `openssl rand -base64 32` (or use any random string)

### 2.2 Run Database Migrations
```bash
npm install
npx prisma db push
```

This creates all tables in your Supabase database.

### 2.3 Test Locally
```bash
npm run dev
```

Visit: http://localhost:3000/register
- Create an account
- Should redirect to login
- Login with your credentials
- Should see dashboard ✅

---

## Step 3: Deploy to Vercel (15 minutes)

### 3.1 Connect GitHub to Vercel
1. Go to https://vercel.com
2. Click **"New Project"**
3. Click **"Import Git Repository"**
4. Search for `Resolve-ai-`
5. Click **"Import"**

### 3.2 Add Environment Variables
On the import screen, scroll down to **"Environment Variables"**

Click **"Add"** and paste these one by one:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key |
| `DATABASE_URL` | postgresql://... (pooler URL) |
| `DIRECT_URL` | postgresql://... (direct URL) |
| `NEXTAUTH_SECRET` | Random string from `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |
| `GEMINI_API_KEY` | (leave blank for now) |

### 3.3 Deploy
Click **"Deploy"** and wait 2-3 minutes ✅

---

## 🔧 Visual Guide: Where to Find Each Key in Supabase

### **Settings → API** Page
```
Project URL: https://[PROJECT_REF].supabase.co
             ↓
             NEXT_PUBLIC_SUPABASE_URL

Anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
                 ↓
                 NEXT_PUBLIC_SUPABASE_ANON_KEY

Service role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (SECRET!)
                  ↓
                  SUPABASE_SERVICE_ROLE_KEY
```

### **Settings → Database** Page
```
Connection string (psycopg2):
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres
↓
DATABASE_URL

Direct connection string:
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
↓
DIRECT_URL
```

---

## ✅ Verification Checklist

- [ ] Supabase project created
- [ ] All 8 environment variables copied
- [ ] `.env.local` created locally
- [ ] `npm install` completed
- [ ] `npx prisma db push` completed
- [ ] `npm run dev` works locally
- [ ] Can register account at http://localhost:3000/register
- [ ] Can login and see dashboard
- [ ] Vercel project created
- [ ] All env variables added to Vercel
- [ ] Vercel deployment successful
- [ ] Can access app at https://your-app.vercel.app

---

## 🆘 Troubleshooting

### Error: "Cannot find module @supabase/supabase-js"
```bash
npm install @supabase/supabase-js
```

### Error: "SUPABASE_SERVICE_ROLE_KEY is required"
Make sure you added the key to `.env.local` AND Vercel settings

### Error: "connect ECONNREFUSED"
- Check DATABASE_URL is correct
- Make sure password doesn't have special characters (or URL-encode them)
- Test connection in Supabase SQL Editor first

### Error: "Unauthorized" when trying to login
- Make sure Supabase auth is enabled (Settings → Authentication)
- Check RLS policies are applied (should be automatic from migration)

### Still stuck?
Check the logs:
- Local: `npm run dev` output
- Vercel: Click deployment → "View logs" → "Build Logs" or "Runtime Logs"

---

## 📋 Quick Reference: Environment Variables

```env
# Public (safe to expose)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Secret (NEVER commit to git)
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
DIRECT_URL=
NEXTAUTH_SECRET=

# Optional
GEMINI_API_KEY=
```

---

## 🔒 Security Notes

1. **Never commit `.env.local` to git** - It's already in `.gitignore`
2. **Database URLs are secrets** - Treat them like passwords
3. **Service role key is super secret** - Only use on backend
4. **Anon key is public** - It's embedded in frontend code
5. **In Vercel settings** - Keys are encrypted and hidden from logs

---

## 🎉 You're Done!

Your app is now:
- ✅ Deployed on Vercel
- ✅ Using Supabase for auth & database
- ✅ Secure with RLS policies
- ✅ Ready for production

**Next steps:**
1. Invite team members to your Supabase project
2. Test the app thoroughly
3. Set up custom domain in Vercel settings
4. Enable email verification in Supabase (optional)

