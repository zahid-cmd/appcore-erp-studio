-- ==============================================================
-- Membership Fees Collection : Public Id (uuid v7)
-- --------------------------------------------------------------
-- The id used in links and API calls instead of the internal
-- number (decisions-public-id-uuid).
--
-- The "MembershipFeesCollection" table is not in this database
-- yet (the page was built, its table never created). This script
-- then only prints a notice and changes nothing. Run it again
-- after the table is created.
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
          AND table_name   = 'MembershipFeesCollection'
    )
    THEN
        RAISE NOTICE 'Table "MembershipFeesCollection" does not exist yet - nothing to do.';
        RETURN;
    END IF;

    IF NOT EXISTS
    (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'MembershipFeesCollection'
          AND column_name  = 'PublicId'
    )
    THEN
        ALTER TABLE "MembershipFeesCollection"
            ADD COLUMN "PublicId" uuid NOT NULL DEFAULT uuidv7();
    END IF;

    CREATE UNIQUE INDEX IF NOT EXISTS "UX_MembershipFeesCollection_PublicId"
        ON "MembershipFeesCollection" ("PublicId");

    RAISE NOTICE 'Done : % rows, % public ids (both numbers must be the same).',
        (SELECT COUNT(*) FROM "MembershipFeesCollection"),
        (SELECT COUNT(DISTINCT "PublicId") FROM "MembershipFeesCollection");
END $$;
