# Quick Start Guide - School Management System

This guide will help you get started with the School Management System in 10 minutes.

## ✅ Prerequisites Checklist

- [x] Node.js 18+ installed
- [x] Supabase dependencies installed
- [ ] Supabase project created
- [ ] Environment variables configured
- [ ] Database schema deployed

## 🚀 Quick Setup (5 Steps)

### Step 1: Create Supabase Project (2 minutes)

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Fill in:
   - Name: `school-portal`
   - Database Password: (save this!)
   - Region: Choose closest to you
4. Click "Create new project"
5. Wait for provisioning (~2 minutes)

### Step 2: Get Your Credentials (1 minute)

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbG...`
   - **service_role key**: `eyJhbG...` (keep secret!)

### Step 3: Configure Environment (30 seconds)

1. Open `facit-next/.env.local`
2. Replace the placeholder values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

3. Save the file

### Step 4: Deploy Database Schema (1 minute)

1. In Supabase dashboard, click **SQL Editor**
2. Click **New Query**
3. Open `facit-next/supabase/migrations/001_initial_schema.sql`
4. Copy ALL the contents (Ctrl+A, Ctrl+C)
5. Paste into SQL Editor
6. Click **Run** (or Ctrl+Enter)
7. Wait for "Success" message

### Step 5: Create First Admin User (1 minute)

1. Go to **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Fill in:
   - Email: `admin@yourschool.com`
   - Password: Choose a strong password
   - Auto Confirm User: ✅ Check this
4. Click **Create user**
5. **Copy the User ID** (UUID)

Now add the profile:

1. Go to **Table Editor** → **schools**
2. Click **Insert row**
3. Fill in:
   - name: `Your School Name`
   - address: `School Address`
   - contact_email: `contact@school.com`
   - contact_phone: `+1234567890`
4. Click **Save**
5. **Copy the school ID** (UUID)

6. Go to **Table Editor** → **profiles**
7. Click **Insert row**
8. Fill in:
   - id: (paste User ID from step 5)
   - school_id: (paste school ID from above)
   - role: `super_admin`
   - full_name: `Your Name`
   - is_active: `true`
9. Click **Save**

## 🎉 You're Done! Now Test It

### Start the Development Server

```bash
cd facit-next
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Test the Connection

Open browser console (F12) and run:

```javascript
// Test Supabase connection
const { data, error } = await window.supabase.from('schools').select('*');
console.log('Schools:', data);
```

## 📁 Project Structure Overview

```
facit-next/
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # Supabase client (browser)
│   │   ├── server.ts          # Supabase admin (server)
│   │   └── database.types.ts  # TypeScript types
│   ├── types/
│   │   └── database.ts        # Database interfaces
│   ├── auth/
│   │   ├── auth-helpers.ts    # Auth utility functions
│   │   └── useAuth.ts         # Auth React hooks
│   └── api/
│       ├── students.ts        # Student CRUD operations
│       └── attendance.ts      # Attendance operations
├── context/
│   └── supabaseAuthContext.tsx # Auth context provider
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql # Database schema
└── .env.local                 # Your credentials (DO NOT COMMIT!)
```

## 🔐 User Roles Explained

| Role | Access Level | Can Do |
|------|-------------|--------|
| **super_admin** | Full access | Everything - manage school, users, view all data |
| **teacher** | Class-level | Mark attendance, enter grades, view assigned classes |
| **student** | Self only | View own attendance, grades, calendar |
| **parent** | Children only | View children's data, apply for leave |

## 🎯 Next Steps

Now that setup is complete, you can:

1. **Build the Login Page** - Integrate with Supabase Auth
2. **Create Dashboard** - Different views for each role
3. **Attendance Module** - Mark and view attendance
4. **Academic Module** - Manage assessments and grades
5. **Calendar & Announcements** - School-wide communication

## 📚 Key Files to Understand

### Authentication
- `lib/auth/auth-helpers.ts` - Sign in, sign out, role checking
- `context/supabaseAuthContext.tsx` - Auth state management
- `lib/auth/useAuth.ts` - React hooks for auth

### Database Operations
- `lib/api/students.ts` - Student CRUD
- `lib/api/attendance.ts` - Attendance marking and retrieval

### Types
- `lib/types/database.ts` - All TypeScript interfaces

## 🐛 Common Issues

### "Invalid API key"
- Check `.env.local` has correct values
- Restart dev server: `npm run dev`

### "relation does not exist"
- Run the SQL migration again
- Check for errors in SQL Editor

### "Row Level Security policy violation"
- Make sure user has correct role in profiles table
- Check user is linked to a school

## 💡 Pro Tips

1. **Use the Supabase Dashboard** - It's your best friend for debugging
2. **Check RLS Policies** - If queries fail, it's usually RLS
3. **Use TypeScript** - The types will save you hours of debugging
4. **Test with Multiple Roles** - Create test users for each role

## 🆘 Need Help?

- Supabase Docs: https://supabase.com/docs
- Check `SUPABASE_SETUP.md` for detailed setup
- Review the database schema: `supabase/migrations/001_initial_schema.sql`

---

**Ready to build?** Start with the authentication flow! 🚀

