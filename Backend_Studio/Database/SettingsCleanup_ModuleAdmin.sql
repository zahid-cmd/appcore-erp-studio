ROLLBACK;

-- =====================================================================
-- SettingsCleanup_ModuleAdmin.sql   (2026-11-20)
-- ---------------------------------------------------------------------
-- Blueprint : claude\blueprint-module-setup-rearrangement.md (step 5)
-- Owner 2026-11-20 : per-module admin.
--
-- 1. The all-modules page moves :
--        Settings > General Settings > System Configurations
--     -> Infrastructure Control > Navigation Management
--    (AppCore staff only; the only place to add / edit / delete a
--    switch). The page keeps its Id, name and route key; its menu,
--    number, code and route change and every table that keeps those
--    follows.
--
-- 2. "Manage Configurations" (ACT-0006) can be ticked on every
--    module's Configuration page : whoever has it there is the admin
--    of that module's switches (changes all of them, approves its
--    requests).
--
-- 3. Nobody loses a right : every role and every user that has
--    Manage Configurations on System Configurations today gets View +
--    Manage Configurations on ALL the module Configuration pages.
--    Untick the modules a role should not manage afterwards, in
--    Activity Assignment.
--
-- BEFORE : ModuleConfiguration_Navigation.sql must have been run on
-- this database (it makes the Configuration pages).
--
-- Run on EACH database that has the ERP navigation :
--     AppCoreERP_Studio, AppCoreTpl_TW, AppCore_TW_DEMO
-- Query Tool on that database, the whole file (F5). Read the Messages
-- tab, then run COMMIT; (or ROLLBACK;). Restart the API with the new
-- code and log in again.
-- Safe to run again.
-- Do NOT run Module / Menu / Submenu / Code Sync for these pages.
-- ASCII only.
-- =====================================================================

BEGIN;

DO $$
DECLARE
    v_module    record;   -- Infrastructure Control
    v_menu      record;   -- Navigation Management
    v_page      record;   -- System Configurations
    v_cfg       record;   -- a module's Configuration page
    v_old_code  text;
    v_new_code  text;
    v_seq       int;
    v_order     int;
    v_manage    bigint;   -- MasterActivities.Id of ACT-0006
    v_view      bigint;   -- MasterActivities.Id of View
    v_pages     int := 0;
    v_cols      text;
    v_vals      text;
    t           text;
    k           text;     -- Activity / Special
    n           bigint;
    v_details   bigint := 0;
    v_perms     bigint := 0;
BEGIN
    -- ---------------------------------------------------------------
    -- 0. What must exist
    -- ---------------------------------------------------------------
    SELECT "Id" INTO v_manage FROM "MasterActivities"
    WHERE  "Code" = 'ACT-0006' AND "IsDeleted" = false LIMIT 1;

    IF v_manage IS NULL THEN
        RAISE EXCEPTION 'Activity ACT-0006 (Manage Configurations) not found - nothing was changed.';
    END IF;

    SELECT "Id" INTO v_view FROM "MasterActivities"
    WHERE  lower(trim("Name")) = 'view' AND "IsDeleted" = false
    ORDER  BY "Id" LIMIT 1;

    SELECT s."Id", s."Code", s."Name", s."NavigationMenuId" INTO v_page
    FROM   "NavigationSubmenus" s
    WHERE  lower(trim(s."RouteKey")) = 'system-configurations' AND s."IsDeleted" = false
    ORDER  BY s."Id" LIMIT 1;

    IF v_page."Id" IS NULL THEN
        RAISE EXCEPTION 'Page System Configurations (route key system-configurations) not found - nothing was changed.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "NavigationSubmenus"
                   WHERE lower(trim("RouteKey")) = 'configuration' AND "IsDeleted" = false) THEN
        RAISE EXCEPTION 'No module Configuration page found. Run ModuleConfiguration_Navigation.sql first - nothing was changed.';
    END IF;

    -- ---------------------------------------------------------------
    -- 1. Move the all-modules page to Infrastructure Control
    -- ---------------------------------------------------------------
    SELECT "Id", "Code", "Name", "RouteKey" INTO v_module
    FROM   "NavigationModules"
    WHERE  lower(trim("RouteKey")) = 'infrastructure-control' AND "IsDeleted" = false
    ORDER  BY "Id" LIMIT 1;

    IF v_module."Id" IS NOT NULL THEN
        SELECT "Id", "Code", "Name", "RouteKey" INTO v_menu
        FROM   "NavigationMenus"
        WHERE  "NavigationModuleId" = v_module."Id"
        AND    lower(trim("RouteKey")) = 'navigation-management'
        AND    "IsDeleted" = false
        ORDER  BY "Id" LIMIT 1;
    END IF;

    IF v_module."Id" IS NULL OR v_menu."Id" IS NULL THEN
        RAISE NOTICE 'Infrastructure Control > Navigation Management is not in this database : the page System Configurations stays where it is.';
    ELSIF v_page."NavigationMenuId" = v_menu."Id" THEN
        RAISE NOTICE 'System Configurations is already under Navigation Management (%).', v_page."Code";
    ELSE
        v_old_code := v_page."Code";

        SELECT COALESCE(MAX("SequenceNo"), 0) + 1, COALESCE(MAX("DisplayOrder"), 0) + 1
        INTO   v_seq, v_order
        FROM   "NavigationSubmenus"
        WHERE  "NavigationMenuId" = v_menu."Id";

        v_new_code := 'SUB-' || substr(v_menu."Code", 5) || '-' || lpad(v_seq::text, 3, '0');

        IF EXISTS (SELECT 1 FROM "NavigationSubmenus" WHERE "Code" = v_new_code AND "Id" <> v_page."Id") THEN
            RAISE EXCEPTION 'Page code % is already used. Tell Claude - nothing was changed.', v_new_code;
        END IF;

        UPDATE "NavigationSubmenus"
        SET    "NavigationMenuId" = v_menu."Id",
               "SequenceNo"       = v_seq,
               "Code"             = v_new_code,
               "Route"            = '/' || v_module."RouteKey" || '/' || v_menu."RouteKey" || '/system-configurations',
               "DisplayOrder"     = v_order
        WHERE  "Id" = v_page."Id";

        FOREACH t IN ARRAY ARRAY['INF_SubmenuSynchronization', 'CodeSynchronizations']
        LOOP
            IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
                EXECUTE format(
                    'UPDATE public.%I
                     SET    "SubmenuCode" = $1,
                            "ModuleId" = $2, "ModuleCode" = $3, "ModuleName" = $4,
                            "MenuId" = $5, "MenuCode" = $6, "MenuName" = $7
                     WHERE  "SubmenuId" = $8', t)
                USING v_new_code, v_module."Id", v_module."Code", v_module."Name",
                      v_menu."Id", v_menu."Code", v_menu."Name", v_page."Id";
            END IF;
        END LOOP;

        IF to_regclass('public."SystemConfigurations"') IS NOT NULL THEN
            UPDATE "SystemConfigurations"
            SET    "NavigationSubmenuCode" = v_new_code,
                   "NavigationMenuCode"    = v_menu."Code",
                   "NavigationModuleId"    = v_module."Id"
            WHERE  "NavigationSubmenuCode" = v_old_code;

            GET DIAGNOSTICS n = ROW_COUNT;

            IF n > 0 THEN
                RAISE NOTICE '% switch(es) of the page itself follow it to Infrastructure Control.', n;
            END IF;
        END IF;

        UPDATE "MasterActivityPages"
        SET    "NavigationSubmenuCode" = v_new_code
        WHERE  "NavigationSubmenuCode" = v_old_code;

        FOREACH t IN ARRAY ARRAY['ActivityAssignmentDetails', 'SpecialAssignmentDetails']
        LOOP
            IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
                EXECUTE format(
                    'UPDATE public.%I SET "ModuleId" = $1, "MenuId" = $2 WHERE "SubMenuId" = $3', t)
                USING v_module."Id", v_menu."Id", v_page."Id";
            END IF;
        END LOOP;

        RAISE NOTICE 'Page   System Configurations  % -> %  (Infrastructure Control > Navigation Management)', v_old_code, v_new_code;
    END IF;

    -- ---------------------------------------------------------------
    -- 2 + 3. Every module's Configuration page
    -- ---------------------------------------------------------------
    FOR v_cfg IN
        SELECT s."Id", s."Code", s."Name", me."Id" AS menu_id, me."NavigationModuleId" AS module_id
        FROM   "NavigationSubmenus" s
        JOIN   "NavigationMenus" me ON me."Id" = s."NavigationMenuId"
        WHERE  lower(trim(s."RouteKey")) = 'configuration'
        AND    s."IsDeleted" = false AND me."IsDeleted" = false
        ORDER  BY s."Code"
    LOOP
        v_pages := v_pages + 1;

        -- 2. Manage Configurations can be ticked on the page
        IF NOT EXISTS (SELECT 1 FROM "MasterActivityPages"
                       WHERE "MasterActivityCode" = 'ACT-0006'
                       AND   "NavigationSubmenuCode" = v_cfg."Code") THEN
            v_cols := '"MasterActivityCode", "NavigationSubmenuCode", "CreatedDate"';
            v_vals := format('%L, %L, now()', 'ACT-0006', v_cfg."Code");

            IF EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'MasterActivityPages' AND column_name = 'CreatedBy') THEN
                v_cols := v_cols || ', "CreatedBy"';
                v_vals := v_vals || ', 1';
            END IF;

            EXECUTE format('INSERT INTO "MasterActivityPages" (%s) VALUES (%s)', v_cols, v_vals);

            RAISE NOTICE 'Manage Configurations can now be ticked on : % %', v_cfg."Code", v_cfg."Name";
        END IF;

        -- 3. Today's admins (roles, then single users) keep the module
        FOREACH k IN ARRAY ARRAY['Activity', 'Special']
        LOOP
            IF to_regclass(format('public.%I', k || 'AssignmentDetails')) IS NULL
               OR to_regclass(format('public.%I', k || 'AssignmentPermissions')) IS NULL THEN
                CONTINUE;
            END IF;

            -- the page row of each admin (made, or brought back)
            EXECUTE format(
                'INSERT INTO public.%1$I
                     (%2$I, "ModuleId", "MenuId", "SubMenuId", "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
                 SELECT DISTINCT d.%2$I, $1, $2, $3, true, false, 1, now()
                 FROM   public.%1$I d
                 JOIN   public.%3$I p ON p.%4$I = d.%4$I
                 WHERE  d."SubMenuId" = $4 AND d."IsDeleted" = false AND d."IsActive" = true
                 AND    p."MasterActivityId" = $5 AND p."IsDeleted" = false AND p."IsActive" = true
                 AND    NOT EXISTS (SELECT 1 FROM public.%1$I e
                                    WHERE e.%2$I = d.%2$I AND e."SubMenuId" = $3)',
                k || 'AssignmentDetails', k || 'AssignmentId',
                k || 'AssignmentPermissions', k || 'AssignmentDetailId')
            USING v_cfg.module_id, v_cfg.menu_id, v_cfg."Id", v_page."Id", v_manage;

            GET DIAGNOSTICS n = ROW_COUNT;
            v_details := v_details + n;

            EXECUTE format(
                'UPDATE public.%1$I e
                 SET    "IsDeleted" = false, "IsActive" = true
                 WHERE  e."SubMenuId" = $1 AND (e."IsDeleted" = true OR e."IsActive" = false)
                 AND    EXISTS (SELECT 1
                                FROM   public.%1$I d
                                JOIN   public.%3$I p ON p.%4$I = d.%4$I
                                WHERE  d.%2$I = e.%2$I
                                AND    d."SubMenuId" = $2 AND d."IsDeleted" = false AND d."IsActive" = true
                                AND    p."MasterActivityId" = $3 AND p."IsDeleted" = false AND p."IsActive" = true)',
                k || 'AssignmentDetails', k || 'AssignmentId',
                k || 'AssignmentPermissions', k || 'AssignmentDetailId')
            USING v_cfg."Id", v_page."Id", v_manage;

            -- Manage Configurations, and View so the page opens
            EXECUTE format(
                'INSERT INTO public.%3$I
                     (%4$I, "MasterActivityId", "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
                 SELECT e.%4$I, a.id, true, false, 1, now()
                 FROM   public.%1$I e
                 CROSS  JOIN unnest($4::bigint[]) AS a(id)
                 WHERE  e."SubMenuId" = $1 AND e."IsDeleted" = false
                 AND    a.id IS NOT NULL
                 AND    EXISTS (SELECT 1
                                FROM   public.%1$I d
                                JOIN   public.%3$I p ON p.%4$I = d.%4$I
                                WHERE  d.%2$I = e.%2$I
                                AND    d."SubMenuId" = $2 AND d."IsDeleted" = false AND d."IsActive" = true
                                AND    p."MasterActivityId" = $3 AND p."IsDeleted" = false AND p."IsActive" = true)
                 AND    NOT EXISTS (SELECT 1 FROM public.%3$I q
                                    WHERE q.%4$I = e.%4$I AND q."MasterActivityId" = a.id
                                    AND   q."IsDeleted" = false AND q."IsActive" = true)',
                k || 'AssignmentDetails', k || 'AssignmentId',
                k || 'AssignmentPermissions', k || 'AssignmentDetailId')
            USING v_cfg."Id", v_page."Id", v_manage, ARRAY[v_manage, v_view];

            GET DIAGNOSTICS n = ROW_COUNT;
            v_perms := v_perms + n;
        END LOOP;
    END LOOP;

    IF v_view IS NULL THEN
        RAISE NOTICE 'Activity View not found by name : tick View on the Configuration pages by hand.';
    END IF;

    RAISE NOTICE '% Configuration page(s) ; % page row(s) and % tick(s) added for today''s configuration admins.', v_pages, v_details, v_perms;
    RAISE NOTICE 'Done. Check the lines above, then run COMMIT; (or ROLLBACK;). Log in again.';
END $$;


-- Run one of these by hand :
-- COMMIT;
-- ROLLBACK;


-- ---------------------------------------------------------------------
-- Check (after COMMIT, run on its own) : who manages which module
-- ---------------------------------------------------------------------
-- SELECT d."ActivityAssignmentId", m."Name" AS "Module", s."Name" AS "Page", a."Name" AS "Activity"
-- FROM   "ActivityAssignmentDetails" d
-- JOIN   "ActivityAssignmentPermissions" p ON p."ActivityAssignmentDetailId" = d."ActivityAssignmentDetailId"
-- JOIN   "MasterActivities" a ON a."Id" = p."MasterActivityId"
-- JOIN   "NavigationSubmenus" s ON s."Id" = d."SubMenuId"
-- JOIN   "NavigationModules" m ON m."Id" = d."ModuleId"
-- WHERE  a."Code" = 'ACT-0006' AND d."IsDeleted" = false AND p."IsDeleted" = false
-- ORDER  BY d."ActivityAssignmentId", m."DisplayOrder";
