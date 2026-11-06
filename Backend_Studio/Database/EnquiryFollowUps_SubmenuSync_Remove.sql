-- =====================================================================
-- EnquiryFollowUps_SubmenuSync_Remove.sql
-- ---------------------------------------------------------------------
-- Remove the Submenu Synchronization and Code Synchronization records
-- of the two Follow-ups & Appointments pages :
--     /enquiry-management/follow-ups-appointments/service-appointments
--     /enquiry-management/follow-ups-appointments/test-rides
-- They are hand-written boards (tables ServiceAppointments and
-- SalesTestRides, API on the enquiry controllers) : no CRUD baseline.
--
-- KEPT    : the two submenus in Navigation (sidebar items, page
--           activities, role permissions) and the menu MNU-010-002.
--           The real tables ServiceAppointments / SalesTestRides.
-- REMOVED : every row of these two submenus in the synchronization
--           tables (INF_SubmenuSynchronization, CodeSynchronizations
--           and any other *Synchronization* table with a SubmenuId,
--           e.g. the frontend / backend sync records).
--           The baseline table "TestRides", only if the sync made it
--           and it is empty.
--
-- Same way as InventoryStatus_SubmenuSync_Rollback.sql. Safe to run
-- again.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Preview : the two submenus
-- ---------------------------------------------------------------------

SELECT s."Id", s."Code", s."Name", s."Route"
FROM   "NavigationSubmenus" s
WHERE  s."Route" ILIKE '/enquiry-management/follow-ups-appointments/%';


-- ---------------------------------------------------------------------
-- 2. Remove the sync rows
-- ---------------------------------------------------------------------

DO $$
DECLARE
    t        record;
    removed  bigint;
    ids      bigint[];
    cnt      bigint;
BEGIN
    SELECT array_agg(s."Id")
    INTO   ids
    FROM   "NavigationSubmenus" s
    WHERE  s."Route" ILIKE '/enquiry-management/follow-ups-appointments/%';

    IF ids IS NULL THEN
        RAISE NOTICE 'No submenu found under /enquiry-management/follow-ups-appointments/ : nothing to do';
        RETURN;
    END IF;

    RAISE NOTICE 'Submenu ids : %', ids;

    -- Every synchronization table that keys on SubmenuId
    -- (history / backup copies are left alone)
    FOR t IN
        SELECT c.table_name
        FROM   information_schema.columns c
        JOIN   information_schema.tables  tb
               ON  tb.table_schema = c.table_schema
               AND tb.table_name   = c.table_name
               AND tb.table_type   = 'BASE TABLE'
        WHERE  c.table_schema = 'public'
          AND  c.column_name  = 'SubmenuId'
          AND  c.table_name ILIKE '%synchroni%'
          AND  c.table_name NOT ILIKE '%histor%'
          AND  c.table_name NOT ILIKE '%backup%'
        ORDER  BY c.table_name
    LOOP
        EXECUTE format('DELETE FROM public.%I WHERE "SubmenuId" = ANY($1)', t.table_name)
        USING  ids;
        GET DIAGNOSTICS removed = ROW_COUNT;
        RAISE NOTICE '% : % row(s) removed', t.table_name, removed;
    END LOOP;

    -- Baseline table of the Test Rides sync (the real one is SalesTestRides)
    IF to_regclass('public."TestRides"') IS NOT NULL THEN
        EXECUTE 'SELECT COUNT(*) FROM public."TestRides"' INTO cnt;
        IF cnt = 0 THEN
            EXECUTE 'DROP TABLE public."TestRides"';
            RAISE NOTICE 'Baseline table TestRides dropped (was empty)';
        ELSE
            RAISE NOTICE 'Table TestRides has % row(s) : NOT dropped, check it by hand', cnt;
        END IF;
    END IF;
END
$$;


-- ---------------------------------------------------------------------
-- 3. Check : the submenus are still there; no sync rows left
-- ---------------------------------------------------------------------

SELECT s."Code", s."Name", s."Route", s."IsActive"
FROM   "NavigationSubmenus" s
WHERE  s."Route" ILIKE '/enquiry-management/follow-ups-appointments/%';

SELECT 'INF_SubmenuSynchronization' AS "Table", COUNT(*) AS "RowsLeft"
FROM   "INF_SubmenuSynchronization"
WHERE  "SubmenuId" IN (SELECT "Id" FROM "NavigationSubmenus"
                       WHERE "Route" ILIKE '/enquiry-management/follow-ups-appointments/%')
UNION ALL
SELECT 'CodeSynchronizations', COUNT(*)
FROM   "CodeSynchronizations"
WHERE  "SubmenuId" IN (SELECT "Id" FROM "NavigationSubmenus"
                       WHERE "Route" ILIKE '/enquiry-management/follow-ups-appointments/%');
