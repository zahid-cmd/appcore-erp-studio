-- =====================================================================
-- EnquiryFollowUps_PublicId.sql
-- ---------------------------------------------------------------------
-- PublicId (uuid v7) for the two Follow-ups & Appointments pages,
-- which became full CRUD pages on 2026-11-06 :
--     ServiceAppointments   (Service Appointments page)
--     SalesTestRides        (Test Rides page)
-- The list / form links carry the PublicId, never the internal id.
--
-- Existing rows get distinct values. Run after
-- ServiceAppointments_Tables.sql and SalesTestRides_Tables.sql.
-- PostgreSQL 18 (uuidv7). ASCII only. Safe to run again.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Columns + unique indexes
-- ---------------------------------------------------------------------

DO $$
BEGIN
    IF to_regclass('public."ServiceAppointments"') IS NULL THEN
        RAISE EXCEPTION 'Table ServiceAppointments not found : run ServiceAppointments_Tables.sql first';
    END IF;

    IF to_regclass('public."SalesTestRides"') IS NULL THEN
        RAISE EXCEPTION 'Table SalesTestRides not found : run SalesTestRides_Tables.sql first';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                     AND table_name   = 'ServiceAppointments'
                     AND column_name  = 'PublicId') THEN
        ALTER TABLE public."ServiceAppointments"
            ADD COLUMN "PublicId" uuid NOT NULL DEFAULT uuidv7();
        RAISE NOTICE 'ServiceAppointments.PublicId added';
    ELSE
        RAISE NOTICE 'ServiceAppointments.PublicId already there';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                     AND table_name   = 'SalesTestRides'
                     AND column_name  = 'PublicId') THEN
        ALTER TABLE public."SalesTestRides"
            ADD COLUMN "PublicId" uuid NOT NULL DEFAULT uuidv7();
        RAISE NOTICE 'SalesTestRides.PublicId added';
    ELSE
        RAISE NOTICE 'SalesTestRides.PublicId already there';
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "UX_ServiceAppointments_PublicId"
    ON public."ServiceAppointments" ("PublicId");

CREATE UNIQUE INDEX IF NOT EXISTS "UX_SalesTestRides_PublicId"
    ON public."SalesTestRides" ("PublicId");


-- ---------------------------------------------------------------------
-- 2. Check : every row has its own PublicId
-- ---------------------------------------------------------------------

SELECT 'ServiceAppointments' AS "Table",
       COUNT(*)                  AS "Rows",
       COUNT(DISTINCT "PublicId") AS "DistinctPublicIds"
FROM   public."ServiceAppointments"
UNION ALL
SELECT 'SalesTestRides',
       COUNT(*),
       COUNT(DISTINCT "PublicId")
FROM   public."SalesTestRides";
