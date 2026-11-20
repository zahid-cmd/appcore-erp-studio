ROLLBACK;

-- =====================================================================
-- ModuleConfiguration_Navigation.sql   (2026-11-20)
-- ---------------------------------------------------------------------
-- Blueprint : claude\blueprint-module-setup-rearrangement.md (steps 1-2)
-- Owner 2026-11-20 : "every module will get its own switches under
-- module config page ... for all, even they now have no or a single
-- switch".
--
-- For each module below :
--   1. its setup menu, made only when the module has none yet
--      (placed first in the module);
--   2. one page "<Module> Configuration" as the last page of that
--      menu :   /<module>/<setup menu>/configuration
--
-- The page is the System Configurations page locked to the module
-- (hand-written route : NEVER run Menu / Submenu / Code Sync for it).
-- No switch is touched : a switch already knows its module.
-- Settings > General Settings > System Configurations stays as it is.
--
-- Not in this script : EMI Management and Reports (no pages of their
-- own in the application yet), Infrastructure Control (AppCore only).
--
-- Rows that already exist are skipped : safe to run again.
-- A module that is not in this database is skipped with a notice.
--
-- Run on EACH database that has the ERP navigation :
--     AppCoreERP_Studio, AppCoreTpl_TW, AppCore_TW_DEMO
-- Query Tool on that database, the whole file (F5), then read the
-- Messages tab and the result grid.
--
-- AFTER : Security & Permission > Activity Assignment : tick View on
-- the new Configuration pages for the roles that may open them, then
-- log in again. (What a user may CHANGE there is unchanged : Manage
-- Configurations on System Configurations = everything; Change
-- Configuration on a page = that page's switches.)
-- ASCII only.
-- =====================================================================

DO $$
DECLARE
    r           record;
    v_module    record;
    v_menu      record;
    v_seq       int;
    v_order     int;
    v_code      text;
    v_sub_code  text;
BEGIN
    FOR r IN
        SELECT *
        FROM (VALUES
            -- module route key,            menu route key,         menu name,              page name
            ('settings',                   'general-settings',     'General Settings',     'Settings Configuration'),
            ('accounts-finance',           'accounts-setup',       'Accounts Setup',       'Accounts Configuration'),
            ('human-resource-manangement', 'human-resource-setup', 'Human Resource Setup', 'Human Resource Configuration'),
            ('security-permission',        'security-setup',       'Security Setup',       'Security Configuration'),
            ('procurement',                'procurement-setup',    'Procurement Setup',    'Procurement Configuration'),
            ('sales-operations',           'sales-setup',          'Sales Setup',          'Sales Configuration'),
            ('membership-management',      'membership-setup',     'Membership Setup',     'Membership Configuration'),
            ('enquiry-management',         'enquiry-setup',        'Enquiry Setup',        'Enquiry Configuration'),
            ('registration-management',    'registration-setup',   'Registration Setup',   'Registration Configuration'),
            ('inventory-management',       'store-setup',          'Store Setup',          'Inventory Configuration'),
            ('vat-management',             'vat-setup',            'VAT Setup',            'VAT Configuration'),
            ('service-operations',         'service-setup',        'Service Setup',        'Service Configuration'),
            ('warranty-management',        'warranty-setup',       'Warranty Setup',       'Warranty Configuration'),
            ('fixed-assets-management',    'asset-setup',          'Asset Setup',          'Fixed Assets Configuration'),
            ('accessories-operations',     'accessories-setup',    'Accessories Setup',    'Accessories Configuration')
        ) AS t(module_key, menu_key, menu_name, page_name)
    LOOP
        -- ---------- the module ----------
        v_module := NULL;

        SELECT "Id", "SequenceNo", "RouteKey", "Name" INTO v_module
        FROM   "NavigationModules"
        WHERE  lower(trim("RouteKey")) = r.module_key AND "IsDeleted" = false
        ORDER  BY "Id" LIMIT 1;

        IF v_module."Id" IS NULL THEN
            RAISE NOTICE 'Module % is not in this database : skipped.', r.module_key;
            CONTINUE;
        END IF;

        -- ---------- 1. the setup menu ----------
        v_menu := NULL;

        SELECT "Id", "SequenceNo", "RouteKey", "Code", "Name" INTO v_menu
        FROM   "NavigationMenus"
        WHERE  "NavigationModuleId" = v_module."Id"
        AND    lower(trim("RouteKey")) = r.menu_key
        AND    "IsDeleted" = false
        ORDER  BY "Id" LIMIT 1;

        IF v_menu."Id" IS NULL THEN
            IF EXISTS (SELECT 1 FROM "NavigationMenus"
                       WHERE "NavigationModuleId" = v_module."Id"
                       AND   lower(trim("RouteKey")) = r.menu_key) THEN
                RAISE NOTICE '% : a deleted menu % exists : skipped (restore it first).', v_module."Name", r.menu_key;
                CONTINUE;
            END IF;

            SELECT COALESCE(MAX("SequenceNo"), 0) + 1 INTO v_seq
            FROM   "NavigationMenus"
            WHERE  "NavigationModuleId" = v_module."Id";

            -- first in the module, like the setup menus that exist
            SELECT COALESCE(MIN("DisplayOrder"), 1) - 1 INTO v_order
            FROM   "NavigationMenus"
            WHERE  "NavigationModuleId" = v_module."Id";

            v_code := 'MNU-' || lpad(v_module."SequenceNo"::text, 3, '0')
                             || '-' || lpad(v_seq::text, 3, '0');

            IF EXISTS (SELECT 1 FROM "NavigationMenus" WHERE "Code" = v_code) THEN
                RAISE EXCEPTION 'Menu code % is already used - nothing changed.', v_code;
            END IF;

            INSERT INTO "NavigationMenus"
                ("NavigationModuleId", "SequenceNo", "Code", "Name", "Icon",
                 "RouteKey", "Route", "DisplayOrder", "Remarks",
                 "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
            VALUES
                (v_module."Id", v_seq, v_code, r.menu_name, 'fa-solid fa-gears',
                 r.menu_key, '/' || v_module."RouteKey" || '/' || r.menu_key,
                 v_order, 'Setup and configuration of this module.',
                 true, false, 1, now());

            SELECT "Id", "SequenceNo", "RouteKey", "Code", "Name" INTO v_menu
            FROM   "NavigationMenus"
            WHERE  "Code" = v_code;

            RAISE NOTICE '% : menu created : % %', v_module."Name", v_code, r.menu_name;
        END IF;

        -- ---------- 2. the Configuration page ----------
        v_sub_code := NULL;

        SELECT "Code" INTO v_sub_code
        FROM   "NavigationSubmenus"
        WHERE  "NavigationMenuId" = v_menu."Id"
        AND    lower(trim("RouteKey")) = 'configuration'
        ORDER  BY "Id" LIMIT 1;

        IF v_sub_code IS NOT NULL THEN
            RAISE NOTICE '% : page exists, skipped : % %', v_module."Name", v_sub_code, r.page_name;
            CONTINUE;
        END IF;

        SELECT COALESCE(MAX("SequenceNo"), 0) + 1 INTO v_seq
        FROM   "NavigationSubmenus"
        WHERE  "NavigationMenuId" = v_menu."Id";

        -- last page of the menu
        SELECT COALESCE(MAX("DisplayOrder"), 0) + 1 INTO v_order
        FROM   "NavigationSubmenus"
        WHERE  "NavigationMenuId" = v_menu."Id";

        v_sub_code := 'SUB-' || lpad(v_module."SequenceNo"::text, 3, '0')
                             || '-' || lpad(v_menu."SequenceNo"::text, 3, '0')
                             || '-' || lpad(v_seq::text, 3, '0');

        IF EXISTS (SELECT 1 FROM "NavigationSubmenus" WHERE "Code" = v_sub_code) THEN
            RAISE EXCEPTION 'Page code % is already used - nothing changed.', v_sub_code;
        END IF;

        INSERT INTO "NavigationSubmenus"
            ("NavigationMenuId", "SequenceNo", "Code", "Name", "Icon",
             "RouteKey", "Route", "DisplayOrder", "Remarks",
             "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        VALUES
            (v_menu."Id", v_seq, v_sub_code, r.page_name, 'fa-solid fa-sliders',
             'configuration',
             '/' || v_module."RouteKey" || '/' || v_menu."RouteKey" || '/configuration',
             v_order, 'The switches of this module.',
             true, false, 1, now());

        RAISE NOTICE '% : page created : % %', v_module."Name", v_sub_code, r.page_name;
    END LOOP;
END
$$;

-- ---------------------------------------------------------------------
-- Check : one row per module that now has its Configuration page
-- ---------------------------------------------------------------------
SELECT m."Name"        AS "Module",
       n."Code"        AS "Menu Code",
       n."Name"        AS "Menu",
       n."DisplayOrder" AS "Menu Order",
       s."Code"        AS "Page Code",
       s."Name"        AS "Page",
       s."Route"
FROM   "NavigationSubmenus" s
JOIN   "NavigationMenus"   n ON n."Id" = s."NavigationMenuId"
JOIN   "NavigationModules" m ON m."Id" = n."NavigationModuleId"
WHERE  lower(trim(s."RouteKey")) = 'configuration'
AND    s."IsDeleted" = false
ORDER  BY m."DisplayOrder";
