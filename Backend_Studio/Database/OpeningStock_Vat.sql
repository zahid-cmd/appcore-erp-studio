-- ============================================================
-- Opening Stock : Includes Unclaimed VAT (2026-11-01).
-- Plain statements only : run in a NEW pgAdmin Query Tool (F5).
-- Safe to run again.
--
-- 1. Columns : OpeningStock + VatIncluded, TotalVat ;
--    OpeningStockLines + GrossUnitCost, VatRate, VatAmount.
-- 2. Switches (Inventory Management, Opening Stock page, critical),
--    read BY CODE :
--      CFG-MOD-012-0007  Includes Unclaimed VAT : Motor Bikes   ON
--      CFG-MOD-012-0008  Includes Unclaimed VAT : Spare Parts   OFF
--      CFG-MOD-012-0009  Includes Unclaimed VAT : Accessories   OFF
--    ON  : the unit cost is typed incl. VAT; the VAT part (Purchase
--          VAT rule, input credit allowed) is posted Dr VAT Current
--          Account of the type and written to the VAT register
--          (opening input credit); inventory takes the net cost.
--    OFF : the cost is excl. VAT; no VAT entry.
--    A switch that already exists is left as it is.
-- ============================================================


-- 1. Columns

ALTER TABLE public."OpeningStock"      ADD COLUMN IF NOT EXISTS "VatIncluded"   boolean       NOT NULL DEFAULT false;

ALTER TABLE public."OpeningStock"      ADD COLUMN IF NOT EXISTS "TotalVat"      numeric(18,2) NOT NULL DEFAULT 0;

ALTER TABLE public."OpeningStockLines" ADD COLUMN IF NOT EXISTS "GrossUnitCost" numeric(18,4) NOT NULL DEFAULT 0;

ALTER TABLE public."OpeningStockLines" ADD COLUMN IF NOT EXISTS "VatRate"       numeric(9,4)  NOT NULL DEFAULT 0;

ALTER TABLE public."OpeningStockLines" ADD COLUMN IF NOT EXISTS "VatAmount"     numeric(18,2) NOT NULL DEFAULT 0;

-- Lines saved before : gross = net
UPDATE public."OpeningStockLines"
SET    "GrossUnitCost" = "UnitCost"
WHERE  "GrossUnitCost" = 0;


-- 2. Switches

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
    'The ' || v.kind || ' opening cost is typed incl. VAT : the VAT part goes Dr VAT Current Account and into the VAT register (opening input credit); the stock takes the net cost.',
    'The ' || v.kind || ' opening cost is typed excl. VAT; no VAT entry (the VAT was claimed before go-live).',
    v.def_on, '',
    'None', '', NULL, NULL, '',
    v.def_on, '', NULL,
    true, true, v.ord, 'VAT rate from Purchase VAT (input credit allowed) on the opening date.',
    false, 1, now()
FROM
(
    VALUES
        ('CFG-MOD-012-0007', 'Includes Unclaimed VAT : Motor Bikes',               'motor bike',                true,  20),
        ('CFG-MOD-012-0008', 'Includes Unclaimed VAT : Spare Parts & Lubricants', 'spare part / lubricant',    false, 21),
        ('CFG-MOD-012-0009', 'Includes Unclaimed VAT : Accessories',              'accessory',                 false, 22)
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


/*  Check (select and run on its own) : three rows

SELECT "ConfigurationCode", "ConfigurationName", "IsEnabled", "NavigationSubmenuCode"
FROM   "SystemConfigurations"
WHERE  "ConfigurationCode" IN ('CFG-MOD-012-0007', 'CFG-MOD-012-0008', 'CFG-MOD-012-0009')
ORDER  BY 1;
*/
