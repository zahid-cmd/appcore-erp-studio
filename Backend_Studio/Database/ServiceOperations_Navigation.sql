-- =====================================================================
-- ServiceOperations_Navigation.sql   (2026-11-03)
-- ---------------------------------------------------------------------
-- Creates the menus and submenus of the Service Operations module, the
-- same way the Navigation page does :
--   Code   MNU-<module seq>-<menu seq> / SUB-<module>-<menu>-<sub>
--   Route  /<module route key>/<menu route key>/<submenu route key>
--   SequenceNo = next number (deleted rows counted)
--
-- BEFORE : create the module on the Navigation page
--   Name : Service Operations   Route key : service-operations
-- (the script finds it by that route key; it never creates a module).
--
--   Workshop Management               /service-operations/workshop-management
--     1  Service Estimates
--     2  Job Cards
--     3  Parts Requisitions
--     4  Parts Issues            (switch "Issue without Requisition"
--                                 comes with the page build)
--     5  Parts Returns
--     6  Parts Back-Orders       (switch : daily / on command)
--     7  Workshop Dashboard      (read-only page : NO Code Sync)
--     8  Workshop Configuration  (hand-written setup page : NO Code Sync)
--   Service Billing                   /service-operations/service-billing
--     1  Service Invoices
--     2  Service Returns
--     3  Free Service Claims
--
-- Service Appointments / Service Follow-ups stay in Enquiry Management;
-- warranty claims go to Warranty Management. Submenu names must be
-- unique system-wide (Code Sync) : the script refuses a duplicate.
-- Rows that already exist (same route key) are skipped, so it is safe
-- to run again. One transaction. Run the whole script (F5).
--
-- AFTER : Menu Sync; Submenu Sync (Code Sync) only for the pages as
-- we build them (never for Workshop Dashboard / Workshop
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
    WHERE  lower("RouteKey") = 'service-operations'
    AND    "IsDeleted" = false;

    IF v_module."Id" IS NULL THEN
        RAISE EXCEPTION 'Module with route key service-operations not found : create "Service Operations" on the Navigation page first.';
    END IF;

    RAISE NOTICE 'Module % % (route key %)', v_module."Code", v_module."Name", v_module."RouteKey";

    -- ---------- Menus ----------
    FOR m IN
        SELECT * FROM (VALUES
            (1, 'Workshop Management', 'fa-solid fa-screwdriver-wrench',  'workshop-management'),
            (2, 'Service Billing',     'fa-solid fa-file-invoice-dollar', 'service-billing')
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
            (1, 'workshop-management', 1, 'Service Estimates',      'fa-solid fa-file-pen',            'service-estimates'),
            (1, 'workshop-management', 2, 'Job Cards',              'fa-solid fa-clipboard-list',      'job-cards'),
            (1, 'workshop-management', 3, 'Parts Requisitions',     'fa-solid fa-clipboard-question',  'parts-requisitions'),
            (1, 'workshop-management', 4, 'Parts Issues',           'fa-solid fa-dolly',               'parts-issues'),
            (1, 'workshop-management', 5, 'Parts Returns',          'fa-solid fa-rotate-left',         'parts-returns'),
            (1, 'workshop-management', 6, 'Parts Back-Orders',      'fa-solid fa-hourglass-half',      'parts-back-orders'),
            (1, 'workshop-management', 7, 'Workshop Dashboard',     'fa-solid fa-gauge-high',          'workshop-dashboard'),
            (1, 'workshop-management', 8, 'Workshop Configuration', 'fa-solid fa-sliders',             'workshop-configuration'),
            (2, 'service-billing',     1, 'Service Invoices',       'fa-solid fa-file-invoice',        'service-invoices'),
            (2, 'service-billing',     2, 'Service Returns',        'fa-solid fa-arrow-rotate-left',   'service-returns'),
            (2, 'service-billing',     3, 'Free Service Claims',    'fa-solid fa-hand-holding-dollar', 'free-service-claims')
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
-- Dashboard first (rule, owner 2026-11-03) : Workshop Dashboard becomes submenu 1
-- of its menu; the others keep their order behind it. Codes unchanged.
-- ---------------------------------------------------------------------

WITH dash AS
(
    SELECT s."Id", s."NavigationMenuId"
    FROM   "NavigationSubmenus" s
    JOIN   "NavigationMenus"    m ON m."Id" = s."NavigationMenuId" AND m."IsDeleted" = false
    JOIN   "NavigationModules"  d ON d."Id" = m."NavigationModuleId" AND d."IsDeleted" = false
    WHERE  s."IsDeleted" = false
    AND    lower(d."RouteKey") = 'service-operations'
    AND    lower(m."RouteKey") = 'workshop-management'
    AND    lower(s."RouteKey") = 'workshop-dashboard'
),
ordered AS
(
    SELECT s."Id",
           row_number() OVER
           (
               PARTITION BY s."NavigationMenuId"
               ORDER BY CASE WHEN s."Id" IN (SELECT "Id" FROM dash) THEN 0 ELSE 1 END,
                        s."DisplayOrder",
                        s."SequenceNo"
           ) AS rn
    FROM   "NavigationSubmenus" s
    WHERE  s."IsDeleted" = false
    AND    s."NavigationMenuId" IN (SELECT "NavigationMenuId" FROM dash)
)
UPDATE "NavigationSubmenus" u
SET    "DisplayOrder" = o.rn
FROM   ordered o
WHERE  u."Id" = o."Id"
AND    u."DisplayOrder" IS DISTINCT FROM o.rn;


-- ---------------------------------------------------------------------
-- Check (run on its own)
-- ---------------------------------------------------------------------

SELECT m."Code"  AS "Menu Code",  m."Name" AS "Menu",
       s."Code"  AS "Submenu Code", s."Name" AS "Submenu",
       s."Icon", s."Route", s."DisplayOrder"
FROM   "NavigationMenus" m
JOIN   "NavigationModules" d ON d."Id" = m."NavigationModuleId" AND lower(d."RouteKey") = 'service-operations'
LEFT   JOIN "NavigationSubmenus" s ON s."NavigationMenuId" = m."Id" AND s."IsDeleted" = false
WHERE  m."IsDeleted" = false
ORDER  BY m."DisplayOrder", s."DisplayOrder";
