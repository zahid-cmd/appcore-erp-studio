-- ==============================================================
-- Deployment Center : versions and "What's new"  (2026-11-09)
-- --------------------------------------------------------------
--   version      1.4.2 ; given when the release is deployed
--                (last successful version on the server + the
--                change type). Empty for releases before this.
--   changeType   Fix / Feature / Major (chosen on the draft)
--   whatsNew     the lines users see after the update
--                (one per line; empty = no pop-up)
--
-- Starting point : R-0013 = 1.0.0.
-- Safe to run again. ASCII only.
-- ==============================================================

BEGIN;

ALTER TABLE "DeploymentCenter"
    ADD COLUMN IF NOT EXISTS "version"    varchar(20) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "changeType" varchar(10) NOT NULL DEFAULT 'Feature',
    ADD COLUMN IF NOT EXISTS "whatsNew"   text        NOT NULL DEFAULT '';

UPDATE "DeploymentCenter"
SET    "version" = '1.0.0'
WHERE  "code" = 'R-0013'
AND    "version" = '';

COMMIT;

-- Check
SELECT "code", "kind", "deployStatus", "version", "changeType", "serverName", "startedDate"
FROM   "DeploymentCenter"
ORDER  BY "id" DESC
LIMIT  5;
