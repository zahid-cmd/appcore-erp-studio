-- =====================================================================
-- EnquiryManagement_ClearMenus.sql   (2026-11-03)
-- ---------------------------------------------------------------------
-- KEPT    : the module MOD-010 Enquiry Management itself.
-- REMOVED : EVERY menu and EVERY submenu under it (deleted ones too),
--           i.e. all routes /enquiry-management/... , plus every row
--           that points to them (permissions, code sync, page
--           activities, system configurations) and any EMPTY baseline
--           table a Code Sync made for a submenu.
--
-- Hard delete, so menu / submenu codes start again from 001.
-- Replaces EnquiryAnalysis_Menu_Delete.sql and
-- EnquiryProfiles_Menu_Delete.sql (no need to run those).
-- Missing tables / columns are skipped. One transaction.
-- Run the whole script (F5). Safe to run again.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Preview : what will be removed
-- ---------------------------------------------------------------------

SELECT 'Menu' AS "Kind", m."Id", m."Code", m."Name", m."Route"
FROM   "NavigationMenus" m
WHERE  m."Route" ILIKE '/enquiry-management/%'
UNION ALL
SELECT 'Submenu', s."Id", s."Code", s."Name", s."Route"
FROM   "NavigationSubmenus" s
WHERE  s."Route" ILIKE '/enquiry-management/%'
ORDER  BY 1, 3;


-- ---------------------------------------------------------------------
-- 2. Delete
-- ---------------------------------------------------------------------

DO $$
DECLARE
    v_prefix text := '/enquiry-management/';
    x        record;
    r        record;
    v_tbl    text;
    n        bigint;
BEGIN
    -- ---------- Every submenu ----------
    FOR x IN
        SELECT "Id", "Code", "Name"
        FROM   "NavigationSubmenus"
        WHERE  "Route" ILIKE v_prefix || '%'
        ORDER  BY "Code"
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

        -- Baseline table (PascalCase of the name), only if empty
        v_tbl := replace(initcap(regexp_replace(x."Name", '[^A-Za-z0-9]+', ' ', 'g')), ' ', '');
        IF to_regclass(format('public.%I', v_tbl)) IS NOT NULL THEN
            EXECUTE format('SELECT COUNT(*) FROM public.%I', v_tbl) INTO n;
            IF n = 0 THEN
                EXECUTE format('DROP TABLE public.%I', v_tbl);
                RAISE NOTICE 'Table % dropped (was empty)', v_tbl;
            ELSE
                RAISE NOTICE 'Table % has % row(s) : NOT dropped', v_tbl, n;
            END IF;
        END IF;

        DELETE FROM "NavigationSubmenus" WHERE "Id" = x."Id";
        GET DIAGNOSTICS n = ROW_COUNT;
        RAISE NOTICE 'NavigationSubmenus : % row(s) removed', n;
    END LOOP;

    -- ---------- Every menu ----------
    FOR x IN
        SELECT "Id", "Code", "Name"
        FROM   "NavigationMenus"
        WHERE  "Route" ILIKE v_prefix || '%'
        ORDER  BY "Code"
    LOOP
        RAISE NOTICE '--- Menu % % (Id %) ---', x."Code", x."Name", x."Id";

        FOR r IN
            SELECT * FROM (VALUES
                ('ActivityAssignmentDetails', 'MenuId',             'id'),
                ('SpecialAssignmentDetails',  'MenuId',             'id'),
                ('CodeSynchronizations',      'MenuId',             'id'),
                ('INF_MenuSynchronization',   'MenuId',             'id'),
                ('SystemConfigurations',      'NavigationMenuCode', 'code')
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

        DELETE FROM "NavigationMenus" WHERE "Id" = x."Id";
        GET DIAGNOSTICS n = ROW_COUNT;
        RAISE NOTICE 'NavigationMenus : % row(s) removed', n;
    END LOOP;
END
$$;


-- ---------------------------------------------------------------------
-- 3. Check : module still there, no menus / submenus left
-- ---------------------------------------------------------------------

SELECT (SELECT COUNT(*) FROM "NavigationMenus"
        WHERE "Route" ILIKE '/enquiry-management/%')    AS "MenusLeft",
       (SELECT COUNT(*) FROM "NavigationSubmenus"
        WHERE "Route" ILIKE '/enquiry-management/%')    AS "SubmenusLeft";
