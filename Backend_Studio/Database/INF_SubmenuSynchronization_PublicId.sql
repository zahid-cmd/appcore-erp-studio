-- ==============================================================
-- Submenu Synchronization : Public Id (uuid v7)
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
          AND table_name   = 'INF_SubmenuSynchronization'
    )
    THEN
        RAISE NOTICE 'Table "INF_SubmenuSynchronization" does not exist yet - nothing to do.';
        RETURN;
    END IF;

    IF NOT EXISTS
    (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'INF_SubmenuSynchronization'
          AND column_name  = 'PublicId'
    )
    THEN
        ALTER TABLE "INF_SubmenuSynchronization"
            ADD COLUMN "PublicId" uuid NOT NULL DEFAULT uuidv7();
    END IF;

    CREATE UNIQUE INDEX IF NOT EXISTS "UX_INF_SubmenuSynchronization_PublicId"
        ON "INF_SubmenuSynchronization" ("PublicId");

    RAISE NOTICE 'Done : % rows, % public ids (both numbers must be the same).',
        (SELECT COUNT(*) FROM "INF_SubmenuSynchronization"),
        (SELECT COUNT(DISTINCT "PublicId") FROM "INF_SubmenuSynchronization");
END $$;
