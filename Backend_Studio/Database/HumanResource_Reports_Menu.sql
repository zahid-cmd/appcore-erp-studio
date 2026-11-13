-- =====================================================================
-- HumanResource_Reports_Menu.sql   (2026-11-14)
-- ---------------------------------------------------------------------
-- Human Resource Management : every report under ONE menu, HR Reports
-- (hand-written pages : NEVER run Submenu / Code Sync for them)
-- Run HumanResource_Phase5_Engine.sql (the HR Reports menu) and
-- HumanResource_ProvidentFund_Engine.sql first.
--
--   HR Reports (existing menu)
--     Staff & Payroll Reports   (already there)
--     PF Reports                /human-resource-manangement/hr-reports/pf-reports
--
--   PF Reports was a page of the Provident Fund menu. It is MOVED
--   (not made again), with the same steps as moving a page on
--   Navigation Management : its code follows the new menu, and the
--   tables that keep the code / menu follow too. The permissions
--   ticked for it stay, and they now point at HR Reports (the sidebar
--   files a page under the menu its permissions name). When the page
--   does not exist yet it is made under HR Reports.
--
--   Run it again when PF Reports does not show under HR Reports : a
--   first version of this script moved the page only.
--
-- Safe to run again. Run the whole script (F5) on AppCoreERP_Studio,
-- then log in again to see the menu change.
-- ASCII only.
-- =====================================================================

DO $$
DECLARE
    v_module record;
    v_menu   record;
    v_sub    record;
    v_seq    int;
    v_prefix text;
    v_old    text;
    v_new    text;
BEGIN
    SELECT "Id", "SequenceNo", "RouteKey", "Code", "Name" INTO v_module
    FROM   "NavigationModules"
    WHERE  lower(trim("RouteKey")) = 'human-resource-manangement'
    AND    "IsDeleted" = false
    LIMIT  1;

    IF v_module."Id" IS NULL THEN
        RAISE EXCEPTION 'Module with route key human-resource-manangement not found - nothing was changed.';
    END IF;

    SELECT "Id", "SequenceNo", "RouteKey", "Code", "Name" INTO v_menu
    FROM   "NavigationMenus"
    WHERE  "NavigationModuleId" = v_module."Id"
    AND    lower(trim("RouteKey")) = 'hr-reports'
    AND    "IsDeleted" = false
    LIMIT  1;

    IF v_menu."Id" IS NULL THEN
        RAISE EXCEPTION 'Menu HR Reports not found : run HumanResource_Phase5_Engine.sql first.';
    END IF;

    -- the codes of the pages of HR Reports : SUB-<menu numbers>-nnn
    v_prefix := 'SUB-' || substr(v_menu."Code", 5) || '-';

    -- the PF Reports page of this module, wherever it is
    SELECT s."Id", s."NavigationMenuId", s."Code", s."SequenceNo" INTO v_sub
    FROM   "NavigationSubmenus" s
    JOIN   "NavigationMenus" m ON m."Id" = s."NavigationMenuId"
    WHERE  m."NavigationModuleId" = v_module."Id"
    AND    lower(trim(s."RouteKey")) = 'pf-reports'
    AND    s."IsDeleted" = false
    LIMIT  1;

    -- the next number inside HR Reports (deleted pages counted :
    -- numbers are never reused)
    SELECT COALESCE(MAX("SequenceNo"), 0) + 1 INTO v_seq
    FROM   "NavigationSubmenus"
    WHERE  "NavigationMenuId" = v_menu."Id"
    AND    (v_sub."Id" IS NULL OR "Id" <> v_sub."Id");

    -- ---------- not there yet : made under HR Reports ----------
    IF v_sub."Id" IS NULL THEN
        IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
                   WHERE lower(trim("Name")) = 'pf reports' AND "IsDeleted" = false) THEN
            RAISE EXCEPTION 'A submenu named "PF Reports" already exists elsewhere : names must be unique. Tell Claude.';
        END IF;

        INSERT INTO "NavigationSubmenus"
            ("NavigationMenuId", "SequenceNo", "Code", "Name", "Icon",
             "RouteKey", "Route", "DisplayOrder", "Remarks",
             "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        VALUES
            (v_menu."Id", v_seq, v_prefix || lpad(v_seq::text, 3, '0'),
             'PF Reports', 'fa-solid fa-chart-column',
             'pf-reports',
             '/' || v_module."RouteKey" || '/' || v_menu."RouteKey" || '/pf-reports',
             v_seq, 'Provident fund : member statement, monthly contribution register and fund summary. Hand-written page : never run Submenu / Code Sync.',
             true, false, 1, now());

        RAISE NOTICE 'Page created under HR Reports : PF Reports';
        RETURN;
    END IF;

    -- ---------- moved (the same steps as moving a page on
    --            Navigation Management) ----------
    v_old := v_sub."Code";

    IF v_old LIKE v_prefix || '%' THEN
        -- the code follows HR Reports already
        v_new := v_old;
        v_seq := v_sub."SequenceNo";
    ELSE
        v_new := v_prefix || lpad(v_seq::text, 3, '0');

        IF EXISTS (SELECT 1 FROM "NavigationSubmenus" WHERE "Code" = v_new AND "Id" <> v_sub."Id") THEN
            RAISE EXCEPTION 'Code % is already used by another submenu. Tell Claude.', v_new;
        END IF;
    END IF;

    UPDATE "NavigationSubmenus"
    SET    "NavigationMenuId" = v_menu."Id",
           "SequenceNo"       = v_seq,
           "DisplayOrder"     = v_seq,
           "Code"             = v_new,
           "Route"            = '/' || v_module."RouteKey" || '/' || v_menu."RouteKey" || '/pf-reports'
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
               "MenuId" = v_menu."Id", "MenuCode" = v_menu."Code", "MenuName" = v_menu."Name"
        WHERE  "SubmenuId" = v_sub."Id";
    END IF;

    IF to_regclass('public."CodeSynchronizations"') IS NOT NULL THEN
        UPDATE "CodeSynchronizations"
        SET    "SubmenuCode" = v_new,
               "ModuleId" = v_module."Id", "ModuleCode" = v_module."Code", "ModuleName" = v_module."Name",
               "MenuId" = v_menu."Id", "MenuCode" = v_menu."Code", "MenuName" = v_menu."Name"
        WHERE  "SubmenuId" = v_sub."Id";
    END IF;

    -- the permissions of the page : they remember its menu, and the
    -- sidebar files the page under that menu
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

    RAISE NOTICE 'PF Reports is under HR Reports : code % (was %), permissions follow.', v_new, v_old;
END $$;


-- ------------------------------------------------------------
-- Check (run on its own)
-- ------------------------------------------------------------
SELECT m."Name" AS menu, s."Code", s."Name", s."Route"
FROM   "NavigationSubmenus" s
JOIN   "NavigationMenus" m ON m."Id" = s."NavigationMenuId"
WHERE  lower(s."Route") LIKE '/human-resource-manangement/hr-reports/%' AND s."IsDeleted" = false
ORDER  BY s."SequenceNo";
