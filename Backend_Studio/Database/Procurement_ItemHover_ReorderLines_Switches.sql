/*===============================================================
  Procurement : two switches per page (Procurement MOD-007), ON

  "Show Items on Hover" (list : resting the mouse on a row shows
  its items on a card - motor bikes per model - qty and amount)

      CFG-MOD-007-0086  Purchase Orders - MB
      CFG-MOD-007-0087  Purchase Orders - SP
      CFG-MOD-007-0088  Purchase Orders - AC
      CFG-MOD-007-0089  Purchases - MB
      CFG-MOD-007-0090  Purchases - SP
      CFG-MOD-007-0091  Purchases - AC

  "Reorder Lines" (Add / Edit form : Up / Down buttons move a
  line; the saved line order follows)

      CFG-MOD-007-0092  Purchase Orders - MB
      CFG-MOD-007-0093  Purchase Orders - SP
      CFG-MOD-007-0094  Purchase Orders - AC
      CFG-MOD-007-0095  Purchases - MB
      CFG-MOD-007-0096  Purchases - SP
      CFG-MOD-007-0097  Purchases - AC

  A switch that already exists is left as it is. A code used by
  another switch stops the script (nothing changed).
  Safe to run more than once. Run the whole script (F5).
===============================================================*/

DO $$
DECLARE
    v_module_id   bigint;
    v_module_code text;
    v_menu_code   text;
    v_page_code   text;
    v_page        record;
BEGIN
    SELECT m."Id", m."Code"
    INTO   v_module_id, v_module_code
    FROM   "NavigationModules" m
    WHERE  lower(trim(m."Name")) = 'procurement'
    AND    NOT m."IsDeleted"
    LIMIT  1;

    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Procurement module not found - nothing changed.';
    END IF;

    IF upper(trim(v_module_code)) <> 'MOD-007' THEN
        RAISE EXCEPTION 'Procurement module code is % (expected MOD-007) - nothing changed.', v_module_code;
    END IF;

    IF EXISTS
    (
        SELECT 1
        FROM   "SystemConfigurations" c
        WHERE
        (
            c."ConfigurationCode" BETWEEN 'CFG-MOD-007-0086' AND 'CFG-MOD-007-0091'
            AND c."ConfigurationName" <> 'Show Items on Hover'
        )
        OR
        (
            c."ConfigurationCode" BETWEEN 'CFG-MOD-007-0092' AND 'CFG-MOD-007-0097'
            AND c."ConfigurationName" <> 'Reorder Lines'
        )
    )
    THEN
        RAISE EXCEPTION 'Some of CFG-MOD-007-0086 .. 0097 are already used by other switches - nothing changed. Tell Claude.';
    END IF;

    FOR v_page IN
        SELECT *
        FROM
        (
            VALUES
            ('purchase-orders-mb', 86, 92, 'purchase order'),
            ('purchase-orders-sp', 87, 93, 'purchase order'),
            ('purchase-orders-ac', 88, 94, 'purchase order'),
            ('purchases-mb',       89, 95, 'purchase'),
            ('purchases-sp',       90, 96, 'purchase'),
            ('purchases-ac',       91, 97, 'purchase')
        ) AS p (route, hover_no, reorder_no, word)
    LOOP
        v_page_code := NULL;
        v_menu_code := NULL;

        SELECT s."Code", mn."Code"
        INTO   v_page_code, v_menu_code
        FROM   "NavigationSubmenus" s
        JOIN   "NavigationMenus" mn ON mn."Id" = s."NavigationMenuId"
        WHERE  s."Route" ILIKE '/procurement/%/' || v_page.route
        AND    NOT s."IsDeleted"
        LIMIT  1;

        IF v_page_code IS NULL THEN
            RAISE EXCEPTION 'Page not found by route (/procurement/.../%) - nothing changed.', v_page.route;
        END IF;

        -- Show Items on Hover
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
            'CFG-MOD-007-' || lpad(v_page.hover_no::text, 4, '0'),
            'Show Items on Hover',
            'Resting the mouse on a ' || v_page.word || ' in the list shows its items on a card (motor bikes per model, not per colour) with quantity and amount.',
            'No item card on the list.',
            true, '',
            'None', '', NULL, NULL, '',
            true, '', NULL,
            false, true, 61, 'List display only; nothing is saved.',
            false, 1, now()
        WHERE NOT EXISTS
        (
            SELECT 1
            FROM   "SystemConfigurations" c
            WHERE  c."ConfigurationCode" = 'CFG-MOD-007-' || lpad(v_page.hover_no::text, 4, '0')
        );

        -- Reorder Lines
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
            'CFG-MOD-007-' || lpad(v_page.reorder_no::text, 4, '0'),
            'Reorder Lines',
            'In the add / edit form every line has Up / Down buttons; the ' || v_page.word || ' is saved in the order shown.',
            'Lines stay in the order they were added.',
            true, '',
            'None', '', NULL, NULL, '',
            true, '', NULL,
            false, true, 62, 'Only the line order (Line No) changes; amounts are not affected.',
            false, 1, now()
        WHERE NOT EXISTS
        (
            SELECT 1
            FROM   "SystemConfigurations" c
            WHERE  c."ConfigurationCode" = 'CFG-MOD-007-' || lpad(v_page.reorder_no::text, 4, '0')
        );
    END LOOP;

    RAISE NOTICE 'Show Items on Hover / Reorder Lines : done (6 pages checked).';
END $$;

-- Check
SELECT "ConfigurationCode", "ConfigurationName", "IsEnabled", "NavigationSubmenuCode"
FROM   "SystemConfigurations"
WHERE  "ConfigurationCode" BETWEEN 'CFG-MOD-007-0086' AND 'CFG-MOD-007-0097'
ORDER  BY "ConfigurationCode";
