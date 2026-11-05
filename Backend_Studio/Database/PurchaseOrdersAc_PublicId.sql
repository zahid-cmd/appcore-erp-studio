-- ==============================================================
-- Purchase Orders - Accessories : Public Id (uuid v7)
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
          AND table_name   = 'PurchaseOrdersAc'
    )
    THEN
        RAISE NOTICE 'Table "PurchaseOrdersAc" does not exist yet - nothing to do.';
        RETURN;
    END IF;

    IF NOT EXISTS
    (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'PurchaseOrdersAc'
          AND column_name  = 'PublicId'
    )
    THEN
        ALTER TABLE "PurchaseOrdersAc"
            ADD COLUMN "PublicId" uuid NOT NULL DEFAULT uuidv7();
    END IF;

    CREATE UNIQUE INDEX IF NOT EXISTS "UX_PurchaseOrdersAc_PublicId"
        ON "PurchaseOrdersAc" ("PublicId");

    RAISE NOTICE 'Done : % rows, % public ids (both numbers must be the same).',
        (SELECT COUNT(*) FROM "PurchaseOrdersAc"),
        (SELECT COUNT(DISTINCT "PublicId") FROM "PurchaseOrdersAc");
END $$;
