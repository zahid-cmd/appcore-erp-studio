-- =====================================================================
-- WarrantyManagement_Navigation.sql   (2026-11-03)
-- ---------------------------------------------------------------------
-- Creates the menus and submenus of the Warranty Management module,
-- the same way the Navigation page does :
--   Code   MNU-<module seq>-<menu seq> / SUB-<module>-<menu>-<sub>
--   Route  /<module route key>/<menu route key>/<submenu route key>
--   SequenceNo = next number (deleted rows counted)
--
-- BEFORE : create the module on the Navigation page
--   Name : Warranty Management  Route key : warranty-management
-- (the script finds it by that route key; it never creates a module).
--
--   Warranty Control                  /warranty-management/warranty-control
--     1  Warranty Dashboard       (read-only page : NO Code Sync)
--     2  Warranty Configuration   (hand-written setup page : NO Code Sync;
--                                  tabs Sales Warranty Terms /
--                                  Service Warranty Terms)
--   Sales Warranty                    /warranty-management/sales-warranty
--     1  Sales Warranty Records
--     2  Sales Warranty Claims
--     3  Manufacturer Claims      (incl. defective parts from service
--                                  warranty claims)
--   Service Warranty                  /warranty-management/service-warranty
--     1  Service Warranty Records
--     2  Service Warranty Claims
--
-- Submenu names must be unique system-wide (Code Sync) : the script
-- refuses a duplicate. Rows that already exist (same route key) are
-- skipped, so it is safe to run again. One transaction. Run the whole
-- script (F5).
--
-- AFTER : Menu Sync; Submenu Sync (Code Sync) only for the pages as
-- we build them (never for Warranty Dashboard / Warranty
-- Configuration); tick the pages for the roles in Security &
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
    WHERE  lower("RouteKey") = 'warranty-management'
    AND    "IsDeleted" = false;

    IF v_module."Id" IS NULL THEN
        RAISE EXCEPTION 'Module with route key warranty-management not found : create "Warranty Management" on the Navigation page first.';
    END IF;

    RAISE NOTICE 'Module % % (route key %)', v_module."Code", v_module."Name", v_module."RouteKey";

    -- ---------- Menus ----------
    FOR m IN
        SELECT * FROM (VALUES
            (1, 'Warranty Control', 'fa-solid fa-sliders',         'warranty-control'),
            (2, 'Sales Warranty',   'fa-solid fa-shield-halved',   'sales-warranty'),
            (3, 'Service Warranty', 'fa-solid fa-screwdriver-wrench', 'service-warranty')
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
            (1, 'warranty-control', 1, 'Warranty Dashboard',       'fa-solid fa-chart-column', 'warranty-dashboard'),
            (1, 'warranty-control', 2, 'Warranty Configuration',   'fa-solid fa-gear',         'warranty-configuration'),
            (2, 'sales-warranty',   1, 'Sales Warranty Records',   'fa-solid fa-certificate',  'sales-warranty-records'),
            (2, 'sales-warranty',   2, 'Sales Warranty Claims',    'fa-solid fa-user-shield',  'sales-warranty-claims'),
            (2, 'sales-warranty',   3, 'Manufacturer Claims',      'fa-solid fa-industry',     'manufacturer-claims'),
            (3, 'service-warranty', 1, 'Service Warranty Records', 'fa-solid fa-award',        'service-warranty-records'),
            (3, 'service-warranty', 2, 'Service Warranty Claims',  'fa-solid fa-rotate',       'service-warranty-claims')
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
JOIN   "NavigationModules" d ON d."Id" = m."NavigationModuleId" AND lower(d."RouteKey") = 'warranty-management'
LEFT   JOIN "NavigationSubmenus" s ON s."NavigationMenuId" = m."Id" AND s."IsDeleted" = false
WHERE  m."IsDeleted" = false
ORDER  BY m."DisplayOrder", s."DisplayOrder";
