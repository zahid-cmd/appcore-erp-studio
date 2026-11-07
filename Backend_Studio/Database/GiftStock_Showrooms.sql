/*===============================================================
  Gift stock at showrooms (Bike Accessory Schemes, step 4)

  1. BusinessConfigurations."Scope" : Full (default) / Gifts Only.
     Gifts Only is for the Accessories line : the branch may hold
     and transfer Accessories stock to give with bikes; every
     other page treats it as NOT running Accessories (no counter
     sale, purchase, receiving, opening stock).

  2. System Configuration master switch on the Product Transfer
     page : "Gift Stock at Showrooms" (ON by default).
       ON  : Product Transfer - AC also lists the warehouses of
             branches with a Gifts Only grant (any accessory) and
             of branches running Motor Bikes (free accessories
             only : Additional / Promotional Accessories).
       OFF : the strict rule only (Accessories line).
     Code : the next free CFG-MOD-<inventory module>-nnnn. A switch
     with this name that already exists is left as it is.

  Safe to run more than once. ASCII only. Run the whole script.
===============================================================*/

BEGIN;

-- 1. Scope -------------------------------------------------------

ALTER TABLE "BusinessConfigurations"
    ADD COLUMN IF NOT EXISTS "Scope" varchar(20) NOT NULL DEFAULT 'Full';

ALTER TABLE "BusinessConfigurations"
    DROP CONSTRAINT IF EXISTS "CK_BusinessConfigurations_Scope";

ALTER TABLE "BusinessConfigurations"
    ADD CONSTRAINT "CK_BusinessConfigurations_Scope"
        CHECK ("Scope" = 'Full' OR ("Scope" = 'Gifts Only' AND "BusinessLine" = 'Accessories'));


-- 2. Switch ------------------------------------------------------

DO $$
DECLARE
    v_module_id   bigint;
    v_module_code text;
    v_menu_code   text;
    v_page_code   text;
    v_prefix      text;
    v_next        integer;
BEGIN
    IF EXISTS
    (
        SELECT 1 FROM "SystemConfigurations"
        WHERE "ConfigurationName" = 'Gift Stock at Showrooms' AND NOT "IsDeleted"
    )
    THEN
        RAISE NOTICE 'Gift Stock at Showrooms : already there, left as it is.';
        RETURN;
    END IF;

    SELECT s."Code", mn."Code", m."Id", m."Code"
    INTO   v_page_code, v_menu_code, v_module_id, v_module_code
    FROM   "NavigationSubmenus" s
    JOIN   "NavigationMenus" mn ON mn."Id" = s."NavigationMenuId"
    JOIN   "NavigationModules" m ON m."Id" = mn."NavigationModuleId"
    WHERE  s."Route" ILIKE '/inventory-management/%/product-transfer'
    AND    NOT s."IsDeleted"
    LIMIT  1;

    IF v_page_code IS NULL THEN
        RAISE EXCEPTION 'Product Transfer page not found by route (/inventory-management/.../product-transfer) - nothing changed.';
    END IF;

    v_prefix := 'CFG-' || upper(trim(v_module_code)) || '-';

    SELECT COALESCE(max(substring("ConfigurationCode" FROM length(v_prefix) + 1)::integer), 0) + 1
    INTO   v_next
    FROM   "SystemConfigurations"
    WHERE  "ConfigurationCode" LIKE v_prefix || '____'
    AND    substring("ConfigurationCode" FROM length(v_prefix) + 1) ~ '^[0-9]{4}$';

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
        v_prefix || lpad(v_next::text, 4, '0'),
        'Gift Stock at Showrooms',
        'Accessories may be transferred to showrooms to give with bikes : branches with a Gifts Only Accessories grant take any accessory, branches running Motor Bikes take free accessories (Additional / Promotional). They still cannot sell accessories over the counter.',
        'Accessories are transferred only between branches running the Accessories line.',
        true, '',
        'None', '', NULL, NULL, '',
        true, '', NULL,
        true, true, 70, 'Critical : Bike Accessory Schemes (gift stock). Business Configuration sets Gifts Only per branch.',
        false, 1, now()
    );

    RAISE NOTICE 'Gift Stock at Showrooms : added as %.', v_prefix || lpad(v_next::text, 4, '0');
END $$;

COMMIT;


-- Check
SELECT "BranchId", "BusinessLine", "AccessType", "Scope", "IsActive"
FROM "BusinessConfigurations"
WHERE NOT "IsDeleted"
ORDER BY "BranchId", "BusinessLine";

SELECT "ConfigurationCode", "ConfigurationName", "IsEnabled"
FROM "SystemConfigurations"
WHERE "ConfigurationName" = 'Gift Stock at Showrooms';
