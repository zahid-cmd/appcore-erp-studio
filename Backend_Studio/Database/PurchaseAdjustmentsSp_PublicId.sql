-- ==============================================================
-- Purchase Adjustments - Spare Parts & Lubricants : Public Id (uuid v7)
-- --------------------------------------------------------------
-- The id used in links and API calls instead of the internal
-- number (decisions-public-id-uuid).
--
-- When the table is not in this database yet, the script only
-- prints a notice and changes nothing.
--
-- Needs PostgreSQL 18 (uuidv7). Safe to run again.
-- ==============================================================

DO $$
BEGIN
    IF NOT EXISTS
    (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name   = 'PurchaseAdjustmentsSp'
    )
    THEN
        RAISE NOTICE 'Table "PurchaseAdjustmentsSp" does not exist yet - nothing to do.';
        RETURN;
    END IF;

    IF NOT EXISTS
    (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'PurchaseAdjustmentsSp'
          AND column_name  = 'PublicId'
    )
    THEN
        ALTER TABLE "PurchaseAdjustmentsSp"
            ADD COLUMN "PublicId" uuid NOT NULL DEFAULT uuidv7();
    END IF;

    CREATE UNIQUE INDEX IF NOT EXISTS "UX_PurchaseAdjustmentsSp_PublicId"
        ON "PurchaseAdjustmentsSp" ("PublicId");

    RAISE NOTICE 'Done : % rows, % public ids (both numbers must be the same).',
        (SELECT COUNT(*) FROM "PurchaseAdjustmentsSp"),
        (SELECT COUNT(DISTINCT "PublicId") FROM "PurchaseAdjustmentsSp");
END $$;
