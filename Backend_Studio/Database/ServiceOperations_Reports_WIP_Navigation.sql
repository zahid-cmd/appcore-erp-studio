ROLLBACK;

-- =====================================================================
-- Service Operations > Service Reports : the page Work In Progress
-- (2026-11-19)
--
--   Service Reports                   /service-operations/service-reports
--     6  Work In Progress         (parts on the jobs not invoiced yet)
--
-- The menu Service Reports is found by its route key; it is never
-- created here (run ServiceOperations_Reports_Navigation.sql first).
-- A row that already exists (same route key) is skipped, so it is
-- safe to run again. Submenu names must be unique system-wide (Code
-- Sync) : the script refuses a duplicate. Run the whole script (F5).
--
-- The page is read-only and hand-written : NEVER run Code Sync
-- (Submenu Sync) for it.
--
-- AFTER : tick the page for the roles in Security & Permission >
-- Activity Assignment, then log in again.
-- =====================================================================

DO $$
DECLARE
    v_module    record;
    v_menu      record;
    v_seq       int;
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
    AND    lower("RouteKey") = 'service-reports'
    AND    "IsDeleted" = false;

    IF v_menu."Id" IS NULL THEN
        RAISE EXCEPTION 'Menu Service Reports not found : run ServiceOperations_Reports_Navigation.sql first.';
    END IF;

    IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
               WHERE  "NavigationMenuId" = v_menu."Id"
               AND    lower("RouteKey") = 'work-in-progress'
               AND    "IsDeleted" = false) THEN
        RAISE NOTICE 'Submenu exists, skipped : Work In Progress';
        RETURN;
    END IF;

    -- Submenu names must be unique across the system (Code Sync)
    IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
               WHERE  lower("Name") = lower('Work In Progress')
               AND    "IsDeleted" = false) THEN
        RAISE EXCEPTION 'A submenu named "Work In Progress" already exists elsewhere : names must be unique (Code Sync).';
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
         'Work In Progress', 'fa-solid fa-hourglass-half',
         'work-in-progress',
         '/' || v_module."RouteKey" || '/' || v_menu."RouteKey" || '/work-in-progress',
         6, NULL,
         true, false, 1, now());

    RAISE NOTICE 'Submenu created : Work In Progress';
END
$$;


-- ---------------------------------------------------------------------
-- Check (run on its own)
-- ---------------------------------------------------------------------

SELECT s."Code" AS "Submenu Code", s."Name" AS "Submenu",
       s."Icon", s."Route", s."DisplayOrder"
FROM   "NavigationSubmenus" s
JOIN   "NavigationMenus" m ON m."Id" = s."NavigationMenuId" AND lower(m."RouteKey") = 'service-reports' AND m."IsDeleted" = false
JOIN   "NavigationModules" d ON d."Id" = m."NavigationModuleId" AND lower(d."RouteKey") = 'service-operations'
WHERE  s."IsDeleted" = false
ORDER  BY s."DisplayOrder";
