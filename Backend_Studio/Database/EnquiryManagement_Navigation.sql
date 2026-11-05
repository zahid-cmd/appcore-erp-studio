-- =====================================================================
-- EnquiryManagement_Navigation.sql   (2026-11-03)
-- ---------------------------------------------------------------------
-- Creates the menus and submenus of MOD-010 Enquiry Management,
-- the same way the Navigation page does :
--   Code   MNU-<module seq>-<menu seq> / SUB-<module>-<menu>-<sub>
--   Route  /<module route key>/<menu route key>/<submenu route key>
--   SequenceNo = next number (deleted rows counted)
--
--   MNU-010-001  Enquiry Profiles            /enquiry-management/enquiry-profiles
--     1  Enquiry Dashboard     (read-only page : NO Code Sync)
--     2  Sales Enquiries
--     3  Service Enquiries
--     4  Enquiry Setup
--   MNU-010-002  Follow-ups & Appointments   /enquiry-management/follow-ups-appointments
--     1  Sales Follow-ups
--     2  Service Follow-ups
--     3  Service Appointments
--     4  Test Rides
--
-- Run EnquiryManagement_ClearMenus.sql first (stops if menus remain).
-- Rows that already exist (same route key) are skipped, so it is safe
-- to run again. One transaction. Run the whole script (F5).
--
-- After running : tick the pages for the roles in Security & Permission
-- > Activity Assignment, then log in again.
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
    -- ---------- Module ----------
    SELECT "Id", "SequenceNo", "RouteKey", "Name" INTO v_module
    FROM   "NavigationModules"
    WHERE  "Code" = 'MOD-010'
    AND    "IsDeleted" = false;

    IF v_module."Id" IS NULL THEN
        RAISE EXCEPTION 'Module MOD-010 not found.';
    END IF;

    RAISE NOTICE 'Module % (route key %)', v_module."Name", v_module."RouteKey";

    -- ---------- Menus ----------
    FOR m IN
        SELECT * FROM (VALUES
            (1, 'Enquiry Profiles',          'fa-solid fa-address-book',  'enquiry-profiles'),
            (2, 'Follow-ups & Appointments', 'fa-solid fa-calendar-days', 'follow-ups-appointments')
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
            ('enquiry-profiles',        1, 'Enquiry Dashboard',    'fa-solid fa-chart-pie',             'enquiry-dashboard'),
            ('enquiry-profiles',        2, 'Sales Enquiries',      'fa-solid fa-motorcycle',            'sales-enquiries'),
            ('enquiry-profiles',        3, 'Service Enquiries',    'fa-solid fa-screwdriver-wrench',    'service-enquiries'),
            ('enquiry-profiles',        4, 'Enquiry Setup',        'fa-solid fa-sliders',               'enquiry-setup'),
            ('follow-ups-appointments', 1, 'Sales Follow-ups',     'fa-solid fa-phone',                 'sales-follow-ups'),
            ('follow-ups-appointments', 2, 'Service Follow-ups',   'fa-solid fa-headset',               'service-follow-ups'),
            ('follow-ups-appointments', 3, 'Service Appointments', 'fa-solid fa-calendar-check',        'service-appointments'),
            ('follow-ups-appointments', 4, 'Test Rides',           'fa-solid fa-road',                  'test-rides')
        ) AS t (menu_key, ord, name, icon, route_key)
        ORDER BY menu_key DESC, ord          -- enquiry-profiles first
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
JOIN   "NavigationModules" d ON d."Id" = m."NavigationModuleId" AND d."Code" = 'MOD-010'
LEFT   JOIN "NavigationSubmenus" s ON s."NavigationMenuId" = m."Id" AND s."IsDeleted" = false
WHERE  m."IsDeleted" = false
ORDER  BY m."DisplayOrder", s."DisplayOrder";
