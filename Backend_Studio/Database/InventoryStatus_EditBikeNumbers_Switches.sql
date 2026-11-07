-- ============================================================
-- System Configuration : Edit Bike Numbers (Motor Bike Stock)
--
--   CFG-MOD-012-0090  Edit Bike Numbers               OFF, critical
--     ON  : Motor Bike Stock > Technical Records shows a pencil on
--           bikes not yet sold; Chassis / Engine / Key / Battery No
--           can be corrected (live duplicate check, history kept).
--     OFF : the numbers are read only.
--
--   CFG-MOD-012-0091  Edit Bike Numbers After Sale    OFF, critical
--     (needs CFG-MOD-012-0090 ON)
--     ON  : sold bikes can be corrected too; the new number is
--           also written on the bike's service vehicle,
--           memberships and service enquiries.
--     OFF : sold bikes are read only.
--
-- Editing also needs the "Update" action on Motor Bike Stock
-- (Role / Special Assignment).
--
-- Page switches (ScopeType Submenu) of Inventory Management
-- (MOD-012) > Inventory Status > Motor Bike Stock. The page reads
-- them by code; a missing switch behaves as OFF. Stops if the
-- module code is not MOD-012, the page is missing, or a code is
-- already used by another switch. Safe to run more than once.
-- Run it all (F5).
-- ============================================================

DO $$
DECLARE
    v_module_id   bigint;
    v_module_code text;
    v_page_code   text;
    v_menu_code   text;
    v_used_name   text;
    v_row         record;
BEGIN
    SELECT m."Id", m."Code"
    INTO   v_module_id, v_module_code
    FROM   "NavigationModules" m
    WHERE  lower(trim(m."RouteKey")) = 'inventory-management'
    AND    NOT m."IsDeleted"
    LIMIT  1;

    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Inventory Management module not found - nothing changed.';
    END IF;

    IF upper(trim(v_module_code)) <> 'MOD-012' THEN
        RAISE EXCEPTION 'Inventory Management module code is % (expected MOD-012) - nothing changed. Tell Claude the code.', v_module_code;
    END IF;

    SELECT s."Code", mn."Code"
    INTO   v_page_code, v_menu_code
    FROM   "NavigationSubmenus" s
    JOIN   "NavigationMenus" mn ON mn."Id" = s."NavigationMenuId"
    WHERE  s."Route" ILIKE '/inventory-management/%/motor-bike-stock'
    AND    NOT s."IsDeleted"
    LIMIT  1;

    IF v_page_code IS NULL THEN
        RAISE EXCEPTION 'Motor Bike Stock page not found by route - nothing changed.';
    END IF;

    -- Codes taken by other switches : stop before changing anything
    FOR v_row IN
        SELECT *
        FROM
        (
            VALUES
            ('CFG-MOD-012-0090', 'Edit Bike Numbers'),
            ('CFG-MOD-012-0091', 'Edit Bike Numbers After Sale')
        ) AS x (code, name)
    LOOP
        v_used_name := NULL;

        SELECT "ConfigurationName"
        INTO   v_used_name
        FROM   "SystemConfigurations"
        WHERE  "ConfigurationCode" = v_row.code;

        IF v_used_name IS NOT NULL AND v_used_name <> v_row.name THEN
            RAISE EXCEPTION '% is already used by "%" - nothing changed. Tell Claude.', v_row.code, v_used_name;
        END IF;
    END LOOP;

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
        v_module_id, 'Submenu', v_menu_code, v_page_code,
        'CFG-MOD-012-0090',
        'Edit Bike Numbers',
        'Technical Records shows a pencil on bikes not yet sold : Chassis, Engine, Key and Battery No can be corrected (live duplicate check, history kept).',
        'Bike numbers are read only on Motor Bike Stock.',
        false, '',
        'None', '', NULL, NULL, '',
        false, '', NULL,
        true, true, 60, 'Critical : changing it needs a reason / approval. Editing also needs the Update action on Motor Bike Stock.',
        false, 1, now()
    WHERE NOT EXISTS
    (
        SELECT 1 FROM "SystemConfigurations" c WHERE c."ConfigurationCode" = 'CFG-MOD-012-0090'
    );

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
        v_module_id, 'Submenu', v_menu_code, v_page_code,
        'CFG-MOD-012-0091',
        'Edit Bike Numbers After Sale',
        'Sold bikes can be corrected too : the new number is also written on the bike''s service vehicle, memberships and service enquiries.',
        'Sold bikes are read only.',
        false, '',
        'None', '', NULL, NULL, '',
        false, '', 'CFG-MOD-012-0090',
        true, true, 61, 'Critical : changing it needs a reason / approval. Needs Edit Bike Numbers ON.',
        false, 1, now()
    WHERE NOT EXISTS
    (
        SELECT 1 FROM "SystemConfigurations" c WHERE c."ConfigurationCode" = 'CFG-MOD-012-0091'
    );

    RAISE NOTICE 'Edit Bike Numbers switches : done.';
END $$;

-- Check
SELECT "ConfigurationCode", "ConfigurationName", "IsEnabled", "IsCritical", "ParentConfigurationCode", "NavigationSubmenuCode"
FROM   "SystemConfigurations"
WHERE  "ConfigurationCode" IN ('CFG-MOD-012-0090', 'CFG-MOD-012-0091')
ORDER  BY "ConfigurationCode";
