ROLLBACK;

-- =====================================================================
-- BikeAccessorySchemes_To_ProductSetup.sql   (2026-11-20)
-- ---------------------------------------------------------------------
-- Blueprint : claude\blueprint-module-isolation.md (decision D4)
--
--   Sales Operations > Sales Setup > Bike Accessory Schemes
--   moves to
--   Inventory Management > Product Setup > Bike Accessory Schemes
--
-- Why : motor bike purchases build their accessory dues from these
-- schemes. Sales Operations can be switched off for a company;
-- Inventory Management cannot. The page must stay reachable.
--
-- The page keeps its Id, name and route key. Its menu, number, code
-- and route change, and every table that keeps those follows
-- (INF_SubmenuSynchronization, CodeSynchronizations,
-- SystemConfigurations, MasterActivityPages,
-- ActivityAssignmentDetails, SpecialAssignmentDetails), so the
-- permissions ticked for the page stay. Favourites follow by
-- themselves (they keep the page Id). It becomes the last page of
-- Product Setup.
--
-- Page files and API addresses are NOT moved; the old address opens
-- the new one (code change, same day).
--
-- BEFORE : ProductSettings_To_ProductSetup.sql must have been run on
-- this database.
--
-- Run on EACH database that has the ERP navigation :
--     AppCoreERP_Studio, AppCoreTpl_TW, AppCore_TW_DEMO
-- Query Tool on that database, the whole file (F5). Read the Messages
-- tab, then run COMMIT; (or ROLLBACK;). Restart the API with the new
-- code and log in again.
-- Safe to run again ("already moved").
-- Do NOT run Module / Menu / Submenu / Code Sync for this page.
-- ASCII only.
-- =====================================================================

BEGIN;

DO $$
DECLARE
    v_target    record;   -- module Inventory Management
    v_menu      record;   -- menu Product Setup (target)
    v_sub       record;   -- the page
    v_seq       int;
    v_order     int;
    v_new_sub   text;
    t           text;
    n           bigint := 0;
BEGIN
    SELECT "Id", "Code", "Name", "RouteKey" INTO v_target
    FROM   "NavigationModules"
    WHERE  lower(trim("RouteKey")) = 'inventory-management' AND "IsDeleted" = false
    ORDER  BY "Id" LIMIT 1;

    IF v_target."Id" IS NULL THEN
        RAISE EXCEPTION 'Module Inventory Management (route key inventory-management) not found - nothing was changed.';
    END IF;

    SELECT "Id", "Code", "Name", "RouteKey" INTO v_menu
    FROM   "NavigationMenus"
    WHERE  "NavigationModuleId" = v_target."Id"
    AND    lower(trim("RouteKey")) = 'product-setup'
    AND    "IsDeleted" = false
    ORDER  BY "Id" LIMIT 1;

    IF v_menu."Id" IS NULL THEN
        RAISE EXCEPTION 'Menu Product Setup not found under Inventory Management. Run ProductSettings_To_ProductSetup.sql first - nothing was changed.';
    END IF;

    -- already there ?
    IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
               WHERE "NavigationMenuId" = v_menu."Id"
               AND   lower(trim("RouteKey")) = 'bike-accessory-schemes') THEN
        RAISE NOTICE 'Bike Accessory Schemes is already under Product Setup (%). Nothing to do : run ROLLBACK; or COMMIT;', v_menu."Code";
        RETURN;
    END IF;

    -- the page, wherever it is today
    SELECT "Id", "Code", "Name", "RouteKey", "NavigationMenuId" INTO v_sub
    FROM   "NavigationSubmenus"
    WHERE  lower(trim("RouteKey")) = 'bike-accessory-schemes'
    ORDER  BY "IsDeleted", "Id"
    LIMIT  1;

    IF v_sub."Id" IS NULL THEN
        RAISE EXCEPTION 'Page Bike Accessory Schemes (route key bike-accessory-schemes) not found - nothing was changed.';
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
           "Route"            = '/' || v_target."RouteKey" || '/' || v_menu."RouteKey" || '/bike-accessory-schemes',
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

    IF to_regclass('public."ActivityAssignmentDetails"') IS NOT NULL THEN
        SELECT count(*) INTO n FROM "ActivityAssignmentDetails" WHERE "SubMenuId" = v_sub."Id";
    END IF;

    RAISE NOTICE 'Page   %  % -> %  (% %)', v_sub."Name", v_sub."Code", v_new_sub, v_menu."Code", v_menu."Name";
    RAISE NOTICE '% permission row(s) follow the page.', n;
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
-- WHERE  lower(m."RouteKey") = 'product-setup' AND s."IsDeleted" = false
-- ORDER  BY s."DisplayOrder";
