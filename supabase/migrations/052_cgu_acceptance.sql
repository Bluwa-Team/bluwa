-- CGU acceptance tracking on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cgu_accepted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cgu_version TEXT DEFAULT NULL;
