ROLLBACK;

-- =====================================================================
-- Service Operations > Workshop Management : the page Job Closing
-- (2026-11-19)
--
--   Workshop Management       /service-operations/workshop-management
--     Job Closing         (stage 4 : the job is priced and billed)
--
-- The menu Workshop Management is found by its route key; it is
-- never created here. A row that already exists (same route key) is
-- skipped, so it is safe to run again. Submenu names must be unique
-- system-wide (Code Sync) : the script refuses a duplicate. Run the
-- whole script (F5). No table is changed : the bill of a closed job
-- is a service invoice.
--
-- The page is hand-written : NEVER run Code Sync (Submenu Sync) for
-- it.
--
-- AFTER : tick the page (View, Add) for the roles in Security &
-- Permission > Activity Assignment, then log in again.
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
    AND    lower("RouteKey") = 'workshop-management'
    AND    "IsDeleted" = false;

    IF v_menu."Id" IS NULL THEN
        RAISE EXCEPTION 'Menu Workshop Management (route key workshop-management) not found.';
    END IF;

    IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
               WHERE  "NavigationMenuId" = v_menu."Id"
               AND    lower("RouteKey") = 'job-closing'
               AND    "IsDeleted" = false) THEN
        RAISE NOTICE 'Submenu exists, skipped : Job Closing';
        RETURN;
    END IF;

    -- Submenu names must be unique across the system (Code Sync)
    IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
               WHERE  lower("Name") = lower('Job Closing')
               AND    "IsDeleted" = false) THEN
        RAISE EXCEPTION 'A submenu named "Job Closing" already exists elsewhere : names must be unique (Code Sync).';
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
         'Job Closing', 'fa-solid fa-file-invoice-dollar',
         'job-closing',
         '/' || v_module."RouteKey" || '/' || v_menu."RouteKey" || '/job-closing',
         (SELECT COALESCE(MAX("DisplayOrder"), 0) + 1 FROM "NavigationSubmenus" WHERE "NavigationMenuId" = v_menu."Id" AND "IsDeleted" = false),
         NULL,
         true, false, 1, now());

    RAISE NOTICE 'Submenu created : Job Closing';
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
