# Database Setup Guide

This document contains all the SQL code needed to set up the database schema for the Spiritual Study Buddy application in your own Supabase instance.

## Prerequisites

1. Create a new Supabase project at https://supabase.com
2. Go to the SQL Editor in your Supabase dashboard
3. Copy and paste the SQL code below in order

---

## Step 1: Create Core Schema (Profiles, Sessions, Messages)

Run this SQL in your Supabase SQL Editor:

```sql
/*
  # Spiritual Study Buddy Database Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, references auth.users)
      - `display_name` (text)
      - `preferred_bible_version` (text, default 'KJV')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `counseling_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `title` (text, auto-generated from first message)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `messages`
      - `id` (uuid, primary key)
      - `session_id` (uuid, references counseling_sessions)
      - `user_id` (uuid, references profiles)
      - `role` (text, either 'user' or 'assistant')
      - `content` (text)
      - `bible_verse_reference` (text, nullable)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Users can only read/write their own data
    - Profiles are created automatically on signup via trigger
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  preferred_bible_version text DEFAULT 'KJV',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create counseling_sessions table
CREATE TABLE IF NOT EXISTS counseling_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New Session',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE counseling_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON counseling_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON counseling_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON counseling_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON counseling_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES counseling_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  bible_verse_reference text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON counseling_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON counseling_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
```

---

## Step 2: Add Bookmarks, Reading Progress, and Daily Verse

After Step 1 completes successfully, run this SQL:

```sql
/*
  # Add Bible Bookmarks, Reading Progress, and Daily Verse Tracking

  1. New Tables
    - `bookmarks`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `book` (text)
      - `chapter` (integer)
      - `verse` (integer, nullable)
      - `note` (text, nullable)
      - `created_at` (timestamp)

    - `reading_progress`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `book` (text)
      - `chapter` (integer)
      - `updated_at` (timestamp)

    - `daily_verse_views`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `view_date` (date)
      - `created_at` (timestamp)

  2. Updates to profiles
    - Add `last_read_book` (text, nullable)
    - Add `last_read_chapter` (integer, nullable)

  3. Security
    - Enable RLS on new tables
    - Users can only access their own bookmarks, progress, and daily verse views
*/

-- Add fields to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_read_book'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_read_book text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_read_chapter'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_read_chapter integer DEFAULT 1;
  END IF;
END $$;

-- Create bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  book text NOT NULL,
  chapter integer NOT NULL,
  verse integer,
  note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookmarks"
  ON bookmarks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks"
  ON bookmarks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookmarks"
  ON bookmarks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
  ON bookmarks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create reading_progress table
CREATE TABLE IF NOT EXISTS reading_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  book text NOT NULL,
  chapter integer NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, book)
);

ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON reading_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON reading_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON reading_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress"
  ON reading_progress FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create daily_verse_views table
CREATE TABLE IF NOT EXISTS daily_verse_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  view_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, view_date)
);

ALTER TABLE daily_verse_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily verse views"
  ON daily_verse_views FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily verse views"
  ON daily_verse_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily verse views"
  ON daily_verse_views FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON bookmarks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_id ON reading_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_verse_views_user_id ON daily_verse_views(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_verse_views_date ON daily_verse_views(view_date);
```

---

## Step 3: Update Environment Variables

After setting up your database, update your `.env` file with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

You can find these values in:
- **Supabase Dashboard** → **Settings** → **API** → **Project URL** (for NEXT_PUBLIC_SUPABASE_URL)
- **Supabase Dashboard** → **Settings** → **API** → **Project API keys** → **anon/public** (for NEXT_PUBLIC_SUPABASE_ANON_KEY)
- **Google AI Studio** → https://aistudio.google.com/apikey (for GEMINI_API_KEY)

---

## Step 4: Configure Edge Function Secret (CRITICAL for AI Chat)

The AI chat feature uses a Supabase Edge Function that needs access to the Gemini API key. You must configure this secret:

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard/project/YOUR_PROJECT_REF
2. Navigate to **Edge Functions** → **Manage secrets** (or **Settings** → **Edge Functions** → **Secrets**)
3. Click **Add secret** or **New secret**
4. Add:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: Your Gemini API key from https://aistudio.google.com/apikey

**Without this secret, the AI chat will not work!**

---

## Database Structure Overview

### Tables

1. **profiles** - User profile information
2. **counseling_sessions** - AI counseling chat sessions
3. **messages** - Messages within counseling sessions
4. **bookmarks** - User's saved Bible verses
5. **reading_progress** - Track reading progress per book
6. **daily_verse_views** - Track when users view the daily verse popup

### Security

All tables have Row Level Security (RLS) enabled with policies that ensure:
- Users can only access their own data
- All operations are restricted to authenticated users
- Profiles are automatically created when a user signs up

### Relationships

```
auth.users (Supabase Auth)
    ↓
profiles
    ↓
    ├── counseling_sessions → messages
    ├── bookmarks
    ├── reading_progress
    └── daily_verse_views
```

---

## Verification

After running all SQL statements, verify your setup by checking:

1. Go to **Table Editor** in Supabase dashboard
2. You should see all 6 tables: `profiles`, `counseling_sessions`, `messages`, `bookmarks`, `reading_progress`, `daily_verse_views`
3. Each table should show the RLS icon (shield) indicating Row Level Security is enabled
4. Check the **Database** → **Triggers** section to ensure `on_auth_user_created` trigger exists

---

## Edge Functions Deployment

The AI chat feature is implemented using a Supabase Edge Function located at `supabase/functions/chat/index.ts`. This function:
- Runs in a Supabase-supported region to bypass Gemini API geographic restrictions
- Handles all AI chat requests securely
- Requires the `GEMINI_API_KEY` secret to be configured (see Step 4 above)

The edge function is already deployed. If you need to redeploy or update it, the code is in the project files.

---

## Need Help?

If you encounter any errors:
1. Make sure you're running the SQL in the correct order (Step 1, then Step 2)
2. Check the error message in the SQL Editor
3. Ensure your Supabase project is on a recent version
4. **For AI chat issues**: Verify the `GEMINI_API_KEY` secret is set correctly in Edge Functions settings
5. Contact support if issues persist
