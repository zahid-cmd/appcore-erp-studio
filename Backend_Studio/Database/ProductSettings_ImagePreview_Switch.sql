-- ============================================================
-- System Configuration : Row Image Preview (Motor Bikes list)
--
--   CFG-MOD-003-0101  Row Image Preview            ON (default)
--     ON  : hovering a bike's thumbnail on the Motor Bikes list
--           shows a larger image with its name and stock levels.
--     OFF : thumbnails only, no hover preview.
--
-- Page switch (ScopeType Submenu) of Settings (MOD-003) ›
-- Product Settings › Motor Bikes. The page reads it by code; a
-- missing switch behaves as ON. Stops if the module code is not
-- MOD-003, the page is missing, or the code is already used by
-- another switch. Safe to run more than once. Run it all (F5).
-- ============================================================

DO $$
DECLARE
    v_module_id   bigint;
    v_module_code text;
    v_page_code   text;
    v_menu_code   text;
    v_used_name   text;
BEGIN
    SELECT m."Id", m."Code"
    INTO   v_module_id, v_module_code
    FROM   "NavigationModules" m
    WHERE  lower(trim(m."RouteKey")) = 'settings'
    AND    NOT m."IsDeleted"
    LIMIT  1;

    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Settings module not found - nothing changed.';
    END IF;

    IF upper(trim(v_module_code)) <> 'MOD-003' THEN
        RAISE EXCEPTION 'Settings module code is % (expected MOD-003) - nothing changed. Tell Claude the code.', v_module_code;
    END IF;

    SELECT s."Code", mn."Code"
    INTO   v_page_code, v_menu_code
    FROM   "NavigationSubmenus" s
    JOIN   "NavigationMenus" mn ON mn."Id" = s."NavigationMenuId"
    WHERE  s."Route" ILIKE '/settings/product-settings/motor-bikes'
    AND    NOT s."IsDeleted"
    LIMIT  1;

    IF v_page_code IS NULL THEN
        RAISE EXCEPTION 'Motor Bikes page not found by route - nothing changed.';
    END IF;

    SELECT "ConfigurationName"
    INTO   v_used_name
    FROM   "SystemConfigurations"
    WHERE  "ConfigurationCode" = 'CFG-MOD-003-0101';

    IF v_used_name IS NOT NULL THEN
        IF v_used_name <> 'Row Image Preview' THEN
            RAISE EXCEPTION 'CFG-MOD-003-0101 is already used by "%" - nothing changed. Tell Claude.', v_used_name;
        END IF;

        RAISE NOTICE 'Row Image Preview already exists - left as it is.';
        RETURN;
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
        'CFG-MOD-003-0101', 'Row Image Preview',
        'Hovering a bike''s thumbnail on the Motor Bikes list shows a larger image with its name and stock levels.',
        'The list shows thumbnails only (no hover preview).',
        true, '',
        'None', '', NULL, NULL, '',
        true, '', NULL,
        false, true, 1, 'Motor Bikes list page.',
        false, 1, now()
    );

    RAISE NOTICE 'Row Image Preview added on % (%).', v_page_code, v_menu_code;
END $$;

SELECT "NavigationSubmenuCode" AS "Page", "ConfigurationCode", "ConfigurationName", "IsEnabled"
FROM   "SystemConfigurations"
WHERE  "ConfigurationCode" = 'CFG-MOD-003-0101';
