-- =====================================================================
-- HumanResource_EmployeeProfiles_Rename.sql   (2026-11-14)
-- ---------------------------------------------------------------------
-- Human Resource Management > Employee Management :
-- the page "Employees" is now called "Employee Profiles".
--
-- Only the name of the submenu changes. Its route
--   /human-resource-manangement/employee-management/employees
-- its code and the permissions already given stay as they are.
--
-- Needed only where HumanResource_Phase1_Engine.sql was run before
-- 2026-11-14 (it now creates the page with the new name).
-- Safe to run again. Run the whole script (F5) on AppCoreERP_Studio,
-- then log in again to see the new name on the menu.
-- ASCII only.
-- =====================================================================

DO $$
DECLARE
    v_page record;
BEGIN
    SELECT s."Id", s."Code", s."Name" INTO v_page
    FROM   "NavigationSubmenus" s
    WHERE  lower(s."Route") = '/human-resource-manangement/employee-management/employees'
    AND    s."IsDeleted" = false
    LIMIT  1;

    IF v_page."Id" IS NULL THEN
        RAISE EXCEPTION 'Page /human-resource-manangement/employee-management/employees not found : run HumanResource_Phase1_Engine.sql first.';
    END IF;

    IF v_page."Name" = 'Employee Profiles' THEN
        RAISE NOTICE 'Page % is already named Employee Profiles.', v_page."Code";
        RETURN;
    END IF;

    IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
               WHERE lower(trim("Name")) = 'employee profiles'
               AND   "IsDeleted" = false
               AND   "Id" <> v_page."Id") THEN
        RAISE EXCEPTION 'A submenu named "Employee Profiles" already exists elsewhere : names must be unique. Tell Claude.';
    END IF;

    UPDATE "NavigationSubmenus"
    SET    "Name" = 'Employee Profiles'
    WHERE  "Id" = v_page."Id";

    RAISE NOTICE 'Page % renamed : % -> Employee Profiles', v_page."Code", v_page."Name";
END $$;


-- ------------------------------------------------------------
-- Check (run on its own)
-- ------------------------------------------------------------
SELECT s."Code", s."Name", s."Route"
FROM   "NavigationSubmenus" s
WHERE  lower(s."Route") = '/human-resource-manangement/employee-management/employees'
AND    s."IsDeleted" = false;
