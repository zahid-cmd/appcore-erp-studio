-- =====================================================================
-- FixedAssets_Access_Check.sql   (2026-11-14)
-- ---------------------------------------------------------------------
-- Read only : shows why a button (Add, Restore ...) does not show on
-- a Fixed Assets page. Run each query on its own. ASCII only.
-- =====================================================================

-- 1. The pages of the module. "Asset Groups" must be here with the
--    route /fixed-assets-management/asset-setup/asset-groups. If it
--    still says Asset Categories, run FixedAssets_Navigation.sql again.
SELECT m."Name" AS "Menu", s."Code", s."Name" AS "Page", s."Route"
FROM   "NavigationSubmenus" s
JOIN   "NavigationMenus" m   ON m."Id" = s."NavigationMenuId"
JOIN   "NavigationModules" d ON d."Id" = m."NavigationModuleId"
WHERE  lower(trim(d."RouteKey")) = 'fixed-assets-management'
AND    s."IsDeleted" = false
ORDER  BY m."DisplayOrder", s."DisplayOrder";

-- 2. What each role may do on those pages. A page that is not listed
--    for your role has nothing ticked : tick it on Security &
--    Permission > Activity Assignment, then log in again.
SELECT r."ProfileName"                     AS "Role Profile",
       s."Name"                            AS "Page",
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
JOIN   "NavigationSubmenus" s
       ON s."Id" = d."SubMenuId"
      AND s."IsDeleted" = false
      AND s."Route" ILIKE '/fixed-assets-management/%'
JOIN   "RoleProfiles" r
       ON r."RoleProfileId" = aa."RoleProfileId"
WHERE  aa."IsActive" = true
AND    aa."IsDeleted" = false
GROUP  BY r."ProfileName", s."Name"
ORDER  BY r."ProfileName", s."Name";
