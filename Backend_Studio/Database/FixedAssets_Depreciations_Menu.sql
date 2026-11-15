ROLLBACK;

-- =====================================================================
-- FixedAssets_Depreciations_Menu.sql   (2026-11-15)
-- ---------------------------------------------------------------------
-- Fixed Assets Management : the depreciation pages under ONE menu,
-- and the month-end charge.
--
--   Asset Setup                        Asset Setup
--     Asset Groups                       Asset Groups
--     Depreciation of Fixed Assets  ->   Asset Locations
--     Asset Locations                    Asset Configuration
--     Asset Configuration
--   Depreciation                  ->   Depreciations
--     Depreciation Runs                  Depreciation Setup   (moved,
--     Depreciation Schedule                  was Depreciation of
--                                            Fixed Assets)
--                                        Charge Depreciation  (was
--                                            Depreciation Runs)
--                                        Depreciation Schedule
--
--   New routes :
--     /fixed-assets-management/depreciation/depreciation-setup
--     /fixed-assets-management/depreciation/charge-depreciation
--   (the old addresses still open the pages)
--
--   The moved page follows the same steps as moving a page on
--   Navigation Management : its code follows the new menu, and the
--   tables that keep the code / menu follow too, so the permissions
--   ticked for it stay.
--
--   Columns for "Charge Depreciation on Month End" (Asset
--   Configuration switch, OFF until you turn it on) :
--     FaConfiguration."AutoChargeMonthEnd", "AutoLastCheck",
--                     "AutoLastMessage"
--     FaDepreciationRuns."IsAuto"
--
-- Run AFTER FixedAssets_Navigation.sql and FixedAssets_Engine.sql.
-- Safe to run again. Run the whole script (F5) on AppCoreERP_Studio,
-- then log in again to see the menu change. ASCII only.
-- =====================================================================


-- ------------------------------------------------------------
-- 1. Columns (month-end charge)
-- ------------------------------------------------------------

ALTER TABLE public."FaConfiguration"
    ADD COLUMN IF NOT EXISTS "AutoChargeMonthEnd" boolean                  NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "AutoLastCheck"      timestamp with time zone NULL,
    ADD COLUMN IF NOT EXISTS "AutoLastMessage"    character varying(1000)  NOT NULL DEFAULT '';

ALTER TABLE public."FaDepreciationRuns"
    ADD COLUMN IF NOT EXISTS "IsAuto" boolean NOT NULL DEFAULT false;


-- ------------------------------------------------------------
-- 2. Navigation
-- ------------------------------------------------------------

DO $$
DECLARE
    v_module  record;
    v_setup   record;
    v_menu    record;
    v_sub     record;
    v_seq     int;
    v_prefix  text;
    v_old     text;
    v_new     text;
BEGIN
    SELECT "Id", "SequenceNo", "RouteKey", "Code", "Name" INTO v_module
    FROM   "NavigationModules"
    WHERE  lower(trim("RouteKey")) = 'fixed-assets-management'
    AND    "IsDeleted" = false
    LIMIT  1;

    IF v_module."Id" IS NULL THEN
        RAISE EXCEPTION 'Module with route key fixed-assets-management not found - nothing was changed.';
    END IF;

    SELECT "Id", "SequenceNo", "RouteKey", "Code", "Name" INTO v_menu
    FROM   "NavigationMenus"
    WHERE  "NavigationModuleId" = v_module."Id"
    AND    lower(trim("RouteKey")) = 'depreciation'
    AND    "IsDeleted" = false
    LIMIT  1;

    IF v_menu."Id" IS NULL THEN
        RAISE EXCEPTION 'Menu Depreciation (route key depreciation) not found : run FixedAssets_Navigation.sql first.';
    END IF;

    SELECT "Id", "RouteKey" INTO v_setup
    FROM   "NavigationMenus"
    WHERE  "NavigationModuleId" = v_module."Id"
    AND    lower(trim("RouteKey")) = 'asset-setup'
    AND    "IsDeleted" = false
    LIMIT  1;

    -- the names must be free elsewhere
    IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
               WHERE  lower(trim("Name")) = 'depreciation setup'
               AND    "IsDeleted" = false
               AND    lower(trim("RouteKey")) NOT IN ('depreciation-setup', 'depreciation-of-fixed-assets')) THEN
        RAISE EXCEPTION 'A page named "Depreciation Setup" already exists elsewhere : names must be unique. Tell Claude - nothing changed.';
    END IF;

    IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
               WHERE  lower(trim("Name")) = 'charge depreciation'
               AND    "IsDeleted" = false
               AND    lower(trim("RouteKey")) NOT IN ('charge-depreciation', 'depreciation-runs')) THEN
        RAISE EXCEPTION 'A page named "Charge Depreciation" already exists elsewhere : names must be unique. Tell Claude - nothing changed.';
    END IF;

    -- ---------- the menu ----------
    UPDATE "NavigationMenus"
    SET    "Name"    = 'Depreciations',
           "Remarks" = 'The depreciation of the asset groups, the monthly charge and the schedule of an asset.'
    WHERE  "Id" = v_menu."Id";

    RAISE NOTICE 'Menu % is now Depreciations', v_menu."Code";

    -- ---------- Depreciation Setup (moved from Asset Setup) ----------
    v_prefix := 'SUB-' || substr(v_menu."Code", 5) || '-';

    SELECT s."Id", s."NavigationMenuId", s."Code", s."SequenceNo" INTO v_sub
    FROM   "NavigationSubmenus" s
    JOIN   "NavigationMenus" m ON m."Id" = s."NavigationMenuId"
    WHERE  m."NavigationModuleId" = v_module."Id"
    AND    lower(trim(s."RouteKey")) IN ('depreciation-of-fixed-assets', 'depreciation-setup')
    AND    s."IsDeleted" = false
    ORDER  BY s."Id"
    LIMIT  1;

    IF v_sub."Id" IS NULL THEN
        -- not made yet : made under Depreciations
        SELECT COALESCE(MAX("SequenceNo"), 0) + 1 INTO v_seq
        FROM   "NavigationSubmenus"
        WHERE  "NavigationMenuId" = v_menu."Id";

        INSERT INTO "NavigationSubmenus"
            ("NavigationMenuId", "SequenceNo", "Code", "Name", "Icon",
             "RouteKey", "Route", "DisplayOrder", "Remarks",
             "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        VALUES
            (v_menu."Id", v_seq, v_prefix || lpad(v_seq::text, 3, '0'),
             'Depreciation Setup', 'fa-solid fa-percent',
             'depreciation-setup',
             '/' || v_module."RouteKey" || '/' || v_menu."RouteKey" || '/depreciation-setup',
             1, 'The depreciation of each asset group : method, rate or life, residual value and the expense ledger. Hand-written page : never run Submenu / Code Sync.',
             true, false, 1, now());

        RAISE NOTICE 'Page created under Depreciations : Depreciation Setup';
    ELSE
        v_old := v_sub."Code";

        IF v_sub."NavigationMenuId" = v_menu."Id" THEN
            v_new := v_old;
            v_seq := v_sub."SequenceNo";
        ELSE
            -- the next number inside Depreciations (deleted pages
            -- counted : numbers are never reused)
            SELECT COALESCE(MAX("SequenceNo"), 0) + 1 INTO v_seq
            FROM   "NavigationSubmenus"
            WHERE  "NavigationMenuId" = v_menu."Id";

            v_new := v_prefix || lpad(v_seq::text, 3, '0');

            IF EXISTS (SELECT 1 FROM "NavigationSubmenus" WHERE "Code" = v_new AND "Id" <> v_sub."Id") THEN
                RAISE EXCEPTION 'Code % is already used by another submenu. Tell Claude - nothing changed.', v_new;
            END IF;
        END IF;

        UPDATE "NavigationSubmenus"
        SET    "NavigationMenuId" = v_menu."Id",
               "SequenceNo"       = v_seq,
               "Code"             = v_new,
               "Name"             = 'Depreciation Setup',
               "RouteKey"         = 'depreciation-setup',
               "Route"            = '/' || v_module."RouteKey" || '/' || v_menu."RouteKey" || '/depreciation-setup',
               "Remarks"          = 'The depreciation of each asset group : method, rate or life, residual value and the expense ledger. Hand-written page : never run Submenu / Code Sync.'
        WHERE  "Id" = v_sub."Id";

        -- every table that keeps the page's code / menu follows
        IF v_old <> v_new THEN
            IF to_regclass('public."MasterActivityPages"') IS NOT NULL THEN
                UPDATE "MasterActivityPages"
                SET    "NavigationSubmenuCode" = v_new
                WHERE  "NavigationSubmenuCode" = v_old;
            END IF;

            IF to_regclass('public."SystemConfigurations"') IS NOT NULL THEN
                UPDATE "SystemConfigurations"
                SET    "NavigationSubmenuCode" = v_new,
                       "NavigationMenuCode"    = v_menu."Code",
                       "NavigationModuleId"    = v_module."Id"
                WHERE  "NavigationSubmenuCode" = v_old;
            END IF;
        END IF;

        IF to_regclass('public."INF_SubmenuSynchronization"') IS NOT NULL THEN
            UPDATE "INF_SubmenuSynchronization"
            SET    "SubmenuCode" = v_new,
                   "ModuleId" = v_module."Id", "ModuleCode" = v_module."Code", "ModuleName" = v_module."Name",
                   "MenuId" = v_menu."Id", "MenuCode" = v_menu."Code", "MenuName" = 'Depreciations'
            WHERE  "SubmenuId" = v_sub."Id";
        END IF;

        IF to_regclass('public."CodeSynchronizations"') IS NOT NULL THEN
            UPDATE "CodeSynchronizations"
            SET    "SubmenuCode" = v_new,
                   "ModuleId" = v_module."Id", "ModuleCode" = v_module."Code", "ModuleName" = v_module."Name",
                   "MenuId" = v_menu."Id", "MenuCode" = v_menu."Code", "MenuName" = 'Depreciations'
            WHERE  "SubmenuId" = v_sub."Id";
        END IF;

        -- the permissions of the page : they remember its menu, and
        -- the sidebar files the page under that menu
        IF to_regclass('public."ActivityAssignmentDetails"') IS NOT NULL THEN
            UPDATE "ActivityAssignmentDetails"
            SET    "ModuleId" = v_module."Id", "MenuId" = v_menu."Id"
            WHERE  "SubMenuId" = v_sub."Id";
        END IF;

        IF to_regclass('public."SpecialAssignmentDetails"') IS NOT NULL THEN
            UPDATE "SpecialAssignmentDetails"
            SET    "ModuleId" = v_module."Id", "MenuId" = v_menu."Id"
            WHERE  "SubMenuId" = v_sub."Id";
        END IF;

        RAISE NOTICE 'Depreciation Setup is under Depreciations : code % (was %), permissions follow.', v_new, v_old;
    END IF;

    -- ---------- Charge Depreciation (was Depreciation Runs) ----------
    UPDATE "NavigationSubmenus"
    SET    "Name"     = 'Charge Depreciation',
           "RouteKey" = 'charge-depreciation',
           "Route"    = '/' || v_module."RouteKey" || '/' || v_menu."RouteKey" || '/charge-depreciation',
           "Remarks"  = 'The depreciation of a month for a branch : preview, post, undo the last one; charged automatically on month end when Asset Configuration says so. Hand-written page : never run Submenu / Code Sync.'
    WHERE  "NavigationMenuId" = v_menu."Id"
    AND    lower(trim("RouteKey")) IN ('depreciation-runs', 'charge-depreciation')
    AND    "IsDeleted" = false;

    IF FOUND THEN
        RAISE NOTICE 'Depreciation Runs is now Charge Depreciation';
    ELSE
        RAISE NOTICE 'Depreciation Runs not found : run FixedAssets_Navigation.sql, then this script again.';
    END IF;

    -- ---------- the order ----------
    UPDATE "NavigationSubmenus" n
    SET    "DisplayOrder" = o.ord
    FROM   (VALUES ('depreciation-setup', 1), ('charge-depreciation', 2), ('depreciation-schedule', 3)) AS o (route_key, ord)
    WHERE  n."NavigationMenuId" = v_menu."Id"
    AND    lower(trim(n."RouteKey")) = o.route_key
    AND    n."IsDeleted" = false;

    IF v_setup."Id" IS NOT NULL THEN
        UPDATE "NavigationSubmenus" n
        SET    "DisplayOrder" = o.ord
        FROM   (VALUES ('asset-groups', 1), ('asset-locations', 2), ('asset-configuration', 3)) AS o (route_key, ord)
        WHERE  n."NavigationMenuId" = v_setup."Id"
        AND    lower(trim(n."RouteKey")) = o.route_key
        AND    n."IsDeleted" = false;
    END IF;
END $$;


-- ------------------------------------------------------------
-- Check (run on its own)
-- ------------------------------------------------------------

SELECT m."Name" AS "Menu", s."Code", s."Name" AS "Page", s."Route", s."DisplayOrder"
FROM   "NavigationSubmenus" s
JOIN   "NavigationMenus" m ON m."Id" = s."NavigationMenuId"
JOIN   "NavigationModules" d ON d."Id" = m."NavigationModuleId"
WHERE  lower(trim(d."RouteKey")) = 'fixed-assets-management'
AND    lower(trim(m."RouteKey")) IN ('asset-setup', 'depreciation')
AND    s."IsDeleted" = false
AND    m."IsDeleted" = false
ORDER  BY m."DisplayOrder", s."DisplayOrder";
