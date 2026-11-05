-- =====================================================================
-- RegistrationManagement_FeesMerge.sql   (2026-11-03)
-- ---------------------------------------------------------------------
-- For a database where RegistrationManagement_Navigation.sql was
-- already run (14 submenus). Owner decision 2026-11-03 :
--
--   Registration Processing
--     Registration Fees Collection  -> renamed  Registration Fees
--                                      (collection, refund and
--                                       cancellation / forfeit on one page)
--     Registration Fees Refunds     -> removed  (merged into Registration Fees)
--   Customer File
--     Name Transfer Fees Collection -> removed  (fees on Name Transfers)
--
-- Result : 12 submenus
--   Customer File           : Customer File Dashboard . Customer Files .
--                             Name Transfers . Customer File Configuration
--   Registration Processing : Registration Fees . Registration Files .
--                             BRTA Payments . Delivery Acknowledgements
--
-- Removed submenus : hard delete with every row that points to them
-- (permissions, code sync, page activities, system configurations)
-- and any EMPTY baseline table a Code Sync made for them.
-- Renamed submenu : same Id and Code (permissions kept); name, route
-- key and route changed. If a Code Sync was already done for it, the
-- sync rows are cleared and its baseline table dropped when empty, so
-- Code Sync can make it again under the new name.
-- Display order of the two menus is closed up (relative order kept).
--
-- Missing tables / columns are skipped. One transaction.
-- Run the whole script (F5). Safe to run again.
-- AFTER : Menu Sync, then log in again.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Preview
-- ---------------------------------------------------------------------

SELECT s."Id", s."Code", s."Name", s."Route", s."DisplayOrder"
FROM   "NavigationSubmenus" s
WHERE  s."Route" ILIKE '/registration-management/customer-file/%'
OR     s."Route" ILIKE '/registration-management/registration-processing/%'
ORDER  BY s."Route";


-- ---------------------------------------------------------------------
-- 2. Change
-- ---------------------------------------------------------------------

DO $$
DECLARE
    v_module    record;
    s           record;
    r           record;
    v_tbl       text;
    v_route     text;
    n           bigint;
BEGIN
    SELECT "Id", "RouteKey" INTO v_module
    FROM   "NavigationModules"
    WHERE  lower("RouteKey") = 'registration-management'
    AND    "IsDeleted" = false;

    IF v_module."Id" IS NULL THEN
        RAISE EXCEPTION 'Module with route key registration-management not found.';
    END IF;

    -- ---------- A. Remove the merged submenus ----------
    FOR s IN
        SELECT "Id", "Code", "Name", "Route"
        FROM   "NavigationSubmenus"
        WHERE  lower("Route") IN
               ('/registration-management/registration-processing/registration-fees-refunds',
                '/registration-management/registration-processing/registration-fees-refunds-cancellations',
                '/registration-management/customer-file/name-transfer-fees-collection')
        ORDER  BY "Code"
    LOOP
        RAISE NOTICE '--- Remove submenu % % (Id %) ---', s."Code", s."Name", s."Id";

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
                EXECUTE format('DELETE FROM public.%I WHERE %I = $1', r.tbl, r.col) USING s."Id";
            ELSE
                EXECUTE format('DELETE FROM public.%I WHERE %I = $1', r.tbl, r.col) USING s."Code";
            END IF;
            GET DIAGNOSTICS n = ROW_COUNT;
            RAISE NOTICE '% : % row(s) removed', r.tbl, n;
        END LOOP;

        v_tbl := replace(initcap(regexp_replace(s."Name", '[^A-Za-z0-9]+', ' ', 'g')), ' ', '');
        IF to_regclass(format('public.%I', v_tbl)) IS NOT NULL THEN
            EXECUTE format('SELECT COUNT(*) FROM public.%I', v_tbl) INTO n;
            IF n = 0 THEN
                EXECUTE format('DROP TABLE public.%I', v_tbl);
                RAISE NOTICE 'Table % dropped (was empty)', v_tbl;
            ELSE
                RAISE NOTICE 'Table % has % row(s) : NOT dropped', v_tbl, n;
            END IF;
        END IF;

        DELETE FROM "NavigationSubmenus" WHERE "Id" = s."Id";
        RAISE NOTICE 'Submenu removed : %', s."Name";
    END LOOP;

    -- ---------- B. Rename Registration Fees Collection ----------
    SELECT "Id", "Code", "Name", "Route" INTO s
    FROM   "NavigationSubmenus"
    WHERE  lower("Route") = '/registration-management/registration-processing/registration-fees-collection'
    AND    "IsDeleted" = false;

    IF s."Id" IS NULL THEN
        RAISE NOTICE 'Registration Fees Collection not found : already renamed or never created.';
    ELSE
        IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
                   WHERE  lower("Name") = 'registration fees'
                   AND    "Id" <> s."Id"
                   AND    "IsDeleted" = false) THEN
            RAISE EXCEPTION 'A submenu named "Registration Fees" already exists elsewhere : names must be unique (Code Sync).';
        END IF;

        -- Code Sync done under the old name ? clear it (table only if empty)
        FOR r IN
            SELECT * FROM (VALUES
                ('CodeSynchronizations',       'SubmenuId'),
                ('INF_SubmenuSynchronization', 'SubmenuId')
            ) AS t (tbl, col)
        LOOP
            IF to_regclass(format('public.%I', r.tbl)) IS NOT NULL
               AND EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema = 'public'
                           AND   table_name   = r.tbl
                           AND   column_name  = r.col) THEN
                EXECUTE format('DELETE FROM public.%I WHERE %I = $1', r.tbl, r.col) USING s."Id";
                GET DIAGNOSTICS n = ROW_COUNT;
                IF n > 0 THEN
                    RAISE NOTICE '% : % old sync row(s) cleared', r.tbl, n;
                END IF;
            END IF;
        END LOOP;

        v_tbl := 'RegistrationFeesCollection';
        IF to_regclass(format('public.%I', v_tbl)) IS NOT NULL THEN
            EXECUTE format('SELECT COUNT(*) FROM public.%I', v_tbl) INTO n;
            IF n = 0 THEN
                EXECUTE format('DROP TABLE public.%I', v_tbl);
                RAISE NOTICE 'Table % dropped (was empty)', v_tbl;
            ELSE
                RAISE NOTICE 'Table % has % row(s) : NOT dropped', v_tbl, n;
            END IF;
        END IF;

        v_route := '/registration-management/registration-processing/registration-fees';

        UPDATE "NavigationSubmenus"
        SET    "Name"     = 'Registration Fees',
               "RouteKey" = 'registration-fees',
               "Route"    = v_route
        WHERE  "Id" = s."Id";

        RAISE NOTICE 'Renamed : % -> Registration Fees (%)', s."Name", v_route;
    END IF;

    -- ---------- C. Close up the display order of the two menus ----------
    WITH o AS (
        SELECT s2."Id",
               row_number() OVER (PARTITION BY s2."NavigationMenuId"
                                  ORDER BY s2."DisplayOrder", s2."SequenceNo") AS rn
        FROM   "NavigationSubmenus" s2
        JOIN   "NavigationMenus" m ON m."Id" = s2."NavigationMenuId"
        WHERE  m."NavigationModuleId" = v_module."Id"
        AND    lower(m."RouteKey") IN ('customer-file', 'registration-processing')
        AND    m."IsDeleted" = false
        AND    s2."IsDeleted" = false
    )
    UPDATE "NavigationSubmenus" x
    SET    "DisplayOrder" = o.rn
    FROM   o
    WHERE  x."Id" = o."Id"
    AND    x."DisplayOrder" IS DISTINCT FROM o.rn;

    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE 'Display order closed up : % row(s)', n;
END
$$;


-- ---------------------------------------------------------------------
-- 3. Check
-- ---------------------------------------------------------------------

SELECT m."Name" AS "Menu", s."Code", s."Name" AS "Submenu", s."Route", s."DisplayOrder"
FROM   "NavigationSubmenus" s
JOIN   "NavigationMenus" m ON m."Id" = s."NavigationMenuId"
WHERE  s."Route" ILIKE '/registration-management/%'
AND    s."IsDeleted" = false
ORDER  BY m."DisplayOrder", s."DisplayOrder";
