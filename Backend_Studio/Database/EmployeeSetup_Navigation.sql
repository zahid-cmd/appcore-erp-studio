ROLLBACK;

-- =====================================================================
-- EmployeeSetup_Navigation.sql   (2026-11-20)
-- ---------------------------------------------------------------------
-- Blueprint : claude\blueprint-module-isolation.md (decision D1,
-- section 5a)
--
--   Human Resource > Human Resource Setup > Department
--   Human Resource > Human Resource Setup > Designation
--   Human Resource > Employee Management  > Employee Profiles
--   move to a NEW menu
--   Settings > Employee Setup
--
-- Why : employees, departments and designations are used by the whole
-- ERP (sales persons, technicians, cashiers). Human Resource
-- Management can be switched off for a company; Settings cannot. The
-- three pages must stay reachable.
--
-- 1. Creates the menu Employee Setup (route key employee-setup) under
--    Settings, as its last menu, when it is not there.
-- 2. Moves the three pages into it. Each page keeps its Id, name and
--    route key. Its menu, number, code and route change, and every
--    table that keeps those follows (INF_SubmenuSynchronization,
--    CodeSynchronizations, SystemConfigurations, MasterActivityPages,
--    ActivityAssignmentDetails, SpecialAssignmentDetails), so the
--    permissions ticked for the pages stay. Favourites follow by
--    themselves (they keep the page Id).
--
-- Page files and API addresses are NOT moved; the old addresses open
-- the new ones (code change, same day).
--
-- Run on EACH database that has the ERP navigation :
--     AppCoreERP_Studio, AppCoreTpl_TW, AppCore_TW_DEMO
-- Query Tool on that database, the whole file (F5). Read the Messages
-- tab, then run COMMIT; (or ROLLBACK;). Restart the API with the new
-- code and log in again.
-- Safe to run again ("already moved").
-- Do NOT run Module / Menu / Submenu / Code Sync for these pages.
-- ASCII only.
-- =====================================================================

BEGIN;

DO $$
DECLARE
    v_target    record;   -- module Settings
    v_hr        record;   -- module Human Resource
    v_menu      record;   -- menu Employee Setup (target)
    v_sub       record;   -- the page
    r           record;
    v_seq       int;
    v_order     int;
    v_code      text;
    v_new_sub   text;
    t           text;
    n           bigint;
    v_moved     int := 0;
BEGIN
    SELECT "Id", "Code", "Name", "RouteKey", "SequenceNo" INTO v_target
    FROM   "NavigationModules"
    WHERE  lower(trim("RouteKey")) = 'settings' AND "IsDeleted" = false
    ORDER  BY "Id" LIMIT 1;

    IF v_target."Id" IS NULL THEN
        RAISE EXCEPTION 'Module Settings (route key settings) not found - nothing was changed.';
    END IF;

    SELECT "Id", "Code", "Name", "RouteKey" INTO v_hr
    FROM   "NavigationModules"
    WHERE  lower(trim("RouteKey")) = 'human-resource-manangement'
    ORDER  BY "IsDeleted", "Id" LIMIT 1;

    IF v_hr."Id" IS NULL THEN
        RAISE EXCEPTION 'Module Human Resource (route key human-resource-manangement) not found - nothing was changed.';
    END IF;

    -- -----------------------------------------------------------------
    -- 1. the menu Employee Setup under Settings
    -- -----------------------------------------------------------------
    SELECT "Id", "Code", "Name", "RouteKey" INTO v_menu
    FROM   "NavigationMenus"
    WHERE  "NavigationModuleId" = v_target."Id"
    AND    lower(trim("RouteKey")) = 'employee-setup'
    AND    "IsDeleted" = false
    ORDER  BY "Id" LIMIT 1;

    IF v_menu."Id" IS NULL THEN
        IF EXISTS (SELECT 1 FROM "NavigationMenus"
                   WHERE "NavigationModuleId" = v_target."Id"
                   AND   lower(trim("RouteKey")) = 'employee-setup') THEN
            RAISE EXCEPTION 'A deleted menu employee-setup exists under Settings. Tell Claude - nothing was changed.';
        END IF;

        SELECT COALESCE(MAX("SequenceNo"), 0) + 1, COALESCE(MAX("DisplayOrder"), 0) + 1
        INTO   v_seq, v_order
        FROM   "NavigationMenus"
        WHERE  "NavigationModuleId" = v_target."Id";

        v_code := 'MNU-' || lpad(v_target."SequenceNo"::text, 3, '0')
                         || '-' || lpad(v_seq::text, 3, '0');

        IF EXISTS (SELECT 1 FROM "NavigationMenus" WHERE "Code" = v_code) THEN
            RAISE EXCEPTION 'Menu code % is already used. Tell Claude - nothing was changed.', v_code;
        END IF;

        INSERT INTO "NavigationMenus"
            ("NavigationModuleId", "SequenceNo", "Code", "Name", "Icon",
             "RouteKey", "Route", "DisplayOrder", "Remarks",
             "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        VALUES
            (v_target."Id", v_seq, v_code, 'Employee Setup', 'fa-solid fa-id-badge',
             'employee-setup', '/' || v_target."RouteKey" || '/employee-setup',
             v_order, 'Departments, designations and employees : used by the whole ERP.',
             true, false, 1, now());

        SELECT "Id", "Code", "Name", "RouteKey" INTO v_menu
        FROM   "NavigationMenus"
        WHERE  "Code" = v_code;

        RAISE NOTICE 'Menu created : % % (under %)', v_menu."Code", v_menu."Name", v_target."Name";
    ELSE
        RAISE NOTICE 'Menu % % is already there.', v_menu."Code", v_menu."Name";
    END IF;

    -- -----------------------------------------------------------------
    -- 2. the three pages
    -- -----------------------------------------------------------------
    FOR r IN
        SELECT * FROM (VALUES
            (1, 'department'),
            (2, 'designation'),
            (3, 'employees')
        ) AS x(pos, page_key)
        ORDER BY pos
    LOOP
        -- already there ?
        IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
                   WHERE "NavigationMenuId" = v_menu."Id"
                   AND   lower(trim("RouteKey")) = r.page_key) THEN
            RAISE NOTICE 'Page % is already under Employee Setup : left as it is.', r.page_key;
            CONTINUE;
        END IF;

        -- the page, in a menu of Human Resource
        SELECT s."Id", s."Code", s."Name", s."RouteKey" INTO v_sub
        FROM   "NavigationSubmenus" s
        JOIN   "NavigationMenus" m ON m."Id" = s."NavigationMenuId"
        WHERE  m."NavigationModuleId" = v_hr."Id"
        AND    lower(trim(s."RouteKey")) = r.page_key
        ORDER  BY s."IsDeleted", s."Id"
        LIMIT  1;

        IF v_sub."Id" IS NULL THEN
            RAISE EXCEPTION 'Page % not found under Human Resource - nothing was changed.', r.page_key;
        END IF;

        SELECT COALESCE(MAX("SequenceNo"), 0) + 1, COALESCE(MAX("DisplayOrder"), 0) + 1
        INTO   v_seq, v_order
        FROM   "NavigationSubmenus"
        WHERE  "NavigationMenuId" = v_menu."Id";

        v_new_sub := 'SUB-' || substr(v_menu."Code", 5) || '-' || lpad(v_seq::text, 3, '0');

        IF EXISTS (SELECT 1 FROM "NavigationSubmenus" WHERE "Code" = v_new_sub AND "Id" <> v_sub."Id") THEN
            RAISE EXCEPTION 'Page code % is already used. Tell Claude - nothing was changed.', v_new_sub;
        END IF;

        UPDATE "NavigationSubmenus"
        SET    "NavigationMenuId" = v_menu."Id",
               "SequenceNo"       = v_seq,
               "Code"             = v_new_sub,
               "Route"            = '/' || v_target."RouteKey" || '/' || v_menu."RouteKey" || '/' || r.page_key,
               "DisplayOrder"     = v_order
        WHERE  "Id" = v_sub."Id";

        FOREACH t IN ARRAY ARRAY['INF_SubmenuSynchronization', 'CodeSynchronizations']
        LOOP
            IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
                EXECUTE format(
                    'UPDATE public.%I
                     SET    "SubmenuCode" = $1,
                            "ModuleId" = $2, "ModuleCode" = $3, "ModuleName" = $4,
                            "MenuId" = $5, "MenuCode" = $6, "MenuName" = $7
                     WHERE  "SubmenuId" = $8', t)
                USING v_new_sub, v_target."Id", v_target."Code", v_target."Name",
                      v_menu."Id", v_menu."Code", v_menu."Name", v_sub."Id";
            END IF;
        END LOOP;

        IF to_regclass('public."SystemConfigurations"') IS NOT NULL THEN
            UPDATE "SystemConfigurations"
            SET    "NavigationSubmenuCode" = v_new_sub,
                   "NavigationMenuCode"    = v_menu."Code",
                   "NavigationModuleId"    = v_target."Id"
            WHERE  "NavigationSubmenuCode" = v_sub."Code";
        END IF;

        IF to_regclass('public."MasterActivityPages"') IS NOT NULL THEN
            UPDATE "MasterActivityPages"
            SET    "NavigationSubmenuCode" = v_new_sub
            WHERE  "NavigationSubmenuCode" = v_sub."Code";
        END IF;

        -- permissions ticked for the page follow it
        FOREACH t IN ARRAY ARRAY['ActivityAssignmentDetails', 'SpecialAssignmentDetails']
        LOOP
            IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
                EXECUTE format(
                    'UPDATE public.%I SET "ModuleId" = $1, "MenuId" = $2 WHERE "SubMenuId" = $3', t)
                USING v_target."Id", v_menu."Id", v_sub."Id";
            END IF;
        END LOOP;

        n := 0;

        IF to_regclass('public."ActivityAssignmentDetails"') IS NOT NULL THEN
            SELECT count(*) INTO n FROM "ActivityAssignmentDetails" WHERE "SubMenuId" = v_sub."Id";
        END IF;

        v_moved := v_moved + 1;

        RAISE NOTICE 'Page   %  % -> %  (% permission row(s) follow)', v_sub."Name", v_sub."Code", v_new_sub, n;
    END LOOP;

    RAISE NOTICE '% page(s) moved to % %.', v_moved, v_menu."Code", v_menu."Name";
    RAISE NOTICE 'Done. Check the lines above, then run COMMIT; (or ROLLBACK;). Log in again to see the menu.';
END $$;


-- Run one of these by hand :
-- COMMIT;
-- ROLLBACK;


-- ---------------------------------------------------------------------
-- Check (after COMMIT, run on its own)
-- ---------------------------------------------------------------------
-- SELECT s."DisplayOrder", s."Code" AS "Page code", s."Name" AS "Page", s."Route"
-- FROM   "NavigationSubmenus" s
-- JOIN   "NavigationMenus" m ON m."Id" = s."NavigationMenuId"
-- WHERE  lower(m."RouteKey") = 'employee-setup' AND s."IsDeleted" = false
-- ORDER  BY s."DisplayOrder";
