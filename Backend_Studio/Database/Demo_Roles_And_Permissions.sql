ROLLBACK;

-- =====================================================================
-- Demo_Roles_And_Permissions.sql   (2026-11-20)
-- ---------------------------------------------------------------------
-- Owner 2026-11-20 : "replace all with the required ... with admin who
-- will get full access. by sql with permission".
--
-- ONLY for AppCore_TW_DEMO (it stops on any other database).
--
--   RP-001  AppCore Admin   every page and every activity (all modules
--                           except Infrastructure Control)
--   RP-002  Demo Manager    (was Super Administrator)   all business
--                           modules + Client Settings, delete included
--   RP-003  Demo Sales      (was Chief Administrator)   showroom and
--                           accessory shop work, no delete; stock
--                           view only
--   RP-004  Demo Service    (was Operation Manager)     service center
--                           work, no delete; stock view only
--   RP-005  Demo Accounts   (new)                        accounts, VAT,
--                           purchases, HR, fixed assets; no delete
--
-- No demo role gets Security & Permission or Settings (only Client
-- Settings : Customer / Supplier Profiles). Each role's permissions
-- are rebuilt from scratch from the pages and activities in this
-- database (Common activities on every page, Page activities where
-- linked), so running it again gives the same result.
--
-- Run the whole file (F5) on AppCore_TW_DEMO, read the Messages tab
-- (which modules each role got), then COMMIT; (or ROLLBACK;).
-- Users sign in again to see their new menus. ASCII only.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- A role profile by code : renamed / made when missing
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.role_of(p_code text, p_name text, p_order int, p_remarks text)
RETURNS bigint LANGUAGE plpgsql AS $f$
DECLARE
    v_id bigint;
BEGIN
    SELECT "RoleProfileId" INTO v_id FROM "RoleProfiles" WHERE "ProfileCode" = p_code;

    IF v_id IS NULL THEN
        INSERT INTO "RoleProfiles"
            ("ProfileCode", "ProfileName", "Remarks", "DisplayOrder",
             "IsSystemRole", "IsDeveloperRole", "IsDefaultRole",
             "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        VALUES
            (p_code, p_name, p_remarks, p_order, false, false, false, true, false, 1, now())
        RETURNING "RoleProfileId" INTO v_id;
    ELSIF p_code <> 'RP-001' THEN
        UPDATE "RoleProfiles"
        SET    "ProfileName" = p_name, "Remarks" = p_remarks, "DisplayOrder" = p_order,
               "IsSystemRole" = false, "IsDeveloperRole" = false, "IsDefaultRole" = false,
               "IsActive" = true, "IsDeleted" = false, "ModifiedBy" = 1, "ModifiedDate" = now()
        WHERE  "RoleProfileId" = v_id;
    END IF;

    RETURN v_id;
END $f$;


-- ---------------------------------------------------------------------
-- The role's activity assignment, emptied (rebuilt below)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.reset_assignment(p_role bigint)
RETURNS bigint LANGUAGE plpgsql AS $f$
DECLARE
    v_id bigint;
BEGIN
    SELECT "ActivityAssignmentId" INTO v_id FROM "ActivityAssignments" WHERE "RoleProfileId" = p_role;

    IF v_id IS NULL THEN
        INSERT INTO "ActivityAssignments" ("RoleProfileId", "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        VALUES (p_role, true, false, 1, now())
        RETURNING "ActivityAssignmentId" INTO v_id;
    ELSE
        UPDATE "ActivityAssignments"
        SET    "IsActive" = true, "IsDeleted" = false, "ModifiedBy" = 1, "ModifiedDate" = now()
        WHERE  "ActivityAssignmentId" = v_id;

        DELETE FROM "ActivityAssignmentPermissions"
        WHERE  "ActivityAssignmentDetailId" IN
               (SELECT "ActivityAssignmentDetailId" FROM "ActivityAssignmentDetails" WHERE "ActivityAssignmentId" = v_id);

        DELETE FROM "ActivityAssignmentDetails" WHERE "ActivityAssignmentId" = v_id;
    END IF;

    RETURN v_id;
END $f$;


-- ---------------------------------------------------------------------
-- Grant pages to an assignment.
--   p_modules : module route-key patterns (LIKE), NULL = every module
--   p_menus   : menu route-key patterns, NULL = every menu
--   p_pages   : page route-key patterns, NULL = every page
--   p_level   : 'full'      every activity
--               'no-delete' all but delete / restore / reset / purge
--               'view'      view / print / export / download / history
-- Infrastructure Control is never granted here.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.grant_pages(p_assignment bigint, p_modules text[], p_menus text[], p_pages text[], p_level text)
RETURNS int LANGUAGE plpgsql AS $f$
DECLARE
    v_page   record;
    v_detail bigint;
    n        int := 0;
BEGIN
    FOR v_page IN
        SELECT d."Id" AS module_id, m."Id" AS menu_id, s."Id" AS page_id, s."Code" AS page_code
        FROM   "NavigationSubmenus" s
        JOIN   "NavigationMenus"    m ON m."Id" = s."NavigationMenuId"
        JOIN   "NavigationModules"  d ON d."Id" = m."NavigationModuleId"
        WHERE  s."IsDeleted" = false AND s."IsActive"
        AND    m."IsDeleted" = false AND m."IsActive"
        AND    d."IsDeleted" = false AND d."IsActive"
        AND    lower(trim(d."RouteKey")) <> 'infrastructure-control'
        AND    (p_modules IS NULL OR lower(trim(d."RouteKey")) LIKE ANY (p_modules))
        AND    (p_menus   IS NULL OR lower(trim(m."RouteKey")) LIKE ANY (p_menus))
        AND    (p_pages   IS NULL OR lower(trim(s."RouteKey")) LIKE ANY (p_pages))
    LOOP
        SELECT "ActivityAssignmentDetailId" INTO v_detail
        FROM   "ActivityAssignmentDetails"
        WHERE  "ActivityAssignmentId" = p_assignment AND "SubMenuId" = v_page.page_id;

        IF v_detail IS NULL THEN
            INSERT INTO "ActivityAssignmentDetails"
                ("ActivityAssignmentId", "ModuleId", "MenuId", "SubMenuId", "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
            VALUES
                (p_assignment, v_page.module_id, v_page.menu_id, v_page.page_id, true, false, 1, now())
            RETURNING "ActivityAssignmentDetailId" INTO v_detail;

            n := n + 1;
        END IF;

        INSERT INTO "ActivityAssignmentPermissions"
            ("ActivityAssignmentDetailId", "MasterActivityId", "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        SELECT v_detail, a."Id", true, false, 1, now()
        FROM   "MasterActivities" a
        WHERE  a."IsDeleted" = false AND a."IsActive"
        AND   (   a."ActivityScope" = 'Common'
               OR EXISTS (SELECT 1 FROM "MasterActivityPages" p
                          WHERE p."MasterActivityCode" = a."Code" AND p."NavigationSubmenuCode" = v_page.page_code)
               OR (a."LinkToSwitchPages" AND EXISTS (SELECT 1 FROM "SystemConfigurations" c
                                                     WHERE c."NavigationSubmenuCode" = v_page.page_code)))
        AND   (   p_level = 'full'
               OR (p_level = 'no-delete' AND lower(a."Name") !~ '(delete|restore|reset|purge)')
               OR (p_level = 'view'      AND lower(a."Name") ~ '^(view|print|export|download|history|search|list)'))
        AND    NOT EXISTS (SELECT 1 FROM "ActivityAssignmentPermissions" x
                           WHERE x."ActivityAssignmentDetailId" = v_detail AND x."MasterActivityId" = a."Id");
    END LOOP;

    RETURN n;
END $f$;


-- ---------------------------------------------------------------------
-- What a role ended with (modules and page count)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.report(p_assignment bigint, p_name text)
RETURNS void LANGUAGE plpgsql AS $f$
DECLARE
    v_list text;
    v_pages int;
    v_perms int;
BEGIN
    SELECT string_agg(name || ' (' || cnt || ')', ', ' ORDER BY name), sum(cnt)
    INTO   v_list, v_pages
    FROM  (SELECT d."Name" AS name, count(*) AS cnt
           FROM   "ActivityAssignmentDetails" x
           JOIN   "NavigationModules" d ON d."Id" = x."ModuleId"
           WHERE  x."ActivityAssignmentId" = p_assignment
           GROUP  BY d."Name") q;

    SELECT count(*) INTO v_perms
    FROM   "ActivityAssignmentPermissions" p
    JOIN   "ActivityAssignmentDetails" x ON x."ActivityAssignmentDetailId" = p."ActivityAssignmentDetailId"
    WHERE  x."ActivityAssignmentId" = p_assignment;

    RAISE NOTICE '% : % page(s), % permission(s) : %', rpad(p_name, 14), COALESCE(v_pages, 0), v_perms, COALESCE(v_list, 'nothing');
END $f$;


DO $$
DECLARE
    a_admin    bigint;
    a_manager  bigint;
    a_sales    bigint;
    a_service  bigint;
    a_accounts bigint;
BEGIN
    IF current_database() <> 'AppCore_TW_DEMO' THEN
        RAISE EXCEPTION 'This script is only for AppCore_TW_DEMO (this is %). Nothing was changed.', current_database();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "RoleProfiles" WHERE "ProfileCode" = 'RP-001') THEN
        RAISE EXCEPTION 'Role RP-001 (AppCore Admin) not found. Nothing was changed.';
    END IF;

    -- roles ------------------------------------------------------------
    a_admin    := pg_temp.reset_assignment(pg_temp.role_of('RP-001', 'AppCore Admin', 1, NULL));
    a_manager  := pg_temp.reset_assignment(pg_temp.role_of('RP-002', 'Demo Manager', 2,
                  'Demo login demo.manager : every business module, delete included. No Security & Permission or Settings.'));
    a_sales    := pg_temp.reset_assignment(pg_temp.role_of('RP-003', 'Demo Sales', 3,
                  'Demo login demo.sales : showroom and accessory shop. No delete; stock view only.'));
    a_service  := pg_temp.reset_assignment(pg_temp.role_of('RP-004', 'Demo Service', 4,
                  'Demo login demo.service : service center. No delete; stock view only.'));
    a_accounts := pg_temp.reset_assignment(pg_temp.role_of('RP-005', 'Demo Accounts', 5,
                  'Demo login demo.accounts : accounts, VAT, purchases, HR, fixed assets. No delete.'));

    -- AppCore Admin : everything (Infrastructure Control excluded inside)
    PERFORM pg_temp.grant_pages(a_admin, NULL, NULL, NULL, 'full');

    -- Demo Manager : every module but Security & Permission and Settings,
    -- plus Client Settings
    PERFORM pg_temp.grant_pages(a_manager, NULL, NULL, NULL, 'full');
    DELETE FROM "ActivityAssignmentPermissions" WHERE "ActivityAssignmentDetailId" IN (
        SELECT x."ActivityAssignmentDetailId" FROM "ActivityAssignmentDetails" x
        JOIN "NavigationModules" d ON d."Id" = x."ModuleId"
        WHERE x."ActivityAssignmentId" = a_manager AND lower(trim(d."RouteKey")) IN ('security-permission', 'settings'));
    DELETE FROM "ActivityAssignmentDetails" x USING "NavigationModules" d
    WHERE  d."Id" = x."ModuleId" AND x."ActivityAssignmentId" = a_manager
    AND    lower(trim(d."RouteKey")) IN ('security-permission', 'settings');
    PERFORM pg_temp.grant_pages(a_manager, ARRAY['settings'], ARRAY['client-settings'], NULL, 'full');

    -- Demo Sales
    PERFORM pg_temp.grant_pages(a_sales,
        ARRAY['sales-operations', 'accessories-operations', 'registration%', 'membership%', 'enquiry%', 'warranty%', 'emi%'],
        NULL, NULL, 'no-delete');
    PERFORM pg_temp.grant_pages(a_sales, ARRAY['settings'], ARRAY['client-settings'], ARRAY['customer-profile%'], 'no-delete');
    PERFORM pg_temp.grant_pages(a_sales, ARRAY['inventory%'], NULL, NULL, 'view');

    -- Demo Service
    PERFORM pg_temp.grant_pages(a_service,
        ARRAY['service-operations', 'warranty%', 'membership%'],
        NULL, NULL, 'no-delete');
    PERFORM pg_temp.grant_pages(a_service, ARRAY['settings'], ARRAY['client-settings'], ARRAY['customer-profile%'], 'no-delete');
    PERFORM pg_temp.grant_pages(a_service, ARRAY['inventory%'], NULL, NULL, 'view');

    -- Demo Accounts
    PERFORM pg_temp.grant_pages(a_accounts,
        ARRAY['accounts%', 'vat%', 'procurement%', 'human%', 'fixed%'],
        NULL, NULL, 'no-delete');
    PERFORM pg_temp.grant_pages(a_accounts, ARRAY['settings'], ARRAY['client-settings'], NULL, 'no-delete');
    PERFORM pg_temp.grant_pages(a_accounts, ARRAY['inventory%'], NULL, NULL, 'view');

    -- report -----------------------------------------------------------
    PERFORM pg_temp.report(a_admin,    'AppCore Admin');
    PERFORM pg_temp.report(a_manager,  'Demo Manager');
    PERFORM pg_temp.report(a_sales,    'Demo Sales');
    PERFORM pg_temp.report(a_service,  'Demo Service');
    PERFORM pg_temp.report(a_accounts, 'Demo Accounts');

    RAISE NOTICE 'Done. Check the lines above, then run COMMIT; (or ROLLBACK;).';
END $$;

-- Run one of these by hand :
-- COMMIT;
-- ROLLBACK;
