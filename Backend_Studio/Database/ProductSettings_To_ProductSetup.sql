ROLLBACK;

-- =====================================================================
-- ProductSettings_To_ProductSetup.sql   (2026-11-20)
-- ---------------------------------------------------------------------
-- Blueprint : claude\blueprint-module-setup-rearrangement.md (step 4)
--
--   Settings > Product Settings   (the menu with all its pages)
--   moves to
--   Inventory Management > Product Setup   (first menu, before Store
--   Setup)
--
-- The menu keeps its Id; its module, code, name (Product Setup), route
-- key (product-setup), route and order change, and so do its pages'
-- codes and routes. Every table that keeps those codes / module / menu
-- follows (INF_MenuSynchronization, INF_SubmenuSynchronization,
-- CodeSynchronizations, SystemConfigurations, MasterActivityPages,
-- ActivityAssignmentDetails, SpecialAssignmentDetails), so the
-- permissions ticked for the pages and their switches stay.
-- Favourites follow by themselves (they keep the page Id).
--
-- Page files and API addresses are NOT moved; the old page addresses
-- open the new ones (code change, same day).
--
-- Run on EACH database that has the ERP navigation :
--     AppCoreERP_Studio, AppCoreTpl_TW, AppCore_TW_DEMO
-- Query Tool on that database, the whole file (F5). Read the Messages
-- tab, then run COMMIT; (or ROLLBACK;). Restart the API with the new
-- code and log in again.
-- Safe to run again ("already under Inventory Management").
-- Do NOT run Module / Menu / Submenu / Code Sync for this menu.
-- ASCII only.
-- =====================================================================

BEGIN;

DO $$
DECLARE
    v_target    record;   -- module Inventory Management
    v_menu      record;   -- the menu
    v_seq       int;
    v_order     int;
    v_new_menu  text;
    v_old_menu  text;
    v_sub       record;
    v_new_sub   text;
    v_pages     int := 0;
    t           text;
    n           bigint := 0;
BEGIN
    -- ---------------------------------------------------------------
    -- Target module (never created here)
    -- ---------------------------------------------------------------
    SELECT "Id", "Code", "Name", "RouteKey", "SequenceNo" INTO v_target
    FROM   "NavigationModules"
    WHERE  lower(trim("RouteKey")) = 'inventory-management' AND "IsDeleted" = false
    ORDER  BY "Id" LIMIT 1;

    IF v_target."Id" IS NULL THEN
        RAISE EXCEPTION 'Module Inventory Management (route key inventory-management) not found - nothing was changed.';
    END IF;

    -- ---------------------------------------------------------------
    -- Already moved = nothing to do
    -- ---------------------------------------------------------------
    SELECT "Id", "Code" INTO v_menu
    FROM   "NavigationMenus"
    WHERE  "NavigationModuleId" = v_target."Id"
    AND    lower(trim("RouteKey")) = 'product-setup'
    ORDER  BY "Id" LIMIT 1;

    IF v_menu."Id" IS NOT NULL THEN
        RAISE NOTICE 'Product Setup is already under Inventory Management (%). Nothing to do : run ROLLBACK; or COMMIT;', v_menu."Code";
        RETURN;
    END IF;

    -- ---------------------------------------------------------------
    -- The menu Product Settings
    -- ---------------------------------------------------------------
    SELECT "Id", "Code", "Name", "NavigationModuleId" INTO v_menu
    FROM   "NavigationMenus"
    WHERE  lower(trim("RouteKey")) = 'product-settings' AND "IsDeleted" = false
    ORDER  BY "Id" LIMIT 1;

    IF v_menu."Id" IS NULL THEN
        RAISE EXCEPTION 'Menu Product Settings (route key product-settings) not found - nothing was changed.';
    END IF;

    IF EXISTS (SELECT 1 FROM "NavigationMenus"
               WHERE "NavigationModuleId" = v_target."Id"
               AND   lower(trim("Name")) = 'product setup') THEN
        RAISE EXCEPTION 'Inventory Management already has a menu named Product Setup. Tell Claude - nothing was changed.';
    END IF;

    v_old_menu := v_menu."Code";

    -- ---------------------------------------------------------------
    -- New menu number and code under Inventory Management (deleted
    -- menus counted, numbers are never reused); first in the module
    -- ---------------------------------------------------------------
    SELECT COALESCE(MAX("SequenceNo"), 0) + 1 INTO v_seq
    FROM   "NavigationMenus"
    WHERE  "NavigationModuleId" = v_target."Id";

    SELECT COALESCE(MIN("DisplayOrder"), 1) - 1 INTO v_order
    FROM   "NavigationMenus"
    WHERE  "NavigationModuleId" = v_target."Id";

    v_new_menu := 'MNU-' || lpad(v_target."SequenceNo"::text, 3, '0') || '-' || lpad(v_seq::text, 3, '0');

    IF EXISTS (SELECT 1 FROM "NavigationMenus" WHERE "Code" = v_new_menu AND "Id" <> v_menu."Id") THEN
        RAISE EXCEPTION 'Menu code % is already used. Tell Claude - nothing was changed.', v_new_menu;
    END IF;

    UPDATE "NavigationMenus"
    SET    "NavigationModuleId" = v_target."Id",
           "SequenceNo"         = v_seq,
           "Code"               = v_new_menu,
           "Name"               = 'Product Setup',
           "RouteKey"           = 'product-setup',
           "Route"              = '/' || v_target."RouteKey" || '/product-setup',
           "DisplayOrder"       = v_order
    WHERE  "Id" = v_menu."Id";

    RAISE NOTICE 'Menu   Product Settings  % -> %  Product Setup (Inventory Management, first)', v_old_menu, v_new_menu;

    -- ---------------------------------------------------------------
    -- Menu references
    -- ---------------------------------------------------------------
    IF to_regclass('public."INF_MenuSynchronization"') IS NOT NULL THEN
        UPDATE "INF_MenuSynchronization"
        SET    "MenuCode" = v_new_menu, "MenuName" = 'Product Setup',
               "ModuleId" = v_target."Id", "ModuleCode" = v_target."Code", "ModuleName" = v_target."Name"
        WHERE  "MenuId" = v_menu."Id";
    END IF;

    IF to_regclass('public."SystemConfigurations"') IS NOT NULL THEN
        UPDATE "SystemConfigurations"
        SET    "NavigationMenuCode" = v_new_menu,
               "NavigationModuleId" = v_target."Id"
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
               "Route" = '/' || v_target."RouteKey" || '/product-setup/' || lower(trim("RouteKey"))
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
                      v_menu."Id", v_new_menu, 'Product Setup'::text, v_sub."Id";
            END IF;
        END LOOP;

        IF to_regclass('public."SystemConfigurations"') IS NOT NULL THEN
            UPDATE "SystemConfigurations"
            SET    "NavigationSubmenuCode" = v_new_sub,
                   "NavigationMenuCode"    = v_new_menu,
                   "NavigationModuleId"    = v_target."Id"
            WHERE  "NavigationSubmenuCode" = v_sub."Code";
        END IF;

        IF to_regclass('public."MasterActivityPages"') IS NOT NULL THEN
            UPDATE "MasterActivityPages"
            SET    "NavigationSubmenuCode" = v_new_sub
            WHERE  "NavigationSubmenuCode" = v_sub."Code";
        END IF;

        IF NOT v_sub."IsDeleted" THEN
            v_pages := v_pages + 1;
            RAISE NOTICE 'Page   %  % -> %', rpad(v_sub."Name", 30), v_sub."Code", v_new_sub;
        END IF;
    END LOOP;

    -- ---------------------------------------------------------------
    -- Permissions : the rows of this menu now belong to Inventory
    -- Management
    -- ---------------------------------------------------------------
    FOREACH t IN ARRAY ARRAY['ActivityAssignmentDetails', 'SpecialAssignmentDetails']
    LOOP
        IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
            EXECUTE format(
                'UPDATE public.%I SET "ModuleId" = $1 WHERE "MenuId" = $2', t)
            USING v_target."Id", v_menu."Id";
        END IF;
    END LOOP;

    IF to_regclass('public."ActivityAssignmentDetails"') IS NOT NULL THEN
        SELECT count(*) INTO n FROM "ActivityAssignmentDetails" WHERE "MenuId" = v_menu."Id";
    END IF;

    RAISE NOTICE '% page(s) moved with the menu ; % permission row(s) follow the pages.', v_pages, n;
    RAISE NOTICE 'Done. Check the lines above, then run COMMIT; (or ROLLBACK;). Log in again to see the menu.';
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
-- WHERE  lower(d."RouteKey") = 'inventory-management' AND m."IsDeleted" = false
-- ORDER  BY m."DisplayOrder", s."DisplayOrder";
