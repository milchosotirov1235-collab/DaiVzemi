-- ============================================================
-- DaiVzemi Saved Searches Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS saved_searches (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  category     TEXT,
  listing_type TEXT,
  city         TEXT,
  search       TEXT,
  filters      JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id    ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_created_at ON saved_searches(created_at DESC);

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_saved_searches"
  ON saved_searches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_saved_searches"
  ON saved_searches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_saved_searches"
  ON saved_searches FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users_delete_own_saved_searches"
  ON saved_searches FOR DELETE
  USING (auth.uid() = user_id);
