/*===============================================================
  Procurement : "Allow Order Above Max Stock Level"
  One switch per page (Procurement MOD-007), critical, OFF :

      CFG-MOD-007-0080  Purchase Orders - MB
      CFG-MOD-007-0081  Purchase Orders - SP
      CFG-MOD-007-0082  Purchase Orders - AC
      CFG-MOD-007-0083  Purchases - MB   (direct lines only)
      CFG-MOD-007-0084  Purchases - SP   (direct lines only)
      CFG-MOD-007-0085  Purchases - AC   (direct lines only)

  OFF : Max Stock Level is a hard cap (as before).
  ON  : a line may go above Max; the page shows a warning and
        the line is marked "Over Max by N".

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
    n             integer := 0;
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
        WHERE  c."ConfigurationCode" BETWEEN 'CFG-MOD-007-0080' AND 'CFG-MOD-007-0085'
        AND    c."ConfigurationName" <> 'Allow Order Above Max Stock Level'
    )
    THEN
        RAISE EXCEPTION 'Some of CFG-MOD-007-0080 .. 0085 are already used by other switches - nothing changed. Tell Claude.';
    END IF;

    FOR v_page IN
        SELECT *
        FROM
        (
            VALUES
            ('purchase-orders-mb', 80, 'order'),
            ('purchase-orders-sp', 81, 'order'),
            ('purchase-orders-ac', 82, 'order'),
            ('purchases-mb',       83, 'purchase'),
            ('purchases-sp',       84, 'purchase'),
            ('purchases-ac',       85, 'purchase')
        ) AS p (route, no, kind)
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
            'CFG-MOD-007-' || lpad(v_page.no::text, 4, '0'),
            'Allow Order Above Max Stock Level',
            CASE WHEN v_page.kind = 'order'
                 THEN 'A purchase order line may take stock above the item''s Max Stock Level : a warning shows and the line is marked "Over Max by N".'
                 ELSE 'A direct purchase line (no PO) may take stock above the item''s Max Stock Level : a warning shows and the line is marked "Over Max by N".'
            END,
            'Max Stock Level is a hard cap : stock + on order + the line may not go above it.',
            false, '',
            'None', '', NULL, NULL, '',
            false, '', NULL,
            true, true, 60, 'Critical : changing it needs a reason / approval. Items without a Max Stock Level (0) are never capped.',
            false, 1, now()
        WHERE NOT EXISTS
        (
            SELECT 1
            FROM   "SystemConfigurations" c
            WHERE  c."ConfigurationCode" = 'CFG-MOD-007-' || lpad(v_page.no::text, 4, '0')
        );

        n := n + (SELECT CASE WHEN FOUND THEN 1 ELSE 0 END);
    END LOOP;

    RAISE NOTICE 'Allow Order Above Max Stock Level : done (% pages checked).', 6;
END $$;

-- Check
SELECT "ConfigurationCode", "ConfigurationName", "IsEnabled", "IsCritical", "NavigationSubmenuCode"
FROM   "SystemConfigurations"
WHERE  "ConfigurationCode" BETWEEN 'CFG-MOD-007-0080' AND 'CFG-MOD-007-0085'
ORDER  BY "ConfigurationCode";
