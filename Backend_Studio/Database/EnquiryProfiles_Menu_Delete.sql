-- =====================================================================
-- EnquiryProfiles_Menu_Delete.sql   (2026-11-03)
-- ---------------------------------------------------------------------
-- Permanently removes the menu
--     MNU-010-002  Enquiry Profiles   /enquiry-management/enquiry-profiles
-- and EVERY submenu under it (deleted ones too), e.g.
--     SUB-010-002-001  Sales Enquiries
--     SUB-010-002-002  Service Enquiries
-- plus every row that points to them (permissions, code sync,
-- page activities, system configurations) and any EMPTY baseline
-- table a Code Sync made for them.
--
-- Hard delete, so the codes are free again.
-- Missing tables / columns are skipped. One transaction.
-- Run the whole script (F5). Safe to run again.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Preview
-- ---------------------------------------------------------------------

SELECT 'Menu' AS "Kind", m."Id", m."Code", m."Name", m."Route"
FROM   "NavigationMenus" m
WHERE  m."Code" = 'MNU-010-002'
UNION ALL
SELECT 'Submenu', s."Id", s."Code", s."Name", s."Route"
FROM   "NavigationSubmenus" s
WHERE  s."Route" ILIKE '/enquiry-management/enquiry-profiles/%'
ORDER  BY 1, 3;


-- ---------------------------------------------------------------------
-- 2. Delete
-- ---------------------------------------------------------------------

DO $$
DECLARE
    v_menu_id   bigint;
    v_menu_code text := 'MNU-010-002';
    v_prefix    text := '/enquiry-management/enquiry-profiles/';
    s           record;
    r           record;
    v_tbl       text;
    n           bigint;
BEGIN
    SELECT "Id" INTO v_menu_id
    FROM   "NavigationMenus"
    WHERE  "Code"  = v_menu_code
    AND    "Route" ILIKE '/enquiry-management/enquiry-profiles';

    -- ---------- Every submenu under the menu ----------
    FOR s IN
        SELECT "Id", "Code", "Name", "Route"
        FROM   "NavigationSubmenus"
        WHERE  "Route" ILIKE v_prefix || '%'
        ORDER  BY "Code"
    LOOP
        RAISE NOTICE '--- Submenu % % (Id %) ---', s."Code", s."Name", s."Id";

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

        -- Baseline table (PascalCase of the name, e.g. SalesEnquiries),
        -- only if a Code Sync made it and it is empty
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
        GET DIAGNOSTICS n = ROW_COUNT;
        RAISE NOTICE 'NavigationSubmenus : % row(s) removed', n;
    END LOOP;

    -- ---------- The menu ----------
    IF v_menu_id IS NULL THEN
        RAISE NOTICE 'Menu % not found : already removed.', v_menu_code;
        RETURN;
    END IF;

    RAISE NOTICE '--- Menu % (Id %) ---', v_menu_code, v_menu_id;
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
            EXECUTE format('DELETE FROM public.%I WHERE %I = $1', r.tbl, r.col) USING v_menu_id;
        ELSE
            EXECUTE format('DELETE FROM public.%I WHERE %I = $1', r.tbl, r.col) USING v_menu_code;
        END IF;
        GET DIAGNOSTICS n = ROW_COUNT;
        RAISE NOTICE '% : % row(s) removed', r.tbl, n;
    END LOOP;

    DELETE FROM "NavigationMenus" WHERE "Id" = v_menu_id;
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE 'NavigationMenus : % row(s) removed', n;
END
$$;


-- ---------------------------------------------------------------------
-- 3. Check : the Enquiry Management menus and submenus left
-- ---------------------------------------------------------------------

SELECT 'Menu' AS "Kind", m."Code", m."Name", m."Route"
FROM   "NavigationMenus" m
WHERE  m."Route" ILIKE '/enquiry-management/%'
UNION ALL
SELECT 'Submenu', s."Code", s."Name", s."Route"
FROM   "NavigationSubmenus" s
WHERE  s."Route" ILIKE '/enquiry-management/%'
ORDER  BY 1, 2;
