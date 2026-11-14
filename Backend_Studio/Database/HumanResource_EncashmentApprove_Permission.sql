-- =====================================================================
-- HumanResource_EncashmentApprove_Permission.sql   (2026-11-14)
-- ---------------------------------------------------------------------
-- Puts the page activity "Approve" on Leave Encashments, so Approve
-- and Reject can be allowed to a role (the same way as on Salary
-- Sheets and Leave Applications).
--
-- Safe to run more than once. ASCII only.
-- =====================================================================

INSERT INTO "MasterActivityPages" ("MasterActivityCode", "NavigationSubmenuCode", "CreatedBy")
SELECT a."Code", s."Code", 1
FROM   "MasterActivities" a
JOIN   "NavigationSubmenus" s
       ON s."IsDeleted" = false
      AND lower(s."Route") = '/human-resource-manangement/payroll-management/leave-encashments'
WHERE  a."IsDeleted" = false
AND    a."ActivityScope" = 'Page'
AND    lower(trim(a."Name")) = 'approve'
AND    NOT EXISTS
(
    SELECT 1 FROM "MasterActivityPages" p
    WHERE  p."MasterActivityCode" = a."Code"
    AND    p."NavigationSubmenuCode" = s."Code"
);

-- Check (run on its own) : one row = Approve is on the page
SELECT s."Code", s."Name", a."Name" AS "Activity"
FROM   "MasterActivityPages" p
JOIN   "MasterActivities" a ON a."Code" = p."MasterActivityCode"
JOIN   "NavigationSubmenus" s ON s."Code" = p."NavigationSubmenuCode"
WHERE  lower(s."Route") = '/human-resource-manangement/payroll-management/leave-encashments'
AND    lower(trim(a."Name")) = 'approve';
