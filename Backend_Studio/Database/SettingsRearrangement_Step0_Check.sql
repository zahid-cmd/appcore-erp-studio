ROLLBACK;

-- =====================================================================
-- SettingsRearrangement_Step0_Check.sql   (2026-11-20)
-- ---------------------------------------------------------------------
-- READ ONLY : changes nothing. For the blueprint
--     claude\blueprint-module-setup-rearrangement.md  (step 0)
--
-- Run in pgAdmin on AppCoreERP_Studio (Query Tool, the whole file, F5).
-- Three result tabs come back; send all three.
--
--   1. Every module, its number, and how many switches it has
--   2. The menus of every module (to see which have a setup menu)
--   3. Switches whose code number is not the number of their module
--
-- ASCII only. Safe to run again.
-- =====================================================================

-- 1. Modules and their switches
SELECT m."Code"                                   AS "ModuleCode",
       m."Name"                                   AS "Module",
       m."RouteKey",
       m."DisplayOrder",
       count(s."SystemConfigurationId")           AS "Switches",
       min(s."ConfigurationCode")                 AS "FirstCode",
       max(s."ConfigurationCode")                 AS "LastCode"
FROM   "NavigationModules" m
LEFT   JOIN "SystemConfigurations" s
       ON  s."NavigationModuleId" = m."Id"
       AND s."IsDeleted" = false
WHERE  m."IsDeleted" = false
GROUP  BY m."Id", m."Code", m."Name", m."RouteKey", m."DisplayOrder"
ORDER  BY m."DisplayOrder", m."Code";

-- 2. Menus of every module, with the number of pages
SELECT m."Name"                                   AS "Module",
       n."Code"                                   AS "MenuCode",
       n."Name"                                   AS "Menu",
       n."RouteKey",
       n."DisplayOrder",
       (SELECT count(*)
        FROM   "NavigationSubmenus" p
        WHERE  p."NavigationMenuId" = n."Id"
        AND    p."IsDeleted" = false)             AS "Pages"
FROM   "NavigationMenus" n
JOIN   "NavigationModules" m ON m."Id" = n."NavigationModuleId"
WHERE  n."IsDeleted" = false
AND    m."IsDeleted" = false
ORDER  BY m."DisplayOrder", n."DisplayOrder", n."Code";

-- 3. Switches sitting under a module other than the one in their code
SELECT m."Name"                                   AS "Module",
       m."Code"                                   AS "ModuleCode",
       s."ConfigurationCode",
       s."ConfigurationName",
       s."ScopeType",
       s."NavigationMenuCode",
       s."NavigationSubmenuCode"
FROM   "SystemConfigurations" s
JOIN   "NavigationModules" m ON m."Id" = s."NavigationModuleId"
WHERE  s."IsDeleted" = false
AND    right(m."Code", 3) <> substring(s."ConfigurationCode" from 9 for 3)
ORDER  BY s."ConfigurationCode";
