-- ==============================================================
-- Deployment Center : drafts + release notes
-- --------------------------------------------------------------
-- A deployment is now prepared first (New -> Draft), then run
-- from its record (Deploy):
--
--   deployStatus   Draft / Running / Succeeded / Failed /
--                  Rolled back
--   releaseNotes   what is in the release (commit messages
--                  since the last deployed release; editable)
--   startedDate    empty while Draft
--
-- Safe to run again. ASCII only.
-- ==============================================================

BEGIN;

ALTER TABLE "DeploymentCenter"
    ADD COLUMN IF NOT EXISTS "releaseNotes" text NOT NULL DEFAULT '';

COMMIT;
