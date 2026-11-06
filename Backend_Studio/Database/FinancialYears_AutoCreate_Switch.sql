-- ============================================================
-- System Configuration : Auto Create Next Financial Year
--
--   CFG-MOD-003-0111  Auto Create Next Financial Year   ON, 30 days
--     ON  : the next financial year (12 months, from the day after
--           the current one ends) is created automatically this
--           many days before the current year ends. Open, active,
--           NOT set as current; nothing else changes (no closing,
--           no balances). The bell tells from 10 days before the
--           create day, every day, until it is made.
--     OFF : nothing is created; from (days + 10) before the year
--           ends the bell warns every day that the next year is
--           missing.
--
-- Page switch (ScopeType Submenu) of Settings (MOD-003) ›
-- General Settings › Financial Years. The server reads it by
-- code; a missing switch behaves as OFF. Stops if the module code
-- is not MOD-003, the page is missing, or the code is already
-- used by another switch. Safe to run more than once. Run it all
-- (F5).
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
    WHERE  s."Route" ILIKE '/settings/general-settings/financial-years'
    AND    NOT s."IsDeleted"
    LIMIT  1;

    IF v_page_code IS NULL THEN
        RAISE EXCEPTION 'Financial Years page not found by route - nothing changed.';
    END IF;

    SELECT "ConfigurationName"
    INTO   v_used_name
    FROM   "SystemConfigurations"
    WHERE  "ConfigurationCode" = 'CFG-MOD-003-0111';

    IF v_used_name IS NOT NULL THEN
        IF v_used_name <> 'Auto Create Next Financial Year' THEN
            RAISE EXCEPTION 'CFG-MOD-003-0111 is already used by "%" - nothing changed. Tell Claude.', v_used_name;
        END IF;

        RAISE NOTICE 'Auto Create Next Financial Year already exists - left as it is.';
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
        'CFG-MOD-003-0111', 'Auto Create Next Financial Year',
        'The next financial year (12 months, from the day after the current one ends) is created automatically this many days before the current year ends : Open, not current, nothing else changes. The bell tells from 10 days before, every day.',
        'Nothing is created automatically; the bell warns every day from (days + 10) before the year ends that the next year is missing.',
        true, '30',
        'Number', 'days', 1, 180, '',
        true, '30', NULL,
        true, true, 1, 'Financial Years page. Background job, hourly.',
        false, 1, now()
    );

    RAISE NOTICE 'Auto Create Next Financial Year added on % (%).', v_page_code, v_menu_code;
END $$;

SELECT "NavigationSubmenuCode" AS "Page", "ConfigurationCode", "ConfigurationName", "IsEnabled", "Value"
FROM   "SystemConfigurations"
WHERE  "ConfigurationCode" = 'CFG-MOD-003-0111';
