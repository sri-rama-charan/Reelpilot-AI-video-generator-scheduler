-- ============================================================
-- VidGen: Social Accounts table for platform publishing
-- ============================================================

CREATE TABLE IF NOT EXISTS social_accounts (
  id                 BIGSERIAL PRIMARY KEY,
  user_id            TEXT NOT NULL,
  platform           TEXT NOT NULL CHECK (platform IN ('youtube', 'instagram', 'tiktok')),
  account_id         TEXT,
  account_name       TEXT,
  access_token       TEXT NOT NULL,
  refresh_token      TEXT,
  token_expires_at   TIMESTAMPTZ,
  scope              TEXT,
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT social_accounts_user_platform_unique UNIQUE (user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON social_accounts(platform);

ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own social accounts"
  ON social_accounts FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE OR REPLACE FUNCTION update_social_accounts_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER social_accounts_updated_at
  BEFORE UPDATE ON social_accounts
  FOR EACH ROW EXECUTE FUNCTION update_social_accounts_updated_at_column();
