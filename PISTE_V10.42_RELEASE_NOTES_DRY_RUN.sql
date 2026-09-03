-- V10.42 release notes preference — inspection only
-- No deployment is performed by this repository patch.
BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_release text;

COMMENT ON COLUMN public.profiles.last_seen_release IS
  'Dernière version des nouveautés confirmée par le propriétaire du profil.';

-- The existing profiles RLS policies remain authoritative.  This migration
-- only adds the nullable preference column; it never grants cross-account read.
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='profiles'
  AND column_name='last_seen_release';

ROLLBACK;
