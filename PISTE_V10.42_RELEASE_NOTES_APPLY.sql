-- V10.42 release notes preference — apply after validation
BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_release text;

COMMENT ON COLUMN public.profiles.last_seen_release IS
  'Dernière version des nouveautés confirmée par le propriétaire du profil.';

COMMIT;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='profiles'
  AND column_name='last_seen_release';
