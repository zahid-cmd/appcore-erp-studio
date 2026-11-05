-- =====================================================================
-- EnquiryFollowUps_DeleteSubmenus.sql   (2026-11-04)
-- ---------------------------------------------------------------------
-- Removes for good the two submenus of Follow-ups & Appointments that
-- are no longer used (calls are logged from Sales / Service Enquiries):
--     Sales Follow-ups     /enquiry-management/follow-ups-appointments/sales-follow-ups
--     Service Follow-ups   /enquiry-management/follow-ups-appointments/service-follow-ups
-- and every row that points to them (activity / special assignments,
-- code sync, page activities, system configurations).
--
-- KEPT : the menu Follow-ups & Appointments, Service Appointments,
--        Test Rides, and the table "SalesFollowUps" (the calls logged
--        from Sales Enquiries live there : it is NOT dropped).
--
-- Hard delete. Missing tables / columns are skipped. Replaces
-- EnquiryFollowUps_HideSubmenus.sql (no need to run that one).
-- Run the whole script (F5). Safe to run again.
-- =====================================================================


-- 1. Preview

SELECT s."Id", s."Code", s."Name", s."Route", s."IsActive"
FROM   "NavigationSubmenus" s
WHERE  lower(s."Route") IN
       (
           '/enquiry-management/follow-ups-appointments/sales-follow-ups',
           '/enquiry-management/follow-ups-appointments/service-follow-ups'
       );


-- 2. Delete

DO $$
DECLARE
    x record;
    r record;
    n bigint;
BEGIN
    FOR x IN
        SELECT "Id", "Code", "Name"
        FROM   "NavigationSubmenus"
        WHERE  lower("Route") IN
               (
                   '/enquiry-management/follow-ups-appointments/sales-follow-ups',
                   '/enquiry-management/follow-ups-appointments/service-follow-ups'
               )
    LOOP
        RAISE NOTICE '--- Submenu % % (Id %) ---', x."Code", x."Name", x."Id";

        FOR r IN
            SELECT * FROM (VALUES
                ('ActivityAssignmentDetails',  'SubMenuId',             'id'),
                ('SpecialAssignmentDetails',   'SubMenuId',             'id'),
                ('CodeSynchronizations',       'SubmenuId',             'id'),
                ('INF_SubmenuSynchronization', 'SubmenuId',             'id'),
                ('MasterActivityPages',        'NavigationSubmenuCode', 'code'),
                ('SystemConfigurations',       'NavigationSubmenuCode', 'code')
            ) AS t (tbl, col, kind)
        LOOP
            IF to_regclass(format('public.%I', r.tbl)) IS NULL
               OR NOT EXISTS (SELECT 1 FROM information_schema.columns
                              WHERE table_schema = 'public'
                              AND   table_name   = r.tbl
                              AND   column_name  = r.col) THEN
                RAISE NOTICE '%.% not found, skipped', r.tbl, r.col;
                CONTINUE;
            END IF;

            IF r.kind = 'id' THEN
                EXECUTE format('DELETE FROM public.%I WHERE %I = $1', r.tbl, r.col) USING x."Id";
            ELSE
                EXECUTE format('DELETE FROM public.%I WHERE %I = $1', r.tbl, r.col) USING x."Code";
            END IF;

            GET DIAGNOSTICS n = ROW_COUNT;
            RAISE NOTICE '% : % row(s) removed', r.tbl, n;
        END LOOP;

        DELETE FROM "NavigationSubmenus" WHERE "Id" = x."Id";
        GET DIAGNOSTICS n = ROW_COUNT;
        RAISE NOTICE 'NavigationSubmenus : % row(s) removed', n;
    END LOOP;
END
$$;


-- 3. Check : 0 left; the calls table is still there

SELECT (SELECT COUNT(*) FROM "NavigationSubmenus"
        WHERE lower("Route") IN
              ('/enquiry-management/follow-ups-appointments/sales-follow-ups',
               '/enquiry-management/follow-ups-appointments/service-follow-ups')) AS "SubmenusLeft",
       to_regclass('public."SalesFollowUps"') IS NOT NULL                          AS "CallsTableKept";
