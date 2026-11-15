ROLLBACK;

-- =====================================================================
-- FixedAssets_AssetControl_Menu.sql   (2026-11-15)
-- ---------------------------------------------------------------------
-- Fixed Assets Management :
--
--   Asset Register  ->  Asset Control   (route key stays asset-register)
--     Asset Acquisitions
--     Fixed Asset Register
--     Opening Assets
--     Asset Verification        moved here from Asset Reports (it is
--                               a working page, not a report)
--   Asset Reports
--     Fixed Asset Schedule
--     Asset Tags
--
--   New route : /fixed-assets-management/asset-register/asset-verification
--   (the old address still opens the page)
--
--   The moved page follows the same steps as moving a page on
--   Navigation Management : its code follows the new menu, and the
--   tables that keep the code / menu follow too, so the permissions
--   ticked for it stay.
--
-- Safe to run again. Run the whole script (F5) on AppCoreERP_Studio,
-- then log in again to see the menu change. ASCII only.
-- =====================================================================

DO $$
DECLARE
    v_module  record;
    v_menu    record;
    v_reports record;
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
    AND    lower(trim("RouteKey")) = 'asset-register'
    AND    "IsDeleted" = false
    LIMIT  1;

    IF v_menu."Id" IS NULL THEN
        RAISE EXCEPTION 'Menu Asset Register (route key asset-register) not found : run FixedAssets_Navigation.sql first.';
    END IF;

    SELECT "Id" INTO v_reports
    FROM   "NavigationMenus"
    WHERE  "NavigationModuleId" = v_module."Id"
    AND    lower(trim("RouteKey")) = 'asset-reports'
    AND    "IsDeleted" = false
    LIMIT  1;

    -- ---------- the menu ----------
    UPDATE "NavigationMenus"
    SET    "Name"    = 'Asset Control',
           "Remarks" = 'Buying assets, the asset cards, the opening assets and the physical count.'
    WHERE  "Id" = v_menu."Id";

    RAISE NOTICE 'Menu % is now Asset Control', v_menu."Code";

    -- ---------- Asset Verification ----------
    v_prefix := 'SUB-' || substr(v_menu."Code", 5) || '-';

    SELECT s."Id", s."NavigationMenuId", s."Code", s."SequenceNo" INTO v_sub
    FROM   "NavigationSubmenus" s
    JOIN   "NavigationMenus" m ON m."Id" = s."NavigationMenuId"
    WHERE  m."NavigationModuleId" = v_module."Id"
    AND    lower(trim(s."RouteKey")) = 'asset-verification'
    AND    s."IsDeleted" = false
    ORDER  BY s."Id"
    LIMIT  1;

    IF v_sub."Id" IS NULL THEN
        IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
                   WHERE lower(trim("Name")) = 'asset verification' AND "IsDeleted" = false) THEN
            RAISE EXCEPTION 'A page named "Asset Verification" already exists elsewhere : names must be unique. Tell Claude - nothing changed.';
        END IF;

        SELECT COALESCE(MAX("SequenceNo"), 0) + 1 INTO v_seq
        FROM   "NavigationSubmenus"
        WHERE  "NavigationMenuId" = v_menu."Id";

        INSERT INTO "NavigationSubmenus"
            ("NavigationMenuId", "SequenceNo", "Code", "Name", "Icon",
             "RouteKey", "Route", "DisplayOrder", "Remarks",
             "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        VALUES
            (v_menu."Id", v_seq, v_prefix || lpad(v_seq::text, 3, '0'),
             'Asset Verification', 'fa-solid fa-clipboard-check',
             'asset-verification',
             '/' || v_module."RouteKey" || '/' || v_menu."RouteKey" || '/asset-verification',
             4, 'The physical count of a location against the register. Hand-written page : never run Submenu / Code Sync.',
             true, false, 1, now());

        RAISE NOTICE 'Page created under Asset Control : Asset Verification';
    ELSE
        v_old := v_sub."Code";

        IF v_sub."NavigationMenuId" = v_menu."Id" THEN
            v_new := v_old;
            v_seq := v_sub."SequenceNo";
        ELSE
            -- the next number inside Asset Control (deleted pages
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
               "Route"            = '/' || v_module."RouteKey" || '/' || v_menu."RouteKey" || '/asset-verification'
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
                   "MenuId" = v_menu."Id", "MenuCode" = v_menu."Code", "MenuName" = 'Asset Control'
            WHERE  "SubmenuId" = v_sub."Id";
        END IF;

        IF to_regclass('public."CodeSynchronizations"') IS NOT NULL THEN
            UPDATE "CodeSynchronizations"
            SET    "SubmenuCode" = v_new,
                   "ModuleId" = v_module."Id", "ModuleCode" = v_module."Code", "ModuleName" = v_module."Name",
                   "MenuId" = v_menu."Id", "MenuCode" = v_menu."Code", "MenuName" = 'Asset Control'
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

        RAISE NOTICE 'Asset Verification is under Asset Control : code % (was %), permissions follow.', v_new, v_old;
    END IF;

    -- ---------- the order ----------
    UPDATE "NavigationSubmenus" n
    SET    "DisplayOrder" = o.ord
    FROM   (VALUES ('asset-acquisitions', 1), ('fixed-asset-register', 2),
                   ('opening-assets', 3), ('asset-verification', 4)) AS o (route_key, ord)
    WHERE  n."NavigationMenuId" = v_menu."Id"
    AND    lower(trim(n."RouteKey")) = o.route_key
    AND    n."IsDeleted" = false;

    IF v_reports."Id" IS NOT NULL THEN
        UPDATE "NavigationSubmenus" n
        SET    "DisplayOrder" = o.ord
        FROM   (VALUES ('fixed-asset-schedule', 1), ('asset-tags', 2)) AS o (route_key, ord)
        WHERE  n."NavigationMenuId" = v_reports."Id"
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
AND    lower(trim(m."RouteKey")) IN ('asset-register', 'asset-reports')
AND    s."IsDeleted" = false
AND    m."IsDeleted" = false
ORDER  BY m."DisplayOrder", s."DisplayOrder";
