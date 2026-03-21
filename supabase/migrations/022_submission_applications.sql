-- Migration 022: 新增投稿申請表 (Issue #148)

CREATE TABLE IF NOT EXISTS submission_applications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(100) NOT NULL,
  email varchar(255) NOT NULL,
  specialty varchar(50) NOT NULL DEFAULT '綜合',
  portfolio_url text,
  introduction text,
  status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_submission_applications_status
  ON submission_applications(status);

CREATE INDEX IF NOT EXISTS idx_submission_applications_email
  ON submission_applications(email);
