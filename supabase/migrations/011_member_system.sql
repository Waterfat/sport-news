-- 011_member_system.sql
-- 會員系統：members + member_accounts + member_preferences

-- 會員表
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,                    -- Google 提供，LINE 可能為 null
  name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'member',  -- 'member' | 'admin'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- OAuth 帳號關聯（一個 member 可綁定多個 provider）
CREATE TABLE IF NOT EXISTS member_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,               -- 'google' | 'line'
  provider_account_id TEXT NOT NULL,    -- OAuth provider 的 user ID
  access_token TEXT,
  refresh_token TEXT,
  expires_at BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

-- 會員偏好（漸進式蒐集）
CREATE TABLE IF NOT EXISTS member_preferences (
  member_id UUID PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  favorite_teams JSONB DEFAULT '[]',       -- [{sport: "nba", teamId: "13", name: "Lakers"}]
  favorite_leagues TEXT[] DEFAULT '{}',    -- ["nba", "mlb"]
  notification_line BOOLEAN DEFAULT false,
  notification_telegram BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 政策
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_preferences ENABLE ROW LEVEL SECURITY;

-- Index
CREATE INDEX IF NOT EXISTS idx_member_accounts_member ON member_accounts(member_id);
CREATE INDEX IF NOT EXISTS idx_member_accounts_provider ON member_accounts(provider, provider_account_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
