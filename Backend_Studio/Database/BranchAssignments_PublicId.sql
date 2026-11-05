-- ==============================================================
-- Branch Assignments : Public Id (uuid v7)
-- --------------------------------------------------------------
-- The id used in links and API calls instead of the internal
-- number (decisions-public-id-uuid). Existing rows get their own
-- value now; new ones get one from the API (or from the default
-- uuidv7() when a script inserts a row).
--
-- Needs PostgreSQL 18 (uuidv7). Safe to run again.
-- ==============================================================

DO $$
BEGIN
    IF NOT EXISTS
    (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'BranchAssignments'
          AND column_name  = 'PublicId'
    )
    THEN
        ALTER TABLE "BranchAssignments"
            ADD COLUMN "PublicId" uuid NOT NULL DEFAULT uuidv7();
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "UX_BranchAssignments_PublicId"
    ON "BranchAssignments" ("PublicId");


-- --------------------------------------------------------------
-- Check : both numbers must be the same
-- --------------------------------------------------------------

SELECT
    COUNT(*)                   AS row_count,
    COUNT(DISTINCT "PublicId") AS public_ids
FROM "BranchAssignments";
