-- =====================================================================
-- RegistrationManagement_Navigation.sql   (2026-11-03)
-- ---------------------------------------------------------------------
-- Creates the menus and submenus of the Registration Management
-- module, the same way the Navigation page does :
--   Code   MNU-<module seq>-<menu seq> / SUB-<module>-<menu>-<sub>
--   Route  /<module route key>/<menu route key>/<submenu route key>
--   SequenceNo = next number (deleted rows counted)
--
-- BEFORE : create the module on the Navigation page
--   Name : Registration Management   Route key : registration-management
-- (the script finds it by that route key; it never creates a module).
--
-- Rule : a dashboard is always submenu 1 of its menu.
--
--   Registration Control              /registration-management/registration-control
--     1  Registration Dashboard        (read-only : NO Code Sync)
--     2  Registration Configuration    (hand-written setup : NO Code Sync)
--   Customer File                     /registration-management/customer-file
--     1  Customer File Dashboard       (read-only : NO Code Sync)
--     2  Customer Files
--     3  Name Transfers                (fees collected / refunded on the
--                                       same page)
--     4  Customer File Configuration   (hand-written setup : NO Code Sync)
--   Registration Processing           /registration-management/registration-processing
--     1  Registration Fees             (collection, refund and
--                                       cancellation / forfeit)
--     2  Registration Files
--     3  BRTA Payments
--     4  Delivery Acknowledgements
--   After-Sales Registration          /registration-management/after-sales-registration
--     1  Tax Token Renewals
--     2  Ownership Transfers
--
-- Submenu names must be unique system-wide (Code Sync) : the script
-- refuses a duplicate. Rows that already exist (same route key) are
-- skipped; existing rows are never changed (display order you set by
-- hand stays). One transaction. Run the whole script (F5).
--
-- AFTER : Menu Sync; Submenu Sync (Code Sync) only for the pages as we
-- build them (never for the dashboards / configuration pages); tick
-- the pages for the roles in Security & Permission > Activity
-- Assignment, then log in again.
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
    WHERE  lower("RouteKey") = 'registration-management'
    AND    "IsDeleted" = false;

    IF v_module."Id" IS NULL THEN
        RAISE EXCEPTION 'Module with route key registration-management not found : create "Registration Management" on the Navigation page first.';
    END IF;

    RAISE NOTICE 'Module % % (route key %)', v_module."Code", v_module."Name", v_module."RouteKey";

    -- ---------- Menus ----------
    FOR m IN
        SELECT * FROM (VALUES
            (1, 'Registration Control',     'fa-solid fa-sliders',       'registration-control'),
            (2, 'Customer File',            'fa-solid fa-folder-open',   'customer-file'),
            (3, 'Registration Processing',  'fa-solid fa-id-card',       'registration-processing'),
            (4, 'After-Sales Registration', 'fa-solid fa-rotate',        'after-sales-registration')
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
            (1, 'registration-control',     1, 'Registration Dashboard',        'fa-solid fa-chart-pie',           'registration-dashboard'),
            (1, 'registration-control',     2, 'Registration Configuration',    'fa-solid fa-gear',                'registration-configuration'),
            (2, 'customer-file',            1, 'Customer File Dashboard',       'fa-solid fa-chart-column',        'customer-file-dashboard'),
            (2, 'customer-file',            2, 'Customer Files',                'fa-solid fa-folder',              'customer-files'),
            (2, 'customer-file',            3, 'Name Transfers',                'fa-solid fa-people-arrows',       'name-transfers'),
            (2, 'customer-file',            4, 'Customer File Configuration',   'fa-solid fa-gears',               'customer-file-configuration'),
            (3, 'registration-processing',  1, 'Registration Fees',             'fa-solid fa-money-bill-wave',     'registration-fees'),
            (3, 'registration-processing',  2, 'Registration Files',            'fa-solid fa-folder-tree',         'registration-files'),
            (3, 'registration-processing',  3, 'BRTA Payments',                 'fa-solid fa-building-columns',    'brta-payments'),
            (3, 'registration-processing',  4, 'Delivery Acknowledgements',     'fa-solid fa-file-signature',      'delivery-acknowledgements'),
            (4, 'after-sales-registration', 1, 'Tax Token Renewals',            'fa-solid fa-calendar-check',      'tax-token-renewals'),
            (4, 'after-sales-registration', 2, 'Ownership Transfers',           'fa-solid fa-right-left',          'ownership-transfers')
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
JOIN   "NavigationModules" d ON d."Id" = m."NavigationModuleId" AND lower(d."RouteKey") = 'registration-management'
LEFT   JOIN "NavigationSubmenus" s ON s."NavigationMenuId" = m."Id" AND s."IsDeleted" = false
WHERE  m."IsDeleted" = false
ORDER  BY m."DisplayOrder", s."DisplayOrder";
