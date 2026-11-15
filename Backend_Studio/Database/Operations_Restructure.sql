ROLLBACK;

-- =====================================================================
-- Operations_Restructure.sql   (2026-11-15)
-- ---------------------------------------------------------------------
-- The business runs in three operations, one per wing. Each module
-- holds its wing's whole day : its own setup menu first, then its
-- sales and work. Product Settings keeps the shared catalogue.
--
--   Sales Operations (showroom)          /sales-operations
--     Sales Setup            NEW   Bike Accessory Schemes  (from Product Settings)
--                                  PDI Templates           (from Service Settings)
--     Booking Management
--     Motor Bike Sales
--     Business Promotions          Promotional Offers - Sales Center
--
--   Service Operations (service center)  /service-operations
--     Service Setup          NEW   Service Category, Service Sub Category,
--                                  Service Policy, Labor Chart,
--                                  Scheduled Services, Customized Services,
--                                  Chart of Services   (from Service Settings)
--                                  Workshop Configuration (from Workshop
--                                  Management; made here if missing)
--     Booking Management     NEW   Bookings - SP (from Sales Operations)
--     Spare Parts & Lubricant Sales  NEW here : Quotations / Invoices /
--                                  Returns - SP (from Sales Operations)
--     Workshop Management
--     Service Billing
--     Business Promotions    NEW   Promotional Offers - Service Center
--
--   Accessories Operations (accessory shop)  /accessories-operations
--     Booking Management     NEW   Bookings - AC (from Sales Operations)
--     Accessories Sales      NEW   Quotations / Invoices / Returns - AC
--                                  (from Sales Operations)
--     Business Promotions    NEW   Promotional Offers - Accessory Shop
--
--   Membership Management > Membership Setup
--                                  Membership Services (from Service Settings)
--
--   Settings > Service Settings, Sales Operations > Spare Parts &
--   Lubricant Sales and Sales Operations > Accessories Sales are left
--   empty : they are removed (marked deleted).
--
-- Each page moves like a move on Navigation Management : it keeps its
-- Id, name and route key; its menu, code, route and order change, and
-- every table that keeps its code / module / menu follows
-- (INF_SubmenuSynchronization, CodeSynchronizations,
-- SystemConfigurations, MasterActivityPages, ActivityAssignmentDetails,
-- SpecialAssignmentDetails), so the permissions ticked for it stay.
-- Page files are NOT moved; the old addresses open the new ones.
--
-- BEFORE : create the module on the Navigation page
--   Name : Accessories Operations    Route key : accessories-operations
-- Do NOT run Module / Menu / Submenu / Code Sync for these menus.
--
-- Run the whole script (F5) on AppCoreERP_Studio. Read the Messages
-- tab, then run COMMIT; (or ROLLBACK;). Log in again afterwards.
-- Safe to run again. ASCII only.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Helpers (this session only)
-- ---------------------------------------------------------------------

-- The module, by route key (never created here)
CREATE OR REPLACE FUNCTION pg_temp.module_of(p_key text)
RETURNS bigint LANGUAGE plpgsql AS $f$
DECLARE
    v_id bigint;
BEGIN
    SELECT "Id" INTO v_id
    FROM   "NavigationModules"
    WHERE  lower(trim("RouteKey")) = p_key
    AND    "IsDeleted" = false
    ORDER  BY "Id"
    LIMIT  1;

    IF v_id IS NULL THEN
        RAISE EXCEPTION 'Module with route key % not found. Create it on the Navigation page first - nothing was changed.', p_key;
    END IF;

    RETURN v_id;
END $f$;


-- A menu of the module (made when missing); its display order is set
CREATE OR REPLACE FUNCTION pg_temp.menu_of(p_module_key text, p_menu_key text, p_name text, p_icon text, p_order int, p_remarks text)
RETURNS bigint LANGUAGE plpgsql AS $f$
DECLARE
    v_module record;
    v_id     bigint;
    v_seq    int;
BEGIN
    SELECT "Id", "SequenceNo", "RouteKey" INTO v_module
    FROM   "NavigationModules"
    WHERE  "Id" = pg_temp.module_of(p_module_key);

    SELECT "Id" INTO v_id
    FROM   "NavigationMenus"
    WHERE  "NavigationModuleId" = v_module."Id"
    AND    lower(trim("RouteKey")) = p_menu_key
    AND    "IsDeleted" = false
    ORDER  BY "Id"
    LIMIT  1;

    IF v_id IS NULL THEN
        -- numbers are never reused : deleted menus counted
        SELECT COALESCE(MAX("SequenceNo"), 0) + 1 INTO v_seq
        FROM   "NavigationMenus"
        WHERE  "NavigationModuleId" = v_module."Id";

        INSERT INTO "NavigationMenus"
            ("NavigationModuleId", "SequenceNo", "Code", "Name", "Icon",
             "RouteKey", "Route", "DisplayOrder", "Remarks",
             "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        VALUES
            (v_module."Id", v_seq,
             'MNU-' || lpad(v_module."SequenceNo"::text, 3, '0') || '-' || lpad(v_seq::text, 3, '0'),
             p_name, p_icon,
             p_menu_key, '/' || v_module."RouteKey" || '/' || p_menu_key,
             p_order, p_remarks,
             true, false, 1, now())
        RETURNING "Id" INTO v_id;

        RAISE NOTICE 'Menu created : % > %', v_module."RouteKey", p_name;
    ELSE
        UPDATE "NavigationMenus"
        SET    "DisplayOrder" = p_order
        WHERE  "Id" = v_id;
    END IF;

    RETURN v_id;
END $f$;


-- Moves one page (found by its route key) under a menu, with every
-- table that keeps its code / menu. Returns false when the page is
-- not there.
CREATE OR REPLACE FUNCTION pg_temp.move_page(p_page_key text, p_menu_id bigint, p_order int)
RETURNS boolean LANGUAGE plpgsql AS $f$
DECLARE
    v_menu   record;
    v_module record;
    v_sub    record;
    v_seq    int;
    v_old    text;
    v_new    text;
    t        text;
    n        bigint;
BEGIN
    SELECT "Id", "Code", "Name", "RouteKey", "NavigationModuleId" INTO v_menu
    FROM   "NavigationMenus"
    WHERE  "Id" = p_menu_id;

    SELECT "Id", "Code", "Name", "RouteKey" INTO v_module
    FROM   "NavigationModules"
    WHERE  "Id" = v_menu."NavigationModuleId";

    SELECT "Id", "NavigationMenuId", "Code", "SequenceNo", "Name", "Route" INTO v_sub
    FROM   "NavigationSubmenus"
    WHERE  lower(trim("RouteKey")) = p_page_key
    AND    "IsDeleted" = false
    ORDER  BY ("NavigationMenuId" = p_menu_id) DESC, "Id"
    LIMIT  1;

    IF v_sub."Id" IS NULL THEN
        RAISE NOTICE 'Page % not found : skipped', p_page_key;
        RETURN false;
    END IF;

    IF v_sub."NavigationMenuId" = p_menu_id THEN
        UPDATE "NavigationSubmenus"
        SET    "DisplayOrder" = p_order,
               "Route"        = '/' || v_module."RouteKey" || '/' || v_menu."RouteKey" || '/' || p_page_key
        WHERE  "Id" = v_sub."Id";

        RAISE NOTICE '%  already under % > %  (%)', rpad(v_sub."Name", 38), v_module."Name", v_menu."Name", v_sub."Code";
        RETURN true;
    END IF;

    v_old := v_sub."Code";

    SELECT COALESCE(MAX("SequenceNo"), 0) + 1 INTO v_seq
    FROM   "NavigationSubmenus"
    WHERE  "NavigationMenuId" = p_menu_id;

    v_new := 'SUB-' || substr(v_menu."Code", 5) || '-' || lpad(v_seq::text, 3, '0');

    IF EXISTS (SELECT 1 FROM "NavigationSubmenus" WHERE "Code" = v_new AND "Id" <> v_sub."Id") THEN
        RAISE EXCEPTION 'Code % is already used by another page. Tell Claude - nothing was changed.', v_new;
    END IF;

    UPDATE "NavigationSubmenus"
    SET    "NavigationMenuId" = p_menu_id,
           "SequenceNo"       = v_seq,
           "Code"             = v_new,
           "Route"            = '/' || v_module."RouteKey" || '/' || v_menu."RouteKey" || '/' || p_page_key,
           "DisplayOrder"     = p_order
    WHERE  "Id" = v_sub."Id";

    FOREACH t IN ARRAY ARRAY['INF_SubmenuSynchronization', 'CodeSynchronizations']
    LOOP
        IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
            EXECUTE format(
                'UPDATE public.%I
                 SET    "SubmenuCode" = $1,
                        "ModuleId" = $2, "ModuleCode" = $3, "ModuleName" = $4,
                        "MenuId" = $5, "MenuCode" = $6, "MenuName" = $7
                 WHERE  "SubmenuId" = $8', t)
            USING v_new, v_module."Id", v_module."Code", v_module."Name",
                  v_menu."Id", v_menu."Code", v_menu."Name", v_sub."Id";
        END IF;
    END LOOP;

    IF to_regclass('public."SystemConfigurations"') IS NOT NULL THEN
        UPDATE "SystemConfigurations"
        SET    "NavigationSubmenuCode" = v_new,
               "NavigationMenuCode"    = v_menu."Code",
               "NavigationModuleId"    = v_module."Id"
        WHERE  "NavigationSubmenuCode" = v_old;
    END IF;

    IF to_regclass('public."MasterActivityPages"') IS NOT NULL THEN
        UPDATE "MasterActivityPages"
        SET    "NavigationSubmenuCode" = v_new
        WHERE  "NavigationSubmenuCode" = v_old;
    END IF;

    n := 0;

    FOREACH t IN ARRAY ARRAY['ActivityAssignmentDetails', 'SpecialAssignmentDetails']
    LOOP
        IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
            EXECUTE format(
                'UPDATE public.%I
                 SET    "ModuleId" = $1, "MenuId" = $2
                 WHERE  "SubMenuId" = $3', t)
            USING v_module."Id", v_menu."Id", v_sub."Id";
        END IF;
    END LOOP;

    IF to_regclass('public."ActivityAssignmentDetails"') IS NOT NULL THEN
        SELECT count(*) INTO n FROM "ActivityAssignmentDetails" WHERE "SubMenuId" = v_sub."Id";
    END IF;

    RAISE NOTICE '%  -> % > %  (% -> %, % permission row(s) follow)',
        rpad(v_sub."Name", 38), v_module."Name", v_menu."Name", v_old, v_new, n;

    RETURN true;
END $f$;


-- A new page under a menu (only when no page has that route key)
CREATE OR REPLACE FUNCTION pg_temp.add_page(p_menu_id bigint, p_page_key text, p_name text, p_icon text, p_order int, p_remarks text)
RETURNS void LANGUAGE plpgsql AS $f$
DECLARE
    v_menu   record;
    v_module record;
    v_seq    int;
BEGIN
    IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
               WHERE lower(trim("RouteKey")) = p_page_key AND "IsDeleted" = false) THEN
        RETURN;
    END IF;

    IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
               WHERE lower(trim("Name")) = lower(p_name) AND "IsDeleted" = false) THEN
        RAISE EXCEPTION 'A page named "%" already exists elsewhere : names must be unique. Tell Claude - nothing was changed.', p_name;
    END IF;

    SELECT "Id", "Code", "RouteKey", "NavigationModuleId" INTO v_menu
    FROM   "NavigationMenus" WHERE "Id" = p_menu_id;

    SELECT "RouteKey" INTO v_module
    FROM   "NavigationModules" WHERE "Id" = v_menu."NavigationModuleId";

    SELECT COALESCE(MAX("SequenceNo"), 0) + 1 INTO v_seq
    FROM   "NavigationSubmenus"
    WHERE  "NavigationMenuId" = p_menu_id;

    INSERT INTO "NavigationSubmenus"
        ("NavigationMenuId", "SequenceNo", "Code", "Name", "Icon",
         "RouteKey", "Route", "DisplayOrder", "Remarks",
         "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
    VALUES
        (p_menu_id, v_seq, 'SUB-' || substr(v_menu."Code", 5) || '-' || lpad(v_seq::text, 3, '0'),
         p_name, p_icon, p_page_key,
         '/' || v_module."RouteKey" || '/' || v_menu."RouteKey" || '/' || p_page_key,
         p_order, p_remarks,
         true, false, 1, now());

    RAISE NOTICE '%  page created', rpad(p_name, 38);
END $f$;


-- A menu left with no page : removed (marked deleted)
CREATE OR REPLACE FUNCTION pg_temp.drop_if_empty(p_module_key text, p_menu_key text)
RETURNS void LANGUAGE plpgsql AS $f$
DECLARE
    v_menu record;
BEGIN
    SELECT m."Id", m."Name" INTO v_menu
    FROM   "NavigationMenus" m
    JOIN   "NavigationModules" d ON d."Id" = m."NavigationModuleId"
    WHERE  lower(trim(d."RouteKey")) = p_module_key
    AND    d."IsDeleted" = false
    AND    lower(trim(m."RouteKey")) = p_menu_key
    AND    m."IsDeleted" = false
    LIMIT  1;

    IF v_menu."Id" IS NULL THEN
        RETURN;
    END IF;

    IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
               WHERE "NavigationMenuId" = v_menu."Id" AND "IsDeleted" = false) THEN
        RAISE NOTICE 'Menu % > % still has pages : kept', p_module_key, v_menu."Name";
        RETURN;
    END IF;

    UPDATE "NavigationMenus"
    SET    "IsDeleted" = true, "IsActive" = false
    WHERE  "Id" = v_menu."Id";

    RAISE NOTICE 'Menu % > % is empty : removed', p_module_key, v_menu."Name";
END $f$;


-- ---------------------------------------------------------------------
-- The moves
-- ---------------------------------------------------------------------

DO $$
DECLARE
    v_menu bigint;
BEGIN
    -- every module first : nothing changes when one is missing
    PERFORM pg_temp.module_of('sales-operations');
    PERFORM pg_temp.module_of('service-operations');
    PERFORM pg_temp.module_of('accessories-operations');
    PERFORM pg_temp.module_of('membership-management');

    ------------------------------------------------------------------
    RAISE NOTICE '---- Sales Operations ----';
    ------------------------------------------------------------------
    v_menu := pg_temp.menu_of('sales-operations', 'sales-setup', 'Sales Setup', 'fa-solid fa-sliders', 1,
                              'The showroom''s own rules : what goes with a bike, the delivery checklist.');
    PERFORM pg_temp.move_page('bike-accessory-schemes', v_menu, 1);
    PERFORM pg_temp.move_page('pdi-templates', v_menu, 2);

    PERFORM pg_temp.menu_of('sales-operations', 'booking-management', 'Booking Management', 'fa-solid fa-calendar-check', 2, NULL);
    PERFORM pg_temp.menu_of('sales-operations', 'motor-bike-sales', 'Motor Bike Sales', 'fa-solid fa-motorcycle', 3, NULL);
    PERFORM pg_temp.menu_of('sales-operations', 'business-promotions', 'Business Promotions', 'fa-solid fa-bullhorn', 4, NULL);

    ------------------------------------------------------------------
    RAISE NOTICE '---- Service Operations ----';
    ------------------------------------------------------------------
    v_menu := pg_temp.menu_of('service-operations', 'service-setup', 'Service Setup', 'fa-solid fa-sliders', 1,
                              'The service center''s own rules : services, policies, labour, the workshop.');
    PERFORM pg_temp.move_page('service-category', v_menu, 1);
    PERFORM pg_temp.move_page('service-sub-category', v_menu, 2);
    PERFORM pg_temp.move_page('service-policy', v_menu, 3);
    PERFORM pg_temp.move_page('labor-chart', v_menu, 4);
    PERFORM pg_temp.move_page('scheduled-services', v_menu, 5);
    PERFORM pg_temp.move_page('customized-services', v_menu, 6);
    PERFORM pg_temp.move_page('chart-of-services', v_menu, 7);

    IF NOT pg_temp.move_page('workshop-configuration', v_menu, 8) THEN
        PERFORM pg_temp.add_page(v_menu, 'workshop-configuration', 'Workshop Configuration', 'fa-solid fa-gear', 8,
                                 'Bays, technicians, the check-in checklist and the workshop switches. Hand-written page : never run Submenu / Code Sync.');
    END IF;

    v_menu := pg_temp.menu_of('service-operations', 'booking-management', 'Booking Management', 'fa-solid fa-calendar-check', 2, NULL);
    PERFORM pg_temp.move_page('bookings-sp', v_menu, 1);

    v_menu := pg_temp.menu_of('service-operations', 'spare-parts-lubricant-sales', 'Spare Parts & Lubricant Sales', 'fa-solid fa-gears', 3, NULL);
    PERFORM pg_temp.move_page('sales-quotations-sp', v_menu, 1);
    PERFORM pg_temp.move_page('sales-invoices-sp', v_menu, 2);
    PERFORM pg_temp.move_page('sales-returns-sp', v_menu, 3);

    PERFORM pg_temp.menu_of('service-operations', 'workshop-management', 'Workshop Management', 'fa-solid fa-screwdriver-wrench', 4, NULL);
    PERFORM pg_temp.menu_of('service-operations', 'service-billing', 'Service Billing', 'fa-solid fa-file-invoice-dollar', 5, NULL);

    v_menu := pg_temp.menu_of('service-operations', 'business-promotions', 'Business Promotions', 'fa-solid fa-bullhorn', 6, NULL);
    PERFORM pg_temp.move_page('promotional-offers-service-center', v_menu, 1);

    ------------------------------------------------------------------
    RAISE NOTICE '---- Accessories Operations ----';
    ------------------------------------------------------------------
    v_menu := pg_temp.menu_of('accessories-operations', 'booking-management', 'Booking Management', 'fa-solid fa-calendar-check', 1, NULL);
    PERFORM pg_temp.move_page('bookings-ac', v_menu, 1);

    v_menu := pg_temp.menu_of('accessories-operations', 'accessories-sales', 'Accessories Sales', 'fa-solid fa-helmet-safety', 2, NULL);
    PERFORM pg_temp.move_page('sales-quotations-ac', v_menu, 1);
    PERFORM pg_temp.move_page('sales-invoices-ac', v_menu, 2);
    PERFORM pg_temp.move_page('sales-returns-ac', v_menu, 3);

    v_menu := pg_temp.menu_of('accessories-operations', 'business-promotions', 'Business Promotions', 'fa-solid fa-bullhorn', 3, NULL);
    PERFORM pg_temp.move_page('promotional-offers-accessory-shop', v_menu, 1);

    ------------------------------------------------------------------
    RAISE NOTICE '---- Membership Management ----';
    ------------------------------------------------------------------
    v_menu := pg_temp.menu_of('membership-management', 'membership-setup', 'Membership Setup', 'fa-solid fa-id-card', 1, NULL);
    PERFORM pg_temp.move_page('membership-services', v_menu, 3);

    ------------------------------------------------------------------
    RAISE NOTICE '---- Menus left empty ----';
    ------------------------------------------------------------------
    PERFORM pg_temp.drop_if_empty('settings', 'service-settings');
    PERFORM pg_temp.drop_if_empty('sales-operations', 'spare-parts-lubricant-sales');
    PERFORM pg_temp.drop_if_empty('sales-operations', 'accessories-sales');

    RAISE NOTICE 'Done. Check the lines above, then run COMMIT; (or ROLLBACK;). Log in again to see the new menus.';
END $$;


-- Run one of these by hand :
-- COMMIT;
-- ROLLBACK;


-- ---------------------------------------------------------------------
-- Check (after COMMIT, run on its own)
-- ---------------------------------------------------------------------
-- SELECT d."Name" AS "Module", m."Name" AS "Menu", m."DisplayOrder" AS "Menu Order",
--        s."Code", s."Name" AS "Page", s."Route", s."DisplayOrder"
-- FROM   "NavigationModules" d
-- JOIN   "NavigationMenus" m ON m."NavigationModuleId" = d."Id" AND m."IsDeleted" = false
-- LEFT   JOIN "NavigationSubmenus" s ON s."NavigationMenuId" = m."Id" AND s."IsDeleted" = false
-- WHERE  lower(d."RouteKey") IN ('sales-operations', 'service-operations', 'accessories-operations', 'membership-management')
-- ORDER  BY d."Name", m."DisplayOrder", s."DisplayOrder";
