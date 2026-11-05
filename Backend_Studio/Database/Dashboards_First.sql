-- =====================================================================
-- Dashboards_First.sql   (2026-11-03)
-- ---------------------------------------------------------------------
-- Rule (owner, 2026-11-03) : a dashboard is always submenu 1 of its
-- menu. Moves these dashboards to the top of their menus and keeps
-- the other submenus in their current order behind them :
--   Service Operations > Workshop Management : Workshop Dashboard
--   VAT Management > VAT Books & Returns     : VAT Dashboard
-- Only DisplayOrder changes; codes (SUB-...) and routes stay the same.
-- Safe to run again. Run the whole script (F5), then Menu Sync.
-- =====================================================================

WITH dash AS
(
    SELECT s."Id", s."NavigationMenuId"
    FROM   "NavigationSubmenus" s
    JOIN   "NavigationMenus"    m ON m."Id" = s."NavigationMenuId" AND m."IsDeleted" = false
    JOIN   "NavigationModules"  d ON d."Id" = m."NavigationModuleId" AND d."IsDeleted" = false
    WHERE  s."IsDeleted" = false
    AND    (
               (lower(d."RouteKey") = 'service-operations' AND lower(m."RouteKey") = 'workshop-management' AND lower(s."RouteKey") = 'workshop-dashboard')
            OR (lower(d."RouteKey") = 'vat-management'     AND lower(m."RouteKey") = 'vat-books-returns'   AND lower(s."RouteKey") = 'vat-dashboard')
           )
),
ordered AS
(
    SELECT s."Id",
           row_number() OVER
           (
               PARTITION BY s."NavigationMenuId"
               ORDER BY CASE WHEN s."Id" IN (SELECT "Id" FROM dash) THEN 0 ELSE 1 END,
                        s."DisplayOrder",
                        s."SequenceNo"
           ) AS rn
    FROM   "NavigationSubmenus" s
    WHERE  s."IsDeleted" = false
    AND    s."NavigationMenuId" IN (SELECT "NavigationMenuId" FROM dash)
)
UPDATE "NavigationSubmenus" u
SET    "DisplayOrder" = o.rn
FROM   ordered o
WHERE  u."Id" = o."Id"
AND    u."DisplayOrder" IS DISTINCT FROM o.rn;


-- Check (run on its own)
SELECT d."Name" AS "Module", m."Name" AS "Menu", s."DisplayOrder", s."Code", s."Name" AS "Submenu"
FROM   "NavigationSubmenus" s
JOIN   "NavigationMenus"    m ON m."Id" = s."NavigationMenuId"
JOIN   "NavigationModules"  d ON d."Id" = m."NavigationModuleId"
WHERE  s."IsDeleted" = false
AND    lower(m."RouteKey") IN ('workshop-management', 'vat-books-returns')
ORDER  BY d."Name", m."DisplayOrder", s."DisplayOrder";
