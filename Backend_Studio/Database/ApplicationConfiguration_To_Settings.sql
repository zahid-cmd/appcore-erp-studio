ROLLBACK;

-- =====================================================================
-- ApplicationConfiguration_To_Settings.sql   (2026-11-20)
-- ---------------------------------------------------------------------
-- Owner 2026-11-20 : "we will move full application configuration to
-- setting now its required for client level".
--
--   Infrastructure Control > Application Configuration
--       Login Pages, Dashboards, Widget Configuration
--   moves to
--   Settings > Application Configuration   (right after General Settings)
--
-- The menu keeps its Id, name and route key; its module, code, route
-- and order change, and so do its pages' codes and routes. Every table
-- that keeps those codes / module / menu follows, like a move on
-- Navigation Management (INF_MenuSynchronization,
-- INF_SubmenuSynchronization, CodeSynchronizations,
-- SystemConfigurations, MasterActivityPages, ActivityAssignmentDetails,
-- SpecialAssignmentDetails), so the permissions ticked for the pages
-- stay. Page files and API addresses are NOT moved; the old page
-- addresses open the new ones.
--
-- Infrastructure Control itself becomes AppCore-only : it is hidden and
-- refused on every client address (code change, same day).
--
-- Run on EACH database that has the ERP navigation :
--     AppCoreERP_Studio, AppCoreTpl_TW, AppCore_TW_DEMO
-- Query Tool on that database, the whole file (F5). Read the Messages
-- tab, then run COMMIT; (or ROLLBACK;). Log in again afterwards.
-- Safe to run again ("already under Settings").
-- Do NOT run Module / Menu / Submenu / Code Sync for this menu.
-- ASCII only.
-- =====================================================================

BEGIN;

DO $$
DECLARE
    v_settings  record;   -- target module
    v_infra     record;   -- source module
    v_menu      record;   -- the menu
    v_gs_order  int;
    v_seq       int;
    v_new_menu  text;
    v_old_menu  text;
    v_sub       record;
    v_new_sub   text;
    t           text;
    n           bigint;
BEGIN
    -- ---------------------------------------------------------------
    -- The two modules (never created here)
    -- ---------------------------------------------------------------
    SELECT "Id", "Code", "Name", "RouteKey", "SequenceNo" INTO v_settings
    FROM   "NavigationModules"
    WHERE  lower(trim("RouteKey")) = 'settings' AND "IsDeleted" = false
    ORDER  BY "Id" LIMIT 1;

    IF v_settings."Id" IS NULL THEN
        RAISE EXCEPTION 'Module Settings (route key settings) not found - nothing was changed.';
    END IF;

    SELECT "Id", "Code", "Name", "RouteKey" INTO v_infra
    FROM   "NavigationModules"
    WHERE  lower(trim("RouteKey")) = 'infrastructure-control' AND "IsDeleted" = false
    ORDER  BY "Id" LIMIT 1;

    -- ---------------------------------------------------------------
    -- The menu (already moved = nothing to do)
    -- ---------------------------------------------------------------
    SELECT "Id", "Code", "Name", "NavigationModuleId" INTO v_menu
    FROM   "NavigationMenus"
    WHERE  lower(trim("RouteKey")) = 'application-configuration' AND "IsDeleted" = false
    ORDER  BY ("NavigationModuleId" = v_settings."Id") DESC, "Id"
    LIMIT  1;

    IF v_menu."Id" IS NULL THEN
        RAISE EXCEPTION 'Menu Application Configuration (route key application-configuration) not found - nothing was changed.';
    END IF;

    IF v_menu."NavigationModuleId" = v_settings."Id" THEN
        RAISE NOTICE 'Application Configuration is already under Settings (%). Nothing to do : run ROLLBACK; or COMMIT;', v_menu."Code";
        RETURN;
    END IF;

    v_old_menu := v_menu."Code";

    -- ---------------------------------------------------------------
    -- New menu number and code under Settings (deleted menus counted,
    -- numbers are never reused)
    -- ---------------------------------------------------------------
    SELECT COALESCE(MAX("SequenceNo"), 0) + 1 INTO v_seq
    FROM   "NavigationMenus"
    WHERE  "NavigationModuleId" = v_settings."Id";

    v_new_menu := 'MNU-' || lpad(v_settings."SequenceNo"::text, 3, '0') || '-' || lpad(v_seq::text, 3, '0');

    IF EXISTS (SELECT 1 FROM "NavigationMenus" WHERE "Code" = v_new_menu AND "Id" <> v_menu."Id") THEN
        RAISE EXCEPTION 'Menu code % is already used. Tell Claude - nothing was changed.', v_new_menu;
    END IF;

    -- right after General Settings : the menus after it move down one
    SELECT "DisplayOrder" INTO v_gs_order
    FROM   "NavigationMenus"
    WHERE  "NavigationModuleId" = v_settings."Id"
    AND    lower(trim("RouteKey")) = 'general-settings'
    AND    "IsDeleted" = false
    LIMIT  1;

    v_gs_order := COALESCE(v_gs_order, 1);

    UPDATE "NavigationMenus"
    SET    "DisplayOrder" = "DisplayOrder" + 1
    WHERE  "NavigationModuleId" = v_settings."Id"
    AND    "DisplayOrder" > v_gs_order;

    UPDATE "NavigationMenus"
    SET    "NavigationModuleId" = v_settings."Id",
           "SequenceNo"         = v_seq,
           "Code"               = v_new_menu,
           "Route"              = '/' || v_settings."RouteKey" || '/application-configuration',
           "DisplayOrder"       = v_gs_order + 1
    WHERE  "Id" = v_menu."Id";

    RAISE NOTICE 'Menu   Application Configuration  % -> %  (Settings, after General Settings)', v_old_menu, v_new_menu;

    -- ---------------------------------------------------------------
    -- Menu references
    -- ---------------------------------------------------------------
    IF to_regclass('public."INF_MenuSynchronization"') IS NOT NULL THEN
        UPDATE "INF_MenuSynchronization"
        SET    "MenuCode" = v_new_menu, "MenuName" = v_menu."Name",
               "ModuleId" = v_settings."Id", "ModuleCode" = v_settings."Code", "ModuleName" = v_settings."Name"
        WHERE  "MenuId" = v_menu."Id";
    END IF;

    IF to_regclass('public."SystemConfigurations"') IS NOT NULL THEN
        UPDATE "SystemConfigurations"
        SET    "NavigationMenuCode" = v_new_menu,
               "NavigationModuleId" = v_settings."Id"
        WHERE  "NavigationMenuCode" = v_old_menu
        AND    COALESCE("NavigationSubmenuCode", '') = '';
    END IF;

    -- ---------------------------------------------------------------
    -- Every page of the menu (deleted ones too) : new code and route
    -- ---------------------------------------------------------------
    FOR v_sub IN
        SELECT "Id", "Code", "SequenceNo", "Name", "RouteKey", "IsDeleted"
        FROM   "NavigationSubmenus"
        WHERE  "NavigationMenuId" = v_menu."Id"
        ORDER  BY "SequenceNo", "Id"
    LOOP
        v_new_sub := 'SUB-' || substr(v_new_menu, 5) || '-' || lpad(v_sub."SequenceNo"::text, 3, '0');

        IF EXISTS (SELECT 1 FROM "NavigationSubmenus" WHERE "Code" = v_new_sub AND "Id" <> v_sub."Id") THEN
            RAISE EXCEPTION 'Page code % is already used. Tell Claude - nothing was changed.', v_new_sub;
        END IF;

        UPDATE "NavigationSubmenus"
        SET    "Code"  = v_new_sub,
               "Route" = '/' || v_settings."RouteKey" || '/application-configuration/' || lower(trim("RouteKey"))
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
                USING v_new_sub, v_settings."Id", v_settings."Code", v_settings."Name",
                      v_menu."Id", v_new_menu, v_menu."Name", v_sub."Id";
            END IF;
        END LOOP;

        IF to_regclass('public."SystemConfigurations"') IS NOT NULL THEN
            UPDATE "SystemConfigurations"
            SET    "NavigationSubmenuCode" = v_new_sub,
                   "NavigationMenuCode"    = v_new_menu,
                   "NavigationModuleId"    = v_settings."Id"
            WHERE  "NavigationSubmenuCode" = v_sub."Code";
        END IF;

        IF to_regclass('public."MasterActivityPages"') IS NOT NULL THEN
            UPDATE "MasterActivityPages"
            SET    "NavigationSubmenuCode" = v_new_sub
            WHERE  "NavigationSubmenuCode" = v_sub."Code";
        END IF;

        IF NOT v_sub."IsDeleted" THEN
            RAISE NOTICE 'Page   %  % -> %', rpad(v_sub."Name", 24), v_sub."Code", v_new_sub;
        END IF;
    END LOOP;

    -- ---------------------------------------------------------------
    -- Permissions : the rows of this menu now belong to Settings
    -- ---------------------------------------------------------------
    n := 0;

    FOREACH t IN ARRAY ARRAY['ActivityAssignmentDetails', 'SpecialAssignmentDetails']
    LOOP
        IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
            EXECUTE format(
                'UPDATE public.%I SET "ModuleId" = $1 WHERE "MenuId" = $2', t)
            USING v_settings."Id", v_menu."Id";
        END IF;
    END LOOP;

    IF to_regclass('public."ActivityAssignmentDetails"') IS NOT NULL THEN
        SELECT count(*) INTO n FROM "ActivityAssignmentDetails" WHERE "MenuId" = v_menu."Id";
    END IF;

    RAISE NOTICE '% permission row(s) follow the pages.', n;
    RAISE NOTICE 'Done. Check the lines above, then run COMMIT; (or ROLLBACK;). Log in again to see the new menu.';
END $$;


-- Run one of these by hand :
-- COMMIT;
-- ROLLBACK;


-- ---------------------------------------------------------------------
-- Check (after COMMIT, run on its own)
-- ---------------------------------------------------------------------
-- SELECT m."DisplayOrder", m."Code" AS "Menu code", m."Name" AS "Menu", m."Route",
--        s."Code" AS "Page code", s."Name" AS "Page", s."Route" AS "Page route"
-- FROM   "NavigationMenus" m
-- JOIN   "NavigationModules" d ON d."Id" = m."NavigationModuleId"
-- LEFT   JOIN "NavigationSubmenus" s ON s."NavigationMenuId" = m."Id" AND s."IsDeleted" = false
-- WHERE  lower(d."RouteKey") = 'settings' AND m."IsDeleted" = false
-- ORDER  BY m."DisplayOrder", s."DisplayOrder";
