-- =====================================================================
-- SalesOperations_Navigation.sql   (2026-11-03)
-- ---------------------------------------------------------------------
-- Creates the menus and submenus of the Sales Operations module, the
-- same way the Navigation page does :
--   Code   MNU-<module seq>-<menu seq> / SUB-<module>-<menu>-<sub>
--   Route  /<module route key>/<menu route key>/<submenu route key>
--   SequenceNo = next number (deleted rows counted)
--
-- BEFORE : create the module on the Navigation page
--   Name : Sales Operations     Route key : sales-operations
-- (the script finds it by that route key; it never creates a module).
--
--   Booking Management                /sales-operations/booking-management
--     1  Bookings
--     2  Booking Collections
--     3  Booking Cancellations & Refunds
--   Motor Bike Sales                  /sales-operations/motor-bike-sales
--     1  Sales Quotations - MB
--     2  Sales Invoices - MB
--     3  Bike Deliveries   (own page; switch "Delivery on Sale" comes
--                           with the page build)
--     4  Sales Returns - MB
--   Spare Parts & Lubricant Sales     /sales-operations/spare-parts-lubricant-sales
--     1  Sales Quotations - SP
--     2  Sales Invoices - SP
--     3  Sales Returns - SP
--   Accessories Sales                 /sales-operations/accessories-sales
--     1  Sales Quotations - AC
--     2  Sales Invoices - AC
--     3  Sales Returns - AC
--   Business Promotions               /sales-operations/business-promotions
--     1  Promotional Offers - Sales Center
--     2  Promotional Offers - Service Center
--     3  Promotional Offers - Accessory Shop
--
-- Submenus with the same name in several menus clash in Code Sync,
-- so the product-type ones carry the suffix - MB / - SP / - AC.
-- Rows that already exist (same route key) are skipped, so it is safe
-- to run again. One transaction. Run the whole script (F5).
--
-- AFTER : Menu Sync, then Submenu Sync (Code Sync) for the pages as
-- we build them; tick the pages for the roles in Security &
-- Permission > Activity Assignment, then log in again.
-- =====================================================================

DO $$
DECLARE
    v_module    record;
    v_menu      record;
    v_menu_id   bigint;
    v_seq       int;
    m           record;
    s           record;
BEGIN
    -- ---------- Module (created on the Navigation page) ----------
    SELECT "Id", "SequenceNo", "RouteKey", "Name", "Code" INTO v_module
    FROM   "NavigationModules"
    WHERE  lower("RouteKey") = 'sales-operations'
    AND    "IsDeleted" = false;

    IF v_module."Id" IS NULL THEN
        RAISE EXCEPTION 'Module with route key sales-operations not found : create "Sales Operations" on the Navigation page first.';
    END IF;

    RAISE NOTICE 'Module % % (route key %)', v_module."Code", v_module."Name", v_module."RouteKey";

    -- ---------- Menus ----------
    FOR m IN
        SELECT * FROM (VALUES
            (1, 'Booking Management',            'fa-solid fa-calendar-plus',   'booking-management'),
            (2, 'Motor Bike Sales',              'fa-solid fa-motorcycle',      'motor-bike-sales'),
            (3, 'Spare Parts & Lubricant Sales', 'fa-solid fa-gears',           'spare-parts-lubricant-sales'),
            (4, 'Accessories Sales',             'fa-solid fa-helmet-safety',   'accessories-sales'),
            (5, 'Business Promotions',           'fa-solid fa-bullhorn',        'business-promotions')
        ) AS t (ord, name, icon, route_key)
        ORDER BY ord
    LOOP
        SELECT "Id" INTO v_menu_id
        FROM   "NavigationMenus"
        WHERE  "NavigationModuleId" = v_module."Id"
        AND    lower("RouteKey") = m.route_key
        AND    "IsDeleted" = false;

        IF v_menu_id IS NULL THEN
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
                 m.name, m.icon,
                 m.route_key, '/' || v_module."RouteKey" || '/' || m.route_key,
                 m.ord, NULL,
                 true, false, 1, now())
            RETURNING "Id" INTO v_menu_id;

            RAISE NOTICE 'Menu created : %', m.name;
        ELSE
            RAISE NOTICE 'Menu exists, skipped : %', m.name;
        END IF;
    END LOOP;

    -- ---------- Submenus ----------
    FOR s IN
        SELECT * FROM (VALUES
            (1, 'booking-management',          1, 'Bookings',                            'fa-solid fa-bookmark',              'bookings'),
            (1, 'booking-management',          2, 'Booking Collections',                 'fa-solid fa-hand-holding-dollar',   'booking-collections'),
            (1, 'booking-management',          3, 'Booking Cancellations & Refunds',     'fa-solid fa-rotate-left',           'booking-cancellations-refunds'),
            (2, 'motor-bike-sales',            1, 'Sales Quotations - MB',               'fa-solid fa-file-signature',        'sales-quotations-mb'),
            (2, 'motor-bike-sales',            2, 'Sales Invoices - MB',                 'fa-solid fa-file-invoice-dollar',   'sales-invoices-mb'),
            (2, 'motor-bike-sales',            3, 'Bike Deliveries',                     'fa-solid fa-key',                   'bike-deliveries'),
            (2, 'motor-bike-sales',            4, 'Sales Returns - MB',                  'fa-solid fa-arrow-rotate-left',     'sales-returns-mb'),
            (3, 'spare-parts-lubricant-sales', 1, 'Sales Quotations - SP',               'fa-solid fa-file-signature',        'sales-quotations-sp'),
            (3, 'spare-parts-lubricant-sales', 2, 'Sales Invoices - SP',                 'fa-solid fa-file-invoice-dollar',   'sales-invoices-sp'),
            (3, 'spare-parts-lubricant-sales', 3, 'Sales Returns - SP',                  'fa-solid fa-arrow-rotate-left',     'sales-returns-sp'),
            (4, 'accessories-sales',           1, 'Sales Quotations - AC',               'fa-solid fa-file-signature',        'sales-quotations-ac'),
            (4, 'accessories-sales',           2, 'Sales Invoices - AC',                 'fa-solid fa-file-invoice-dollar',   'sales-invoices-ac'),
            (4, 'accessories-sales',           3, 'Sales Returns - AC',                  'fa-solid fa-arrow-rotate-left',     'sales-returns-ac'),
            (5, 'business-promotions',         1, 'Promotional Offers - Sales Center',   'fa-solid fa-tags',                  'promotional-offers-sales-center'),
            (5, 'business-promotions',         2, 'Promotional Offers - Service Center', 'fa-solid fa-percent',               'promotional-offers-service-center'),
            (5, 'business-promotions',         3, 'Promotional Offers - Accessory Shop', 'fa-solid fa-gift',                  'promotional-offers-accessory-shop')
        ) AS t (menu_ord, menu_key, ord, name, icon, route_key)
        ORDER BY menu_ord, ord
    LOOP
        SELECT "Id", "SequenceNo", "RouteKey" INTO v_menu
        FROM   "NavigationMenus"
        WHERE  "NavigationModuleId" = v_module."Id"
        AND    lower("RouteKey") = s.menu_key
        AND    "IsDeleted" = false;

        IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
                   WHERE  "NavigationMenuId" = v_menu."Id"
                   AND    lower("RouteKey") = s.route_key
                   AND    "IsDeleted" = false) THEN
            RAISE NOTICE 'Submenu exists, skipped : %', s.name;
            CONTINUE;
        END IF;

        -- Submenu names must be unique across the system (Code Sync)
        IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
                   WHERE  lower("Name") = lower(s.name)
                   AND    "IsDeleted" = false) THEN
            RAISE EXCEPTION 'A submenu named "%" already exists elsewhere : names must be unique (Code Sync).', s.name;
        END IF;

        SELECT COALESCE(MAX("SequenceNo"), 0) + 1 INTO v_seq
        FROM   "NavigationSubmenus"
        WHERE  "NavigationMenuId" = v_menu."Id";

        INSERT INTO "NavigationSubmenus"
            ("NavigationMenuId", "SequenceNo", "Code", "Name", "Icon",
             "RouteKey", "Route", "DisplayOrder", "Remarks",
             "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        VALUES
            (v_menu."Id", v_seq,
             'SUB-' || lpad(v_module."SequenceNo"::text, 3, '0')
                    || '-' || lpad(v_menu."SequenceNo"::text, 3, '0')
                    || '-' || lpad(v_seq::text, 3, '0'),
             s.name, s.icon,
             s.route_key,
             '/' || v_module."RouteKey" || '/' || v_menu."RouteKey" || '/' || s.route_key,
             s.ord, NULL,
             true, false, 1, now());

        RAISE NOTICE 'Submenu created : %', s.name;
    END LOOP;
END
$$;


-- ---------------------------------------------------------------------
-- Check (run on its own)
-- ---------------------------------------------------------------------

SELECT m."Code"  AS "Menu Code",  m."Name" AS "Menu",
       s."Code"  AS "Submenu Code", s."Name" AS "Submenu",
       s."Icon", s."Route", s."DisplayOrder"
FROM   "NavigationMenus" m
JOIN   "NavigationModules" d ON d."Id" = m."NavigationModuleId" AND lower(d."RouteKey") = 'sales-operations'
LEFT   JOIN "NavigationSubmenus" s ON s."NavigationMenuId" = m."Id" AND s."IsDeleted" = false
WHERE  m."IsDeleted" = false
ORDER  BY m."DisplayOrder", s."DisplayOrder";
