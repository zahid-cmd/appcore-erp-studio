ROLLBACK;

-- ============================================================
-- Sales Invoices - MB / SP / AC : switch "Show Discount on Print"
-- ------------------------------------------------------------
--   MB  CFG-MOD-008-0082
--   SP  CFG-MOD-008-0035
--   AC  CFG-MOD-008-0055
-- ON  (default) : the customer copy shows the discounts as now.
-- OFF : the customer copy (A4 and thermal) and the Money Receipt
--       show the full MRP : no discount column or lines, the total
--       and the amount received read with the discounts added back.
--       The office copy, the Receipt Voucher and the books always
--       keep the real figures.
-- Critical (a change needs a reason / approval).
-- A switch that exists is left as it is. Safe to run again.
-- ============================================================

DO $$
DECLARE
    v_module_id   bigint;
    v_module_code text;
    v_page_code   text;
    v_menu_code   text;
    v_name        text;
    p             record;
BEGIN
    SELECT m."Id", m."Code" INTO v_module_id, v_module_code
    FROM   "NavigationModules" m
    WHERE  lower(trim(m."RouteKey")) = 'sales-operations' AND NOT m."IsDeleted"
    LIMIT  1;

    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Sales Operations module not found - nothing changed.';
    END IF;

    IF upper(trim(v_module_code)) <> 'MOD-008' THEN
        RAISE EXCEPTION 'Sales Operations module code is % (expected MOD-008) - nothing changed. Tell Claude.', v_module_code;
    END IF;

    FOR p IN
        SELECT * FROM (VALUES
            ('sales-invoices-mb', 'CFG-MOD-008-0082', 'MB', 19),
            ('sales-invoices-sp', 'CFG-MOD-008-0035', 'SP', 14),
            ('sales-invoices-ac', 'CFG-MOD-008-0055', 'AC', 14)
        ) AS x (page, code, t, ord)
    LOOP
        SELECT "ConfigurationName" INTO v_name
        FROM   "SystemConfigurations"
        WHERE  "ConfigurationCode" = p.code;

        IF v_name IS NOT NULL AND v_name NOT LIKE 'Show Discount on Print%' THEN
            RAISE EXCEPTION '% is already used by "%" - nothing changed. Tell Claude.', p.code, v_name;
        END IF;

        CONTINUE WHEN v_name IS NOT NULL;

        v_page_code := NULL;

        SELECT s."Code", mn."Code" INTO v_page_code, v_menu_code
        FROM   "NavigationSubmenus" s
        JOIN   "NavigationMenus" mn ON mn."Id" = s."NavigationMenuId"
        WHERE  s."Route" ILIKE '/sales-operations/%/' || p.page
        AND    NOT s."IsDeleted"
        LIMIT  1;

        IF v_page_code IS NULL THEN
            RAISE EXCEPTION 'Page % not found by route - nothing changed.', p.page;
        END IF;

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
        VALUES
        (
            v_module_id, 'Submenu', v_menu_code, v_page_code,
            p.code, 'Show Discount on Print - ' || p.t,
            'The customer copy of the invoice (A4 and thermal) and the Money Receipt show the discounts (campaign, membership, special, fractional).',
            'The customer copy and the Money Receipt show the full MRP : no discount column or lines; the total and the amount received read with the discounts added back.',
            true, '',
            'None', '', NULL, NULL, '',
            true, '', NULL,
            true, true, p.ord, 'Critical. The office copy, the Receipt Voucher and the books always keep the real figures.',
            false, 1, now()
        );

        RAISE NOTICE 'Switch % Show Discount on Print - % added (ON).', p.code, p.t;
    END LOOP;
END $$;

-- Check
SELECT "ConfigurationCode", "ConfigurationName", "IsEnabled", "IsCritical", "NavigationSubmenuCode"
FROM   "SystemConfigurations"
WHERE  "ConfigurationCode" IN ('CFG-MOD-008-0082', 'CFG-MOD-008-0035', 'CFG-MOD-008-0055')
ORDER  BY "ConfigurationCode";
