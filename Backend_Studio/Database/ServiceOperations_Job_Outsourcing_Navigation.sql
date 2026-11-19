ROLLBACK;

-- =====================================================================
-- Service Operations > Workshop Management : the page Job Outsourcing
-- (2026-11-19)
--
--   Workshop Management       /service-operations/workshop-management
--     ...
--     Job Outsourcing     (outside works and parts bought outside for
--                          a job in work)
--     Job Card Closing
--     ...
--
-- The submenu is created and placed right above Job Card Closing
-- (route key job-closing) : that one and the submenus below it move
-- one place down. When Job Card Closing is not there yet, the submenu
-- goes to the end.
--
-- The menu Workshop Management is found by its route key; it is never
-- created here. Safe to run again : a submenu that exists (same route
-- key) is skipped. Submenu names must be unique system-wide (Code
-- Sync) : the script refuses a duplicate. Run the whole script (F5).
-- No table is changed : the entries are the ones of Parts Outsourcing.
--
-- The page is hand-written : NEVER run Code Sync (Submenu Sync) for
-- it.
--
-- AFTER : tick the page (View, Add, Delete) for the roles in Security
-- & Permission > Activity Assignment, then log in again.
--   View   : see the jobs and their entries
--   Add    : add an outside work / an outsourced part
--   Delete : cancel an entry
-- =====================================================================

DO $$
DECLARE
    v_module    record;
    v_menu      record;
    v_closing   record;
    v_seq       int;
    v_order     int;
    v_name      text := 'Job Outsourcing';
BEGIN
    SELECT "Id", "SequenceNo", "RouteKey" INTO v_module
    FROM   "NavigationModules"
    WHERE  lower("RouteKey") = 'service-operations'
    AND    "IsDeleted" = false;

    IF v_module."Id" IS NULL THEN
        RAISE EXCEPTION 'Module with route key service-operations not found.';
    END IF;

    SELECT "Id", "SequenceNo", "RouteKey" INTO v_menu
    FROM   "NavigationMenus"
    WHERE  "NavigationModuleId" = v_module."Id"
    AND    lower("RouteKey") = 'workshop-management'
    AND    "IsDeleted" = false;

    IF v_menu."Id" IS NULL THEN
        RAISE EXCEPTION 'Menu Workshop Management (route key workshop-management) not found.';
    END IF;

    IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
               WHERE  "NavigationMenuId" = v_menu."Id"
               AND    lower("RouteKey") = 'job-outsourcing'
               AND    "IsDeleted" = false) THEN
        RAISE NOTICE 'Submenu exists, skipped : %', v_name;
        RETURN;
    END IF;

    -- Submenu names must be unique across the system (Code Sync)
    IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
               WHERE  lower("Name") = lower(v_name)
               AND    "IsDeleted" = false) THEN
        RAISE EXCEPTION 'A submenu named "%" already exists elsewhere : names must be unique (Code Sync).', v_name;
    END IF;

    SELECT "Id", "DisplayOrder" INTO v_closing
    FROM   "NavigationSubmenus"
    WHERE  "NavigationMenuId" = v_menu."Id"
    AND    lower("RouteKey") = 'job-closing'
    AND    "IsDeleted" = false;

    IF v_closing."Id" IS NULL THEN
        SELECT COALESCE(MAX("DisplayOrder"), 0) + 1 INTO v_order
        FROM   "NavigationSubmenus"
        WHERE  "NavigationMenuId" = v_menu."Id"
        AND    "IsDeleted" = false;
    ELSE
        v_order := v_closing."DisplayOrder";

        -- Job Card Closing and what is below it move one place down
        UPDATE "NavigationSubmenus"
        SET    "DisplayOrder" = "DisplayOrder" + 1
        WHERE  "NavigationMenuId" = v_menu."Id"
        AND    "DisplayOrder" >= v_order;
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
         v_name, 'fa-solid fa-truck-ramp-box',
         'job-outsourcing',
         '/' || v_module."RouteKey" || '/' || v_menu."RouteKey" || '/job-outsourcing',
         v_order,
         NULL,
         true, false, 1, now());

    RAISE NOTICE 'Submenu created : %', v_name;
END
$$;


-- ---------------------------------------------------------------------
-- Check (run on its own)
-- ---------------------------------------------------------------------

SELECT s."Code" AS "Submenu Code", s."Name" AS "Submenu",
       s."Icon", s."Route", s."DisplayOrder"
FROM   "NavigationSubmenus" s
JOIN   "NavigationMenus" m ON m."Id" = s."NavigationMenuId" AND lower(m."RouteKey") = 'workshop-management' AND m."IsDeleted" = false
JOIN   "NavigationModules" d ON d."Id" = m."NavigationModuleId" AND lower(d."RouteKey") = 'service-operations'
WHERE  s."IsDeleted" = false
ORDER  BY s."DisplayOrder";
