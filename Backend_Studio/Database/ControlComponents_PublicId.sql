-- ==============================================================
-- Control Components : Public Id (uuid v7)
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
          AND table_name   = 'ControlComponents'
          AND column_name  = 'publicId'
    )
    THEN
        ALTER TABLE "ControlComponents"
            ADD COLUMN "publicId" uuid NOT NULL DEFAULT uuidv7();
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "UX_ControlComponents_PublicId"
    ON "ControlComponents" ("publicId");


-- --------------------------------------------------------------
-- Check : both numbers must be the same
-- --------------------------------------------------------------

SELECT
    COUNT(*)                   AS row_count,
    COUNT(DISTINCT "publicId") AS public_ids
FROM "ControlComponents";
