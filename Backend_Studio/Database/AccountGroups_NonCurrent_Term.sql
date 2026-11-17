ROLLBACK;

-- ============================================================
-- Account Groups : Balance Sheet term (Current / Non-current)
--
--   Adds "AccountGroups"."IsNonCurrent" (false = current) and
--   fills it from the groups that exist today :
--     Non-current : groups named Non / Nun Current ...
--                   Provident Fund
--     Current     : every other group
--   Also corrects the group name "Nun Current Assets" to
--   "Non Current Assets".
--
-- Used by the Balance Sheet Net assets view :
--   Total Assets - Current Liabilities = Net Assets,
--   presented by Equity + Non-current Liabilities.
-- Equity, income and expense groups ignore it.
--
-- Safe to run more than once : the column is added and filled
-- on the first run only, so a term set later on the Account
-- Group form is kept. Run it all (F5).
-- ============================================================

BEGIN;

DO $$
BEGIN
    -- First run only : add the column and fill it
    IF NOT EXISTS
       (
           SELECT 1
           FROM   information_schema.columns
           WHERE  table_name = 'AccountGroups'
           AND    column_name = 'IsNonCurrent'
       )
    THEN
        ALTER TABLE "AccountGroups"
            ADD COLUMN "IsNonCurrent" boolean NOT NULL DEFAULT false;

        UPDATE "AccountGroups"
        SET    "IsNonCurrent" = true
        WHERE  lower("GroupName") LIKE '%non%current%'
        OR     lower("GroupName") LIKE '%nun%current%'
        OR     lower("GroupName") LIKE '%provident%';
    END IF;
END $$;

UPDATE "AccountGroups" g
SET    "GroupName" = 'Non Current Assets'
WHERE  g."GroupName" = 'Nun Current Assets'
AND    NOT EXISTS
       (
           SELECT 1
           FROM   "AccountGroups" x
           WHERE  x."AccountClassId" = g."AccountClassId"
           AND    x."GroupName" = 'Non Current Assets'
           AND    x."AccountGroupId" <> g."AccountGroupId"
       );

COMMIT;

SELECT "GroupCode", "GroupName", "IsNonCurrent"
FROM   "AccountGroups"
WHERE  NOT "IsDeleted"
ORDER  BY "GroupCode";
