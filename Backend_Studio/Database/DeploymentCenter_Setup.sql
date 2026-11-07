-- ==============================================================
-- Deployment Center : real columns (deployments + rollbacks)
-- --------------------------------------------------------------
-- The page was a template. One row is now one deployment (or
-- rollback) to a server registered in Server Management:
--
--   code              release number (R-0001) - the same on
--                     the server (C:\AppCore\releases\R-0001)
--   name              short title (commit message / rollback)
--   kind              Deploy / Rollback
--   deployStatus      Running / Succeeded / Failed / Rolled back
--   step, percent     last progress
--   commit...         what was deployed (git)
--   backupFile        database backup taken before the switch
--   log               the full step log
--
-- The old sample columns stay (unused) with defaults.
-- Safe to run again. ASCII only.
-- ==============================================================

BEGIN;

ALTER TABLE "DeploymentCenter"
    ADD COLUMN IF NOT EXISTS "serverManagementId" bigint        NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "serverName"         varchar(200)  NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "kind"               varchar(20)   NOT NULL DEFAULT 'Deploy',
    ADD COLUMN IF NOT EXISTS "deployStatus"       varchar(30)   NOT NULL DEFAULT 'Running',
    ADD COLUMN IF NOT EXISTS "step"               varchar(300)  NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "percent"            integer       NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "branch"             varchar(100)  NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "commitHash"         varchar(64)   NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "commitMessage"      varchar(500)  NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "agentJobId"         varchar(64)   NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "backupFile"         varchar(400)  NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "previousRelease"    varchar(30)   NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "packageMb"          numeric(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "startedDate"        timestamp with time zone NULL,
    ADD COLUMN IF NOT EXISTS "finishedDate"       timestamp with time zone NULL,
    ADD COLUMN IF NOT EXISTS "durationSeconds"    integer       NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "performedByName"    varchar(200)  NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "log"                text          NOT NULL DEFAULT '';

-- old template columns : keep, but never required
ALTER TABLE "DeploymentCenter" ALTER COLUMN "sampleField" SET DEFAULT '';

DO $$
BEGIN
    IF EXISTS
    (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name   = 'DeploymentCenter'
          AND column_name  = 'sampleSearchDropdownId'
          AND is_nullable  = 'NO'
    )
    THEN
        ALTER TABLE "DeploymentCenter" ALTER COLUMN "sampleSearchDropdownId" DROP NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "IX_DeploymentCenter_Server_Started"
    ON "DeploymentCenter" ("serverManagementId", "startedDate" DESC);

COMMIT;


-- --------------------------------------------------------------
-- Check
-- --------------------------------------------------------------

SELECT "id", "code", "kind", "deployStatus", "serverName", "startedDate"
FROM "DeploymentCenter"
ORDER BY "id" DESC
LIMIT 10;
