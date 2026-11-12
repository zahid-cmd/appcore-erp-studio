ROLLBACK;

-- ============================================================
-- PromotionalOffers_Access_Check.sql              (2026-11-13)
--
-- Read only. Why "You do not have the Approve permission on
-- Promotional Offers - ..." : run it and read the two results.
--
-- 1. Page actions : each Promotional Offers page with the page
--    actions linked to it. Approve and Cancel must be listed
--    (else run PromotionalOffers_Activities.sql).
--
-- 2. Role profiles : each role profile that has Approve / Cancel
--    ticked on a Promotional Offers page (Security & Permission
--    -> Activity Assignment). Empty = nobody can activate : tick
--    Approve (and Cancel) for your role profile there.
-- ============================================================

-- 1. Page actions linked to the pages
SELECT s."Id"   AS "SubmenuId",
       s."Code" AS "Submenu",
       s."Name" AS "Page",
       s."Route",
       COALESCE((SELECT string_agg(a."Name", ', ' ORDER BY a."DisplayOrder")
                 FROM   "MasterActivityPages" p
                 JOIN   "MasterActivities" a
                        ON a."Code" = p."MasterActivityCode" AND a."IsDeleted" = false
                 WHERE  p."NavigationSubmenuCode" = s."Code"), '') AS "Page Actions"
FROM   "NavigationSubmenus" s
WHERE  s."IsDeleted" = false
AND    s."Route" ILIKE '/sales-operations/%/promotional-offers-%'
ORDER  BY s."Route";

-- 2. Role profiles holding Approve / Cancel on those pages
SELECT r."ProfileName"       AS "Role Profile",
       s."Name"              AS "Page",
       string_agg(DISTINCT a."Name", ', ') AS "Granted"
FROM   "ActivityAssignments" aa
JOIN   "ActivityAssignmentDetails" d
       ON d."ActivityAssignmentId" = aa."ActivityAssignmentId"
      AND d."IsActive" = true AND d."IsDeleted" = false
JOIN   "ActivityAssignmentPermissions" ap
       ON ap."ActivityAssignmentDetailId" = d."ActivityAssignmentDetailId"
      AND ap."IsActive" = true AND ap."IsDeleted" = false
JOIN   "MasterActivities" a
       ON a."Id" = ap."MasterActivityId"
      AND a."IsDeleted" = false
      AND a."Name" IN ('Approve', 'Cancel', 'Restore')
JOIN   "NavigationSubmenus" s
       ON s."Id" = d."SubMenuId"
      AND s."IsDeleted" = false
      AND s."Route" ILIKE '/sales-operations/%/promotional-offers-%'
JOIN   "RoleProfiles" r
       ON r."RoleProfileId" = aa."RoleProfileId"
WHERE  aa."IsActive" = true
AND    aa."IsDeleted" = false
GROUP  BY r."ProfileName", s."Name"
ORDER  BY r."ProfileName", s."Name";
