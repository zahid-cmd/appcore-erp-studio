ROLLBACK;

-- =====================================================================
-- Service Operations > Workshop Management : the submenu
-- Job Card Closing, placed right under Job Card Assignment
-- (2026-11-19)
--
--   Workshop Management       /service-operations/workshop-management
--     ...
--     Job Card Assignment
--     Job Card Closing    (stage 4 : the job is priced and billed)
--     ...
--
-- The page is the one of route key job-closing (the route does not
-- change, so the permissions already given stay).
--   - the submenu exists (named Job Closing) : it is renamed
--   - it does not exist                      : it is created
-- Then it is moved right under Job Card Assignment : the submenus
-- below move one place down.
--
-- Safe to run again (nothing changes the second time). Run the whole
-- script (F5). No table is changed.
--
-- The page is hand-written : NEVER run Code Sync (Submenu Sync) for
-- it.
--
-- AFTER : when the submenu was created here, tick the page (View, Add)
-- for the roles in Security & Permission > Activity Assignment. Log in
-- again to see the menu.
-- =====================================================================

DO $$
DECLARE
    v_module    record;
    v_menu      record;
    v_assign    record;
    v_closing   record;
    v_seq       int;
    v_name      text := 'Job Card Closing';
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

    SELECT "Id", "DisplayOrder" INTO v_assign
    FROM   "NavigationSubmenus"
    WHERE  "NavigationMenuId" = v_menu."Id"
    AND    lower("RouteKey") = 'job-card-assignment'
    AND    "IsDeleted" = false;

    IF v_assign."Id" IS NULL THEN
        RAISE EXCEPTION 'Submenu Job Card Assignment (route key job-card-assignment) not found.';
    END IF;

    -- Submenu names must be unique across the system (Code Sync)
    IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
               WHERE  lower("Name") = lower(v_name)
               AND    NOT ("NavigationMenuId" = v_menu."Id" AND lower("RouteKey") = 'job-closing')
               AND    "IsDeleted" = false) THEN
        RAISE EXCEPTION 'A submenu named "%" already exists elsewhere : names must be unique (Code Sync).', v_name;
    END IF;

    SELECT "Id", "Name", "DisplayOrder" INTO v_closing
    FROM   "NavigationSubmenus"
    WHERE  "NavigationMenuId" = v_menu."Id"
    AND    lower("RouteKey") = 'job-closing'
    AND    "IsDeleted" = false;

    IF v_closing."Id" IS NULL THEN
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
             v_name, 'fa-solid fa-file-invoice-dollar',
             'job-closing',
             '/' || v_module."RouteKey" || '/' || v_menu."RouteKey" || '/job-closing',
             (SELECT COALESCE(MAX("DisplayOrder"), 0) + 1 FROM "NavigationSubmenus" WHERE "NavigationMenuId" = v_menu."Id" AND "IsDeleted" = false),
             NULL,
             true, false, 1, now());

        RAISE NOTICE 'Submenu created : %', v_name;

        SELECT "Id", "Name", "DisplayOrder" INTO v_closing
        FROM   "NavigationSubmenus"
        WHERE  "NavigationMenuId" = v_menu."Id"
        AND    lower("RouteKey") = 'job-closing'
        AND    "IsDeleted" = false;
    ELSIF v_closing."Name" <> v_name THEN
        UPDATE "NavigationSubmenus" SET "Name" = v_name WHERE "Id" = v_closing."Id";

        RAISE NOTICE 'Submenu renamed : % -> %', v_closing."Name", v_name;
    ELSE
        RAISE NOTICE 'Submenu already named : %', v_name;
    END IF;

    -- right under Job Card Assignment : already there when it holds
    -- the next place alone
    IF v_closing."DisplayOrder" = v_assign."DisplayOrder" + 1
       AND NOT EXISTS (SELECT 1 FROM "NavigationSubmenus"
                       WHERE  "NavigationMenuId" = v_menu."Id"
                       AND    "Id" <> v_closing."Id"
                       AND    "DisplayOrder" = v_assign."DisplayOrder" + 1
                       AND    "IsDeleted" = false) THEN
        RAISE NOTICE 'Already right under Job Card Assignment.';
    ELSE
        UPDATE "NavigationSubmenus"
        SET    "DisplayOrder" = "DisplayOrder" + 1
        WHERE  "NavigationMenuId" = v_menu."Id"
        AND    "Id" <> v_closing."Id"
        AND    "DisplayOrder" > v_assign."DisplayOrder";

        UPDATE "NavigationSubmenus"
        SET    "DisplayOrder" = v_assign."DisplayOrder" + 1
        WHERE  "Id" = v_closing."Id";

        RAISE NOTICE 'Moved right under Job Card Assignment.';
    END IF;
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
