-- ==============================================================
-- Server Management : real columns (Deploy Agent servers)
-- --------------------------------------------------------------
-- The page was a template (name / sample fields). It now keeps
-- the live servers the Deployment Center deploys to:
--
--   hostAddress       Tailscale address or name (100.117.11.97)
--   agentPort         Deploy Agent port (5099)
--   agentToken        agent secret, ENCRYPTED by the API
--   appUrl            address users open (http://...:8080)
--   environment       Production / Staging
--   lastChecked...    result of the last "Test Connection"
--   agentVersion      agent version seen at the last check
--   currentRelease    live release seen at the last check
--
-- The old sample columns stay (unused) with defaults so inserts
-- keep working. Safe to run again. ASCII only.
-- ==============================================================

BEGIN;

ALTER TABLE "ServerManagement"
    ADD COLUMN IF NOT EXISTS "hostAddress"      varchar(200)  NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "agentPort"        integer       NOT NULL DEFAULT 5099,
    ADD COLUMN IF NOT EXISTS "agentToken"       text          NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "appUrl"           varchar(300)  NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "environment"      varchar(30)   NOT NULL DEFAULT 'Production',
    ADD COLUMN IF NOT EXISTS "lastCheckedDate"  timestamp with time zone NULL,
    ADD COLUMN IF NOT EXISTS "lastCheckStatus"  varchar(30)   NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "lastCheckMessage" varchar(500)  NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "agentVersion"     varchar(30)   NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "currentRelease"   varchar(30)   NOT NULL DEFAULT '';

-- old template columns : keep, but never required
ALTER TABLE "ServerManagement" ALTER COLUMN "sampleField" SET DEFAULT '';

DO $$
BEGIN
    IF EXISTS
    (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name   = 'ServerManagement'
          AND column_name  = 'sampleSearchDropdownId'
          AND is_nullable  = 'NO'
    )
    THEN
        ALTER TABLE "ServerManagement" ALTER COLUMN "sampleSearchDropdownId" DROP NOT NULL;
    END IF;
END $$;

-- one live server per host + port
CREATE UNIQUE INDEX IF NOT EXISTS "UX_ServerManagement_Host_Port"
    ON "ServerManagement" (lower("hostAddress"), "agentPort")
    WHERE "isDeleted" = false AND "hostAddress" <> '';

COMMIT;


-- --------------------------------------------------------------
-- Check
-- --------------------------------------------------------------

SELECT "id", "code", "name", "hostAddress", "agentPort", "appUrl", "environment"
FROM "ServerManagement"
ORDER BY "id";
