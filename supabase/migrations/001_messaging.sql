-- ============================================================
-- DaiVzemi Messaging System Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ── Tables ────────────────────────────────────────────────

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

-- ── Indexes ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_conversations_buyer_id   ON conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller_id  ON conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at      ON messages(created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread     ON notifications(user_id) WHERE read_at IS NULL;

-- ── Row Level Security ────────────────────────────────────

ALTER TABLE conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications   ENABLE ROW LEVEL SECURITY;

-- conversations
CREATE POLICY "participants_select_conversation"
  ON conversations FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "buyer_insert_conversation"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "participants_update_conversation"
  ON conversations FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- messages
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

-- notifications
CREATE POLICY "user_select_notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "authenticated_insert_notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "user_update_notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ── Trigger: bump conversations.updated_at on new message ─

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

-- ── Enable Realtime for messages ─────────────────────────
-- Run in Supabase Dashboard → Database → Replication
-- or via CLI:
--   supabase db push
-- Then add 'messages' table to the replication publication:
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
