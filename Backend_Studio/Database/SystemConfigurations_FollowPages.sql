ROLLBACK;

-- =====================================================================
-- SystemConfigurations_FollowPages.sql   (2026-11-20)
-- ---------------------------------------------------------------------
-- Blueprint : claude\blueprint-module-isolation.md (Sales / Service /
-- Accessories)
--
-- Every switch that belongs to a PAGE is listed on the Configuration
-- page of the module that page is in TODAY.
--
-- Why : the spare parts and accessories invoices, bookings and
-- promotions moved from Sales Operations to Service Operations and
-- Accessories Operations. A switch of theirs that still says "Sales
-- Operations" could not be changed any more by a company whose Sales
-- Operations is switched off.
--
-- Only the module (and menu code) written on the switch changes.
-- The switch code (CFG-MOD-008-....), its value and its history stay
-- exactly as they are : the program reads a switch by its code.
-- Switches not tied to a page are not touched.
--
-- Run on EACH database that has the ERP navigation :
--     AppCoreERP_Studio, AppCoreTpl_TW, AppCore_TW_DEMO
-- Query Tool on that database, the whole file (F5). Read the Messages
-- tab, then run COMMIT; (or ROLLBACK;).
-- Safe to run again ("0 switch(es) changed").
-- ASCII only.
-- =====================================================================

BEGIN;

DO $$
DECLARE
    r   record;
    n   int := 0;
BEGIN
    FOR r IN
        SELECT c."SystemConfigurationId" AS id,
               c."ConfigurationCode"     AS code,
               c."ConfigurationName"     AS name,
               old."Name"                AS old_module,
               m."Name"                  AS new_module,
               m."Id"                    AS new_module_id,
               mn."Code"                 AS new_menu_code
        FROM   "SystemConfigurations" c
        JOIN   "NavigationSubmenus" s  ON s."Code" = c."NavigationSubmenuCode" AND s."IsDeleted" = false
        JOIN   "NavigationMenus"    mn ON mn."Id" = s."NavigationMenuId"
        JOIN   "NavigationModules"  m  ON m."Id" = mn."NavigationModuleId"
        LEFT   JOIN "NavigationModules" old ON old."Id" = c."NavigationModuleId"
        WHERE  COALESCE(c."NavigationSubmenuCode", '') <> ''
        AND    (c."NavigationModuleId" <> m."Id"
                OR COALESCE(c."NavigationMenuCode", '') <> mn."Code")
        ORDER  BY c."ConfigurationCode"
    LOOP
        UPDATE "SystemConfigurations"
        SET    "NavigationModuleId" = r.new_module_id,
               "NavigationMenuCode" = r.new_menu_code
        WHERE  "SystemConfigurationId" = r.id;

        n := n + 1;

        RAISE NOTICE '%  %  : % -> %', r.code, rpad(left(r.name, 44), 44), COALESCE(r.old_module, '?'), r.new_module;
    END LOOP;

    RAISE NOTICE '% switch(es) changed.', n;
    RAISE NOTICE 'Done. Check the lines above, then run COMMIT; (or ROLLBACK;).';
END $$;


-- Run one of these by hand :
-- COMMIT;
-- ROLLBACK;
