/*
  # Bible verse highlights (saved per user)

  The app persists highlight colors in table `highlights` (plural).
  If this migration was not applied, PostgREST errors may mention a missing table.

  1. Table `highlights`
  2. RLS policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book text NOT NULL,
  chapter integer NOT NULL,
  verse integer NOT NULL,
  color text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, book, chapter, verse)
);

ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own highlights" ON highlights;
DROP POLICY IF EXISTS "Users can insert own highlights" ON highlights;
DROP POLICY IF EXISTS "Users can update own highlights" ON highlights;
DROP POLICY IF EXISTS "Users can delete own highlights" ON highlights;

CREATE POLICY "Users can view own highlights"
  ON highlights FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own highlights"
  ON highlights FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own highlights"
  ON highlights FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own highlights"
  ON highlights FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_highlights_user_ref ON highlights(user_id, book, chapter);
