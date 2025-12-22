# Supabase Setup Guide for School Management System

This guide will help you set up Supabase for your Attendance & Academic Management Portal.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier is fine to start)

## Step 1: Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Fill in the details:
   - **Name**: School Management Portal (or your preferred name)
   - **Database Password**: Choose a strong password (save it securely!)
   - **Region**: Choose the closest region to your users
   - **Pricing Plan**: Start with Free tier
4. Click "Create new project"
5. Wait 2-3 minutes for the project to be provisioned

## Step 2: Get Your API Credentials

1. Once your project is ready, go to **Settings** → **API**
2. You'll see:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon/public key**: A long string starting with `eyJ...`
   - **service_role key**: Another long string (keep this secret!)

## Step 3: Configure Environment Variables

1. Open the file `facit-next/.env.local`
2. Replace the placeholder values with your actual credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

⚠️ **Important**: Never commit `.env.local` to Git! It's already in `.gitignore`.

## Step 4: Run the Database Migration

### Option A: Using Supabase Dashboard (Recommended for beginners)

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Open the file `facit-next/supabase/migrations/001_initial_schema.sql`
5. Copy the entire contents
6. Paste it into the SQL Editor
7. Click **Run** (or press Ctrl+Enter)
8. Wait for the migration to complete (should take 5-10 seconds)
9. You should see "Success. No rows returned" message

### Option B: Using Supabase CLI (Advanced)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-id

# Run migrations
supabase db push
```

## Step 5: Verify the Setup

1. Go to **Table Editor** in your Supabase dashboard
2. You should see all these tables:
   - profiles
   - schools
   - academic_years
   - classes
   - teachers
   - students
   - attendance_records
   - subjects
   - assessments
   - assessment_classes
   - grades
   - calendar_events
   - announcements
   - announcement_acknowledgments
   - leave_applications

## Step 6: Create Your First Super Admin User

### Using Supabase Dashboard:

1. Go to **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Fill in:
   - **Email**: your-admin-email@example.com
   - **Password**: Choose a strong password
   - **Auto Confirm User**: ✅ Check this
4. Click **Create user**
5. Copy the User ID (UUID)

### Add Profile for the User:

1. Go to **Table Editor** → **profiles**
2. Click **Insert** → **Insert row**
3. Fill in:
   - **id**: Paste the User ID from step 5
   - **role**: super_admin
   - **full_name**: Your Name
   - **phone**: Your phone number (optional)
   - **is_active**: true
4. Click **Save**

### Create a School:

1. Go to **Table Editor** → **schools**
2. Click **Insert** → **Insert row**
3. Fill in:
   - **name**: Your School Name
   - **address**: School Address
   - **contact_email**: school@example.com
   - **contact_phone**: +1234567890
4. Click **Save**
5. Copy the school **id** (UUID)

### Link Admin to School:

1. Go back to **Table Editor** → **profiles**
2. Find your admin profile
3. Click **Edit**
4. Set **school_id** to the school ID you copied
5. Click **Save**

## Step 7: Test the Connection

1. Start your Next.js development server:
   ```bash
   cd facit-next
   npm run dev
   ```

2. Open your browser console (F12)
3. Test the connection by running:
   ```javascript
   // This will be available once we integrate auth
   console.log('Supabase configured!')
   ```

## Step 8: Enable Email Authentication (Optional)

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure email templates if needed
4. For production, set up a custom SMTP provider

## Next Steps

Now that Supabase is set up, you can:

1. ✅ Build the authentication flow
2. ✅ Create the dashboard
3. ✅ Implement attendance marking
4. ✅ Build the academic management features

## Troubleshooting

### "relation does not exist" error
- Make sure you ran the migration SQL successfully
- Check the SQL Editor for any error messages

### "Invalid API key" error
- Double-check your `.env.local` file
- Make sure you copied the correct keys from Supabase dashboard
- Restart your Next.js dev server after changing env variables

### RLS Policy errors
- RLS policies are strict by design for security
- Make sure users have the correct role in the profiles table
- Check the policies in the SQL migration file

## Security Notes

🔒 **Important Security Practices:**

1. Never expose `SUPABASE_SERVICE_ROLE_KEY` in client-side code
2. Always use RLS policies to protect data
3. Test your RLS policies thoroughly
4. Use strong passwords for all users
5. Enable 2FA for admin accounts in production

## Support

If you encounter issues:
- Check Supabase logs: **Logs** → **Postgres Logs**
- Review RLS policies: **Authentication** → **Policies**
- Consult Supabase docs: https://supabase.com/docs

