-- =====================================================================
-- HumanResource_Phase5_Engine.sql   (2026-11-13)
-- ---------------------------------------------------------------------
-- Human Resource Management, phase 5 : reports
-- (hand-written page : NEVER run Submenu / Code Sync for it)
-- Run HumanResource_Phase1_Engine.sql .. _Phase4_ first.
--
--   HR Reports (new menu)
--     Staff & Payroll Reports
--       /human-resource-manangement/hr-reports/staff-payroll-reports
--       Staff List, Leave Balance, Salary Register (read only;
--       Excel and print from the page). The attendance register
--       is Attendance Management > Monthly Attendance.
--
-- No tables. Safe to run again. Run the whole script (F5) on
-- AppCoreERP_Studio.
--
-- AFTER : Security & Permission > Activity Assignment : tick View
-- on Staff & Payroll Reports for the roles, then log in again.
-- ASCII only.
-- =====================================================================

DO $$
DECLARE
    v_module record;
    v_menu   record;
    v_seq    int;
BEGIN
    SELECT "Id", "SequenceNo", "RouteKey" INTO v_module
    FROM   "NavigationModules"
    WHERE  lower(trim("RouteKey")) = 'human-resource-manangement'
    AND    "IsDeleted" = false
    LIMIT  1;

    IF v_module."Id" IS NULL THEN
        RAISE EXCEPTION 'Module with route key human-resource-manangement not found - no menu or page was added.';
    END IF;

    -- ---------- Menu : HR Reports ----------
    IF NOT EXISTS (SELECT 1 FROM "NavigationMenus"
                   WHERE "NavigationModuleId" = v_module."Id"
                   AND   lower(trim("RouteKey")) = 'hr-reports'
                   AND   "IsDeleted" = false) THEN

        SELECT COALESCE(MAX("SequenceNo"), 0) + 1 INTO v_seq
        FROM   "NavigationMenus"
        WHERE  "NavigationModuleId" = v_module."Id";

        INSERT INTO "NavigationMenus"
            ("NavigationModuleId", "SequenceNo", "Code", "Name", "Icon",
             "RouteKey", "Route", "DisplayOrder", "Remarks",
             "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        VALUES
            (v_module."Id", v_seq,
             'MNU-' || lpad(v_module."SequenceNo"::text, 3, '0') || '-' || lpad(v_seq::text, 3, '0'),
             'HR Reports', 'fa-solid fa-chart-column',
             'hr-reports', '/' || v_module."RouteKey" || '/hr-reports',
             v_seq, NULL,
             true, false, 1, now());

        RAISE NOTICE 'Menu created : HR Reports';
    ELSE
        RAISE NOTICE 'Menu exists, skipped : HR Reports';
    END IF;

    SELECT "Id", "SequenceNo", "RouteKey" INTO v_menu
    FROM   "NavigationMenus"
    WHERE  "NavigationModuleId" = v_module."Id"
    AND    lower(trim("RouteKey")) = 'hr-reports'
    AND    "IsDeleted" = false
    LIMIT  1;

    -- ---------- Page ----------
    IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
               WHERE "NavigationMenuId" = v_menu."Id"
               AND   lower(trim("RouteKey")) = 'staff-payroll-reports'
               AND   "IsDeleted" = false) THEN
        RAISE NOTICE 'Page exists, skipped : Staff & Payroll Reports';
    ELSE
        IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
                   WHERE lower(trim("Name")) = 'staff & payroll reports' AND "IsDeleted" = false) THEN
            RAISE EXCEPTION 'A submenu named "Staff & Payroll Reports" already exists elsewhere : names must be unique. Tell Claude.';
        END IF;

        SELECT COALESCE(MAX("SequenceNo"), 0) + 1 INTO v_seq
        FROM   "NavigationSubmenus"
        WHERE  "NavigationMenuId" = v_menu."Id";

        INSERT INTO "NavigationSubmenus"
            ("NavigationMenuId", "SequenceNo", "Code", "Name", "Icon",
             "RouteKey", "Route", "DisplayOrder", "Remarks",
             "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        VALUES
            (v_menu."Id", v_seq,
             'SUB-' || lpad(v_module."SequenceNo"::text, 3, '0')
                    || '-' || lpad(v_menu."SequenceNo"::text, 3, '0')
                    || '-' || lpad(v_seq::text, 3, '0'),
             'Staff & Payroll Reports', 'fa-solid fa-file-lines',
             'staff-payroll-reports',
             '/' || v_module."RouteKey" || '/' || v_menu."RouteKey" || '/staff-payroll-reports',
             v_seq, 'Staff List, Leave Balance and Salary Register. Hand-written page : never run Submenu / Code Sync.',
             true, false, 1, now());

        RAISE NOTICE 'Page created : Staff & Payroll Reports';
    END IF;
END $$;


-- ------------------------------------------------------------
-- Check (run on its own)
-- ------------------------------------------------------------
SELECT s."Code", s."Name", s."Route"
FROM   "NavigationSubmenus" s
WHERE  lower(s."RouteKey") = 'staff-payroll-reports' AND s."IsDeleted" = false;
