-- ==============================================================
-- Spare Parts : Public Id (uuid v7)
-- --------------------------------------------------------------
-- The id used in links and API calls instead of the internal
-- number (decisions-public-id-uuid). Existing parts get their
-- own value now; new ones get one from the API (or from the
-- default uuidv7() when a script inserts a row).
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
          AND table_name   = 'SpareParts'
          AND column_name  = 'PublicId'
    )
    THEN
        ALTER TABLE "SpareParts"
            ADD COLUMN "PublicId" uuid NOT NULL DEFAULT uuidv7();
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "UX_SpareParts_PublicId"
    ON "SpareParts" ("PublicId");


-- --------------------------------------------------------------
-- Check : both numbers must be the same
-- --------------------------------------------------------------

SELECT
    COUNT(*)                   AS spare_parts,
    COUNT(DISTINCT "PublicId") AS public_ids
FROM "SpareParts";
