ROLLBACK;

-- =====================================================================
-- AccountSettings_To_AccountsSetup.sql   (2026-11-20)
-- ---------------------------------------------------------------------
-- Blueprint : claude\blueprint-module-setup-rearrangement.md (step 3)
--
--   Settings > Account Settings   (all its pages)
--   moves to
--   Accounts & Finance > Accounts Setup
--
-- Accounts Setup already exists (ModuleConfiguration_Navigation.sql
-- made it, with the page Accounts Configuration), so the PAGES move
-- into it and the emptied menu Account Settings is marked deleted.
--
-- Every page keeps its Id, name and route key. Its menu, number, code
-- and route change. Every table that keeps those follows
-- (INF_SubmenuSynchronization, CodeSynchronizations,
-- SystemConfigurations, MasterActivityPages,
-- ActivityAssignmentDetails, SpecialAssignmentDetails), so the
-- permissions ticked for the pages and their switches stay.
-- Favourites follow by themselves (they keep the page Id).
-- Accounts Configuration stays the last page of the menu.
--
-- Page files and API addresses are NOT moved; the old page addresses
-- open the new ones (code change, same day).
--
-- BEFORE : ModuleConfiguration_Navigation.sql must have been run on
-- this database.
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
    v_target    record;   -- module Accounts & Finance
    v_menu      record;   -- menu Accounts Setup (target)
    v_old       record;   -- menu Account Settings (source)
    v_sub       record;
    v_seq       int;
    v_order     int := 0;
    v_new_sub   text;
    v_pages     int := 0;
    v_before    bigint[];
    t           text;
    n           bigint := 0;
BEGIN
    -- ---------------------------------------------------------------
    -- Target : Accounts & Finance > Accounts Setup (never created here)
    -- ---------------------------------------------------------------
    SELECT "Id", "Code", "Name", "RouteKey" INTO v_target
    FROM   "NavigationModules"
    WHERE  lower(trim("RouteKey")) = 'accounts-finance' AND "IsDeleted" = false
    ORDER  BY "Id" LIMIT 1;

    IF v_target."Id" IS NULL THEN
        RAISE EXCEPTION 'Module Accounts & Finance (route key accounts-finance) not found - nothing was changed.';
    END IF;

    SELECT "Id", "Code", "Name", "RouteKey" INTO v_menu
    FROM   "NavigationMenus"
    WHERE  "NavigationModuleId" = v_target."Id"
    AND    lower(trim("RouteKey")) = 'accounts-setup'
    AND    "IsDeleted" = false
    ORDER  BY "Id" LIMIT 1;

    IF v_menu."Id" IS NULL THEN
        RAISE EXCEPTION 'Menu Accounts Setup not found under Accounts & Finance. Run ModuleConfiguration_Navigation.sql first - nothing was changed.';
    END IF;

    -- ---------------------------------------------------------------
    -- Source : the menu Account Settings, wherever it is
    -- ---------------------------------------------------------------
    SELECT "Id", "Code", "Name", "IsDeleted" INTO v_old
    FROM   "NavigationMenus"
    WHERE  lower(trim("RouteKey")) = 'account-settings'
    ORDER  BY "IsDeleted", "Id"
    LIMIT  1;

    IF v_old."Id" IS NULL
       OR NOT EXISTS (SELECT 1 FROM "NavigationSubmenus" WHERE "NavigationMenuId" = v_old."Id") THEN
        RAISE NOTICE 'Account Settings is already moved to Accounts Setup (%). Nothing to do : run ROLLBACK; or COMMIT;', v_menu."Code";
        RETURN;
    END IF;

    -- ---------------------------------------------------------------
    -- Every page of Account Settings (deleted ones too), in the order
    -- they show today : new menu, number, code, route and order
    -- ---------------------------------------------------------------
    SELECT COALESCE(MAX("SequenceNo"), 0) INTO v_seq
    FROM   "NavigationSubmenus"
    WHERE  "NavigationMenuId" = v_menu."Id";

    -- the pages Accounts Setup has now (Accounts Configuration)
    SELECT COALESCE(array_agg("Id" ORDER BY "DisplayOrder", "Id"), '{}') INTO v_before
    FROM   "NavigationSubmenus"
    WHERE  "NavigationMenuId" = v_menu."Id";

    FOR v_sub IN
        SELECT "Id", "Code", "Name", "RouteKey", "IsDeleted"
        FROM   "NavigationSubmenus"
        WHERE  "NavigationMenuId" = v_old."Id"
        ORDER  BY "IsDeleted", "DisplayOrder", "SequenceNo", "Id"
    LOOP
        IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
                   WHERE "NavigationMenuId" = v_menu."Id"
                   AND   lower(trim("RouteKey")) = lower(trim(v_sub."RouteKey"))) THEN
            RAISE EXCEPTION 'Accounts Setup already has a page with route key %. Tell Claude - nothing was changed.', v_sub."RouteKey";
        END IF;

        v_seq   := v_seq + 1;
        v_order := v_order + 1;

        v_new_sub := 'SUB-' || substr(v_menu."Code", 5) || '-' || lpad(v_seq::text, 3, '0');

        IF EXISTS (SELECT 1 FROM "NavigationSubmenus" WHERE "Code" = v_new_sub AND "Id" <> v_sub."Id") THEN
            RAISE EXCEPTION 'Page code % is already used. Tell Claude - nothing was changed.', v_new_sub;
        END IF;

        UPDATE "NavigationSubmenus"
        SET    "NavigationMenuId" = v_menu."Id",
               "SequenceNo"       = v_seq,
               "Code"             = v_new_sub,
               "Route"            = '/' || v_target."RouteKey" || '/' || v_menu."RouteKey" || '/' || lower(trim("RouteKey")),
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

        IF NOT v_sub."IsDeleted" THEN
            v_pages := v_pages + 1;
            RAISE NOTICE 'Page   %  % -> %', rpad(v_sub."Name", 28), v_sub."Code", v_new_sub;
        END IF;
    END LOOP;

    -- ---------------------------------------------------------------
    -- The pages Accounts Setup had before (Accounts Configuration)
    -- go after the moved ones
    -- ---------------------------------------------------------------
    UPDATE "NavigationSubmenus"
    SET    "DisplayOrder" = v_order + array_position(v_before, "Id")
    WHERE  "Id" = ANY (v_before);

    -- ---------------------------------------------------------------
    -- Switches set on the old menu itself (not on a page)
    -- ---------------------------------------------------------------
    IF to_regclass('public."SystemConfigurations"') IS NOT NULL THEN
        UPDATE "SystemConfigurations"
        SET    "NavigationMenuCode" = v_menu."Code",
               "NavigationModuleId" = v_target."Id"
        WHERE  "NavigationMenuCode" = v_old."Code"
        AND    COALESCE("NavigationSubmenuCode", '') = '';
    END IF;

    -- ---------------------------------------------------------------
    -- Permissions : the rows of the old menu now belong to Accounts
    -- & Finance > Accounts Setup
    -- ---------------------------------------------------------------
    FOREACH t IN ARRAY ARRAY['ActivityAssignmentDetails', 'SpecialAssignmentDetails']
    LOOP
        IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
            EXECUTE format(
                'UPDATE public.%I SET "ModuleId" = $1, "MenuId" = $2 WHERE "MenuId" = $3', t)
            USING v_target."Id", v_menu."Id", v_old."Id";
        END IF;
    END LOOP;

    IF to_regclass('public."ActivityAssignmentDetails"') IS NOT NULL THEN
        SELECT count(*) INTO n FROM "ActivityAssignmentDetails" WHERE "MenuId" = v_menu."Id";
    END IF;

    -- ---------------------------------------------------------------
    -- The emptied menu Account Settings leaves the sidebar
    -- ---------------------------------------------------------------
    UPDATE "NavigationMenus"
    SET    "IsDeleted" = true, "IsActive" = false, "DeletedDate" = now()
    WHERE  "Id" = v_old."Id";

    RAISE NOTICE '% page(s) moved to % % ; menu Account Settings (%) marked deleted.', v_pages, v_menu."Code", v_menu."Name", v_old."Code";
    RAISE NOTICE '% permission row(s) now under Accounts Setup.', n;
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
-- WHERE  lower(m."RouteKey") = 'accounts-setup' AND s."IsDeleted" = false
-- ORDER  BY s."DisplayOrder";
