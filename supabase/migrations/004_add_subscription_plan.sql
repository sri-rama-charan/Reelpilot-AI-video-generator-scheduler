-- Add plan column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'Free' CHECK (plan IN ('Free', 'Basic', 'Unlimited'));

-- Create index for plan lookups
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);
