-- ============================================================
-- Opening Stock : Profit % On Sale Price switch (2026-11-01).
-- Plain statements only : run in a NEW pgAdmin Query Tool (F5).
-- Safe to run again.
--
--   CFG-MOD-012-0010  Profit % On Sale Price   OFF (default)
--   OFF : profit on cost (markup)   = (net sale - cost) / cost
--   ON  : margin on the net sale    = (net sale - cost) / net sale
--   Net sale = MRP (the sale price) less the sales VAT in it.
--   A switch that already exists is left as it is.
-- ============================================================

INSERT INTO "SystemConfigurations"
(
    "NavigationModuleId", "ScopeType", "NavigationMenuCode", "NavigationSubmenuCode",
    "ConfigurationCode", "ConfigurationName", "OnDescription", "OffDescription",
    "IsEnabled", "Value",
    "ValueType", "ValueUnit", "ValueMin", "ValueMax", "ValueEmptyText",
    "DefaultEnabled", "DefaultValue", "ParentConfigurationCode",
    "IsCritical", "IsSystemDefined", "DisplayOrder", "Remarks",
    "IsDeleted", "CreatedBy", "CreatedDate"
)
SELECT
    m."Id", 'Submenu', mn."Code", s."Code",
    v.code, v.name,
    'Profit % is a margin on the net sale : (net sale - cost) / net sale. Net sale = MRP less the sales VAT in it.',
    'Profit % is on cost (markup) : (net sale - cost) / cost. Net sale = MRP less the sales VAT in it.',
    v.def_on, '',
    'None', '', NULL, NULL, '',
    v.def_on, '', NULL,
    false, true, v.ord, 'Shown on the Opening Stock page only; nothing posted uses it.',
    false, 1, now()
FROM
(
    VALUES
        ('CFG-MOD-012-0010', 'Profit % On Sale Price', '', false, 23)
) AS v (code, name, kind, def_on, ord)
CROSS JOIN LATERAL
(
    SELECT nm."Id"
    FROM   "NavigationModules" nm
    WHERE  lower(trim(nm."Name")) = 'inventory management'
    AND    NOT nm."IsDeleted"
    LIMIT  1
) AS m
CROSS JOIN LATERAL
(
    SELECT sm."Code", sm."NavigationMenuId"
    FROM   "NavigationSubmenus" sm
    WHERE  sm."Route" ILIKE '/inventory-management/%/opening-stock'
    AND    NOT sm."IsDeleted"
    LIMIT  1
) AS s
JOIN "NavigationMenus" mn ON mn."Id" = s."NavigationMenuId"
WHERE NOT EXISTS
(
    SELECT 1 FROM "SystemConfigurations" c
    WHERE  c."ConfigurationCode" = v.code
);


/*  Check (select and run on its own) : one row, IsEnabled false

SELECT "ConfigurationCode", "ConfigurationName", "IsEnabled", "NavigationSubmenuCode"
FROM   "SystemConfigurations"
WHERE  "ConfigurationCode" = 'CFG-MOD-012-0010';
*/
