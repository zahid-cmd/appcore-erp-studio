ROLLBACK;

-- =====================================================================
-- ServiceOperations_JobCard_Desks.sql   (2026-11-18)
-- ---------------------------------------------------------------------
-- STEP 2 of the job card stages (owner, 2026-11-17) : the desks of the
-- first two stages, and the tokens of the customer.
--
--   JobCards              + TokenSerial, WelcomeTokenNo, DeliveryTokenNo
--                           Given when the card is opened (not on an
--                           Internal job). The serial runs by service
--                           center and day :
--                             Welcome Drink   W-017
--                             Delivery        D-017-4821  (the last four
--                                             digits : a check code,
--                                             asked for at delivery)
--
--   Pages (Workshop Management), each a waiting list of the job cards :
--     Job Card Opening      the cards that are Open (not assigned yet);
--                           a new card is opened here and its two
--                           tokens are printed
--     Job Card Assignment   the cards to assign, and the assigned ones
--
-- Permissions : a user of a desk page has its stage without the page
-- action on Job Cards :
--     Add / Update on Job Card Opening      = opening a card, changing
--                                             it while it is Open
--     Add / Update on Job Card Assignment   = Assign Job Card
-- So a role is given its desk page only, and is blocked from the rest.
--
-- The pages are hand-written : NEVER run Menu / Submenu / Code Sync for
-- them.
--
-- Run ServiceOperations_JobCard_Stages.sql first.
-- Safe to run more than once. Run the whole script (F5). ASCII only.
--
-- AFTER : restart the API. Security & Permission > Activity Assignment :
-- tick Job Card Opening and Job Card Assignment for the roles, log in
-- again.
-- =====================================================================


-- ------------------------------------------------------------
-- 1. The tokens
-- ------------------------------------------------------------

ALTER TABLE public."JobCards"
    ADD COLUMN IF NOT EXISTS "TokenSerial"     integer               NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "WelcomeTokenNo"  character varying(20) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "DeliveryTokenNo" character varying(20) NOT NULL DEFAULT '';


-- ------------------------------------------------------------
-- 2. The desk pages, under Workshop Management
-- ------------------------------------------------------------

DO $$
DECLARE
    v_module    record;
    v_menu      record;
    v_seq       int;
    v_order     int;
    s           record;
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
        RAISE EXCEPTION 'Menu with route key workshop-management not found under Service Operations.';
    END IF;

    FOR s IN
        SELECT * FROM (VALUES
            (1, 'Job Card Opening',    'fa-solid fa-door-open',  'job-card-opening'),
            (2, 'Job Card Assignment', 'fa-solid fa-user-check', 'job-card-assignment')
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

        SELECT COALESCE(MAX("DisplayOrder"), 0) + 1 INTO v_order
        FROM   "NavigationSubmenus"
        WHERE  "NavigationMenuId" = v_menu."Id"
        AND    "IsDeleted" = false;

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
             v_order, NULL,
             true, false, 1, now());

        RAISE NOTICE 'Submenu created : %', s.name;
    END LOOP;
END
$$;


-- ------------------------------------------------------------
-- Check (run on its own) : the pages of Workshop Management
-- ------------------------------------------------------------
SELECT s."Code", s."Name", s."Route", s."DisplayOrder"
FROM   "NavigationSubmenus" s
JOIN   "NavigationMenus" m ON m."Id" = s."NavigationMenuId"
WHERE  s."IsDeleted" = false
AND    lower(m."RouteKey") = 'workshop-management'
ORDER  BY s."DisplayOrder";
