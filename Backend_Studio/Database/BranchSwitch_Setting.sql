-- ============================================================
-- System Configuration : Allow Branch Switch Without Re-login
--
--   CFG-MOD-006-0101  Allow Branch Switch Without Re-login   ON
--     ON  : a user assigned to two or more active branches
--           (Branch Assignment) sees "Switch Branch" in the user
--           menu (and on the Branch chip of the top bar) and may
--           move the session to another of those branches. A new
--           token is issued with the same expiry; every switch is
--           written to Activity History (Security & Permission -
--           BranchSwitch).
--     OFF : no switching; the user logs out and logs in to the
--           other branch.
--
-- Page switch (ScopeType Submenu) of Security & Permission
-- (MOD-006) > Branch Assignment. The server reads it by code; a
-- missing switch behaves as ON. Stops if the module code is not
-- MOD-006, the page is missing, or the code is already used by
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
    WHERE  lower(trim(m."RouteKey")) = 'security-permission'
    AND    NOT m."IsDeleted"
    LIMIT  1;

    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Security & Permission module not found - nothing changed.';
    END IF;

    IF upper(trim(v_module_code)) <> 'MOD-006' THEN
        RAISE EXCEPTION 'Security & Permission module code is % (expected MOD-006) - nothing changed. Tell Claude the code.', v_module_code;
    END IF;

    SELECT s."Code", mn."Code"
    INTO   v_page_code, v_menu_code
    FROM   "NavigationSubmenus" s
    JOIN   "NavigationMenus" mn ON mn."Id" = s."NavigationMenuId"
    WHERE  s."Route" ILIKE '/security-permission/%/branch-assignment'
    AND    NOT s."IsDeleted"
    LIMIT  1;

    IF v_page_code IS NULL THEN
        RAISE EXCEPTION 'Branch Assignment page not found by route - nothing changed.';
    END IF;

    SELECT "ConfigurationName"
    INTO   v_used_name
    FROM   "SystemConfigurations"
    WHERE  "ConfigurationCode" = 'CFG-MOD-006-0101';

    IF v_used_name IS NOT NULL THEN
        IF v_used_name <> 'Allow Branch Switch Without Re-login' THEN
            RAISE EXCEPTION 'CFG-MOD-006-0101 is already used by "%" - nothing changed. Tell Claude.', v_used_name;
        END IF;

        RAISE NOTICE 'Allow Branch Switch Without Re-login already exists - left as it is.';
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
        'CFG-MOD-006-0101', 'Allow Branch Switch Without Re-login',
        'A user assigned to two or more active branches can move the session to another of them from the user menu (Switch Branch). Same session end; every switch is kept in history.',
        'No switching : the user logs out and logs in to the other branch.',
        true, '',
        'None', '', NULL, NULL, '',
        true, '', NULL,
        false, true, 1, 'Branch Assignment page. User menu > Switch Branch.',
        false, 1, now()
    );

    RAISE NOTICE 'Allow Branch Switch Without Re-login added on % (%).', v_page_code, v_menu_code;
END $$;

SELECT "NavigationSubmenuCode" AS "Page", "ConfigurationCode", "ConfigurationName", "IsEnabled"
FROM   "SystemConfigurations"
WHERE  "ConfigurationCode" = 'CFG-MOD-006-0101';
