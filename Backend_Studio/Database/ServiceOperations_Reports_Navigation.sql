ROLLBACK;

-- =====================================================================
-- Service Operations : menu Service Reports and its five pages
-- (2026-11-16, blueprint-service-operations.md step 6)
--
--   Service Reports                   /service-operations/service-reports
--     1  Service History          (per bike / customer)
--     2  Job Card Register
--     3  Technician Performance
--     4  Parts Consumption
--     5  Service Due List
--
-- The module is found by its route key (service-operations); it is
-- never created here. Rows that already exist (same route key) are
-- skipped, so it is safe to run again. Submenu names must be unique
-- system-wide (Code Sync) : the script refuses a duplicate. Run the
-- whole script (F5).
--
-- The pages are read-only and hand-written : NEVER run Code Sync
-- (Submenu Sync) for them.
--
-- AFTER : tick the pages for the roles in Security & Permission >
-- Activity Assignment, then log in again.
-- =====================================================================

DO $$
DECLARE
    v_module    record;
    v_menu      record;
    v_menu_id   bigint;
    v_seq       int;
    v_order     int;
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

    -- ---------- Menu ----------
    SELECT "Id" INTO v_menu_id
    FROM   "NavigationMenus"
    WHERE  "NavigationModuleId" = v_module."Id"
    AND    lower("RouteKey") = 'service-reports'
    AND    "IsDeleted" = false;

    IF v_menu_id IS NULL THEN
        SELECT COALESCE(MAX("SequenceNo"), 0) + 1 INTO v_seq
        FROM   "NavigationMenus"
        WHERE  "NavigationModuleId" = v_module."Id";

        SELECT COALESCE(MAX("DisplayOrder"), 0) + 1 INTO v_order
        FROM   "NavigationMenus"
        WHERE  "NavigationModuleId" = v_module."Id"
        AND    "IsDeleted" = false;

        INSERT INTO "NavigationMenus"
            ("NavigationModuleId", "SequenceNo", "Code", "Name", "Icon",
             "RouteKey", "Route", "DisplayOrder", "Remarks",
             "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        VALUES
            (v_module."Id", v_seq,
             'MNU-' || lpad(v_module."SequenceNo"::text, 3, '0') || '-' || lpad(v_seq::text, 3, '0'),
             'Service Reports', 'fa-solid fa-chart-column',
             'service-reports', '/' || v_module."RouteKey" || '/service-reports',
             v_order, NULL,
             true, false, 1, now())
        RETURNING "Id" INTO v_menu_id;

        RAISE NOTICE 'Menu created : Service Reports';
    ELSE
        RAISE NOTICE 'Menu exists, skipped : Service Reports';
    END IF;

    SELECT "Id", "SequenceNo", "RouteKey" INTO v_menu
    FROM   "NavigationMenus"
    WHERE  "Id" = v_menu_id;

    -- ---------- Submenus ----------
    FOR s IN
        SELECT * FROM (VALUES
            (1, 'Service History',        'fa-solid fa-clock-rotate-left', 'service-history'),
            (2, 'Job Card Register',      'fa-solid fa-book',              'job-card-register'),
            (3, 'Technician Performance', 'fa-solid fa-user-clock',        'technician-performance'),
            (4, 'Parts Consumption',      'fa-solid fa-gears',             'parts-consumption'),
            (5, 'Service Due List',       'fa-solid fa-calendar-check',    'service-due-list')
        ) AS t (ord, name, icon, route_key)
        ORDER BY ord
    LOOP
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
JOIN   "NavigationModules" d ON d."Id" = m."NavigationModuleId" AND lower(d."RouteKey") = 'service-operations'
LEFT   JOIN "NavigationSubmenus" s ON s."NavigationMenuId" = m."Id" AND s."IsDeleted" = false
WHERE  m."IsDeleted" = false
AND    lower(m."RouteKey") = 'service-reports'
ORDER  BY s."DisplayOrder";
