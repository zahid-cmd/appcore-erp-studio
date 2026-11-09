-- ==============================================================
-- Starting version = the release that is live now (R-0014)
-- R-0014 was deployed before versions existed : it becomes
-- 1.0.0 (instead of R-0013), so the next Feature is 1.1.0.
-- Safe to run again. ASCII only.
-- ==============================================================

BEGIN;

UPDATE "DeploymentCenter" SET "version" = ''      WHERE "code" = 'R-0013' AND "version" = '1.0.0';
UPDATE "DeploymentCenter" SET "version" = '1.0.0' WHERE "code" = 'R-0014' AND "deployStatus" = 'Succeeded';

COMMIT;

SELECT "code", "deployStatus", "version", "serverName"
FROM   "DeploymentCenter"
ORDER  BY "id" DESC
LIMIT  5;
