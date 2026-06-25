-- ============================================================
-- DaiVzemi — Full Staging / Fresh Project Setup
-- Run this once in a brand-new Supabase project SQL Editor.
-- Order matters: tables → policies → functions → storage.
-- ============================================================


-- ── 1. LISTINGS ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS listings (
  id                 BIGSERIAL    PRIMARY KEY,
  user_id            UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title              TEXT         NOT NULL,
  description        TEXT,
  price              TEXT,
  city               TEXT,
  category           TEXT,
  listing_type       TEXT,
  image_url          TEXT,
  image_urls         TEXT[]       DEFAULT '{}',
  details            JSONB        NOT NULL DEFAULT '{}',
  hidden             BOOLEAN,
  expires_at         TIMESTAMPTZ,
  moderation_status  TEXT,
  view_count         BIGINT       NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_user_id       ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_category      ON listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_city          ON listings(city);
CREATE INDEX IF NOT EXISTS idx_listings_created_at    ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_details_gin   ON listings USING gin(details);

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_read_visible_listings"
  ON listings FOR SELECT
  USING (
    (hidden IS NULL OR hidden = false)
    AND (moderation_status IS NULL OR moderation_status = 'approved')
  );

CREATE POLICY "owner_can_read_own_listings"
  ON listings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "authenticated_can_insert"
  ON listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner_can_update"
  ON listings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "owner_can_delete"
  ON listings FOR DELETE
  USING (auth.uid() = user_id);


-- ── 2. PROFILES ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id            UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT         UNIQUE,
  first_name    TEXT,
  last_name     TEXT,
  full_name     TEXT,
  phone         TEXT,
  city          TEXT,
  account_type  TEXT         DEFAULT 'Частно лице',
  avatar_url    TEXT,
  role          TEXT         DEFAULT 'user',
  suspended     BOOLEAN      NOT NULL DEFAULT false,
  trust_score   NUMERIC      DEFAULT 0,
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "owner_update_profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "owner_insert_profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "owner_delete_profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);


-- ── 3. FAVORITES ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS favorites (
  id          BIGSERIAL    PRIMARY KEY,
  user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id  BIGINT       NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_select_favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "owner_insert_favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner_delete_favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);


-- ── 4. REPORTS ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reports (
  id                  BIGSERIAL    PRIMARY KEY,
  reporter_user_id    UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  reported_listing_id BIGINT       REFERENCES listings(id) ON DELETE CASCADE,
  reported_user_id    UUID         REFERENCES auth.users(id) ON DELETE CASCADE,
  reason              TEXT         NOT NULL,
  description         TEXT,
  status              TEXT         NOT NULL DEFAULT 'open',
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_can_insert_reports"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_user_id);

CREATE POLICY "reporter_can_read_own"
  ON reports FOR SELECT
  USING (auth.uid() = reporter_user_id);


-- ── 5. SITE SETTINGS ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS site_settings (
  id                              INTEGER      PRIMARY KEY DEFAULT 1,
  ai_global_enabled               BOOLEAN      NOT NULL DEFAULT false,
  ai_listing_assistant_enabled    BOOLEAN      NOT NULL DEFAULT false,
  ai_seller_tips_enabled          BOOLEAN      NOT NULL DEFAULT false,
  ai_search_assistant_enabled     BOOLEAN      NOT NULL DEFAULT false,
  ai_moderator_assistant_enabled  BOOLEAN      NOT NULL DEFAULT false,
  updated_at                      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_by                      UUID         REFERENCES auth.users(id),
  CONSTRAINT site_settings_singleton CHECK (id = 1)
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_site_settings"
  ON site_settings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Seed the single row so the AI settings page doesn't error
INSERT INTO site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;


-- ── 6. MESSAGING (conversations / messages / notifications) ─

CREATE TABLE IF NOT EXISTS conversations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id BIGINT      NOT NULL,
  buyer_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT conversations_unique_listing_buyer UNIQUE (listing_id, buyer_id),
  CONSTRAINT conversations_no_self_chat CHECK (buyer_id <> seller_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content         TEXT        NOT NULL CHECK (char_length(trim(content)) > 0),
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT        NOT NULL CHECK (type IN ('new_message', 'listing_inquiry')),
  conversation_id UUID        REFERENCES conversations(id) ON DELETE CASCADE,
  body            TEXT,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_buyer_id   ON conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller_id  ON conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at      ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread     ON notifications(user_id) WHERE read_at IS NULL;

ALTER TABLE conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants_select_conversation"
  ON conversations FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "buyer_insert_conversation"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "participants_update_conversation"
  ON conversations FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "participants_select_messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  );
CREATE POLICY "participants_insert_messages"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  );
CREATE POLICY "recipient_mark_read"
  ON messages FOR UPDATE
  USING (
    sender_id <> auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  );

CREATE POLICY "user_select_notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "authenticated_insert_notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "user_update_notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION fn_touch_conversation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_conversation ON messages;
CREATE TRIGGER trg_touch_conversation
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION fn_touch_conversation();

-- Realtime (run these — they are safe to re-run, new project won't have conflicts)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;


-- ── 7. SAVED SEARCHES ─────────────────────────────────────

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


-- ── 8. RPC FUNCTIONS ──────────────────────────────────────

CREATE OR REPLACE FUNCTION get_category_counts()
RETURNS TABLE(category TEXT, count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    category,
    COUNT(*) AS count
  FROM listings
  WHERE
    (hidden IS NULL OR hidden = false)
    AND (moderation_status IS NULL OR moderation_status = 'approved')
    AND (expires_at IS NULL OR expires_at > NOW())
  GROUP BY category;
$$;

CREATE OR REPLACE FUNCTION increment_view_count(p_listing_id BIGINT)
RETURNS void
LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE listings
  SET view_count = view_count + 1
  WHERE id = p_listing_id;
$$;


-- ── 9. STORAGE — run in SQL Editor after creating the buckets ─
--
-- First create two buckets in Storage → New bucket:
--   Name: listing-images   Public: YES
--   Name: avatars          Public: YES
--
-- Then run these policies:

-- listing-images: authenticated users can upload to their own folder
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "authenticated_upload_listing_images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'listing-images' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "public_read_listing_images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-images');

CREATE POLICY "owner_delete_listing_images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'listing-images' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "owner_upsert_listing_images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'listing-images' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "authenticated_upload_avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "public_read_avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "owner_update_avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[1]);


-- ── 10. ADMIN ROLE — give yourself admin access ────────────
-- After registering on the staging site, run this with your
-- user UUID from Authentication → Users:
--
-- UPDATE profiles SET role = 'admin' WHERE id = '<your-uuid>';
