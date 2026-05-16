/*
  # Fix highlights.user_id foreign key

  Error: insert or update on table "highlights" violates foreign key constraint
  "highlights_user_id_fkey"

  Cause: `highlights.user_id` referenced `profiles(id)`, but an authenticated user
  may not have a `profiles` row yet (trigger skipped, old account, etc.).

  Fix: Reference `auth.users(id)` instead so any signed-in user can save highlights.
*/

ALTER TABLE highlights DROP CONSTRAINT IF EXISTS highlights_user_id_fkey;

ALTER TABLE highlights
  ADD CONSTRAINT highlights_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;
  