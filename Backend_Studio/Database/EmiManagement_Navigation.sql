-- =====================================================================
-- EmiManagement_Navigation.sql   (2026-11-03)
-- ---------------------------------------------------------------------
-- Creates the menus and submenus of the EMI Management module, the
-- same way the Navigation page does :
--   Code   MNU-<module seq>-<menu seq> / SUB-<module>-<menu>-<sub>
--   Route  /<module route key>/<menu route key>/<submenu route key>
--   SequenceNo = next number (deleted rows counted)
-- and MOVES the existing submenu EMI Reimbursement Schemes from
-- Settings > Account Settings to EMI Management > EMI Setup.
--
-- BEFORE : create the module on the Navigation page
--   Name : EMI Management       Route key : emi-management
-- (the script finds it by that route key; it never creates a module).
--
-- Rule : a dashboard is always submenu 1 of its menu.
--
--   EMI Control                /emi-management/emi-control
--     1  EMI Dashboard               (read-only : NO Code Sync)
--     2  EMI Configuration           (hand-written setup : NO Code Sync)
--   EMI Setup                  /emi-management/emi-setup
--     1  EMI Plans                   (In-House EMI : method, rate, tenures,
--                                     down payment, penal and rebate rules)
--     2  EMI Rate Charts             (Credit Card EMI : bank x tenure rates)
--     3  EMI Reimbursement Schemes   (MOVED here from Account Settings)
--   In-House EMI               /emi-management/in-house-emi
--     1  EMI Agreements
--     2  EMI Collections
--     3  EMI Overdues & Penalties
--     4  EMI Reschedules & Closures
--   Credit Card EMI            /emi-management/credit-card-emi
--     1  Credit Card EMI Sales
--     2  Credit Card EMI Settlements
--   EMI Claims                 /emi-management/emi-claims
--     (Credit Card EMI only)
--     1  EMI Claim Sheets
--     2  EMI Claim Collections
--
-- The move (same as the Navigation page's move) : the submenu keeps its
-- Id, name and route key (so role permissions stay); its menu, code,
-- sequence no, route and display order change, and every table that
-- keeps the code / module / menu follows :
--   INF_SubmenuSynchronization, CodeSynchronizations, SystemConfigurations,
--   MasterActivityPages, ActivityAssignmentDetails, SpecialAssignmentDetails.
-- Frontend / backend files are NOT moved by this script : the page
-- folder, route registration, API route and namespaces follow in code.
--
-- Submenu names must be unique system-wide (Code Sync) : the script
-- refuses a duplicate. Rows that already exist (same route key) are
-- skipped; existing rows are never changed except the moved one.
-- One transaction. Run the whole script (F5). Safe to run again.
--
-- AFTER : Menu Sync; Submenu Sync (Code Sync) only for the pages as we
-- build them (never for the dashboard / configuration pages); tick the
-- new pages for the roles in Security & Permission > Activity
-- Assignment, then log in again.
-- =====================================================================

DO $$
DECLARE
    v_module    record;
    v_menu      record;
    v_menu_id   bigint;
    v_seq       int;
    v_code      text;
    v_old_code  text;
    m           record;
    s           record;
    t           text;
    n           bigint;
BEGIN
    -- ---------- Module (created on the Navigation page) ----------
    SELECT "Id", "SequenceNo", "RouteKey", "Name", "Code" INTO v_module
    FROM   "NavigationModules"
    WHERE  lower("RouteKey") = 'emi-management'
    AND    "IsDeleted" = false;

    IF v_module."Id" IS NULL THEN
        RAISE EXCEPTION 'Module with route key emi-management not found : create "EMI Management" on the Navigation page first.';
    END IF;

    RAISE NOTICE 'Module % % (route key %)', v_module."Code", v_module."Name", v_module."RouteKey";

    -- ---------- Menus ----------
    FOR m IN
        SELECT * FROM (VALUES
            (1, 'EMI Control',     'fa-solid fa-sliders',               'emi-control'),
            (2, 'EMI Setup',       'fa-solid fa-screwdriver-wrench',    'emi-setup'),
            (3, 'In-House EMI',    'fa-solid fa-handshake',             'in-house-emi'),
            (4, 'Credit Card EMI', 'fa-solid fa-credit-card',           'credit-card-emi'),
            (5, 'EMI Claims',      'fa-solid fa-file-invoice-dollar',   'emi-claims')
        ) AS x (ord, name, icon, route_key)
        ORDER BY ord
    LOOP
        v_menu_id := NULL;

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

    -- ---------- Submenus (new) ----------
    FOR s IN
        SELECT * FROM (VALUES
            (1, 'emi-control',     1, 'EMI Dashboard',               'fa-solid fa-chart-pie',             'emi-dashboard'),
            (1, 'emi-control',     2, 'EMI Configuration',           'fa-solid fa-gear',                  'emi-configuration'),
            (2, 'emi-setup',       1, 'EMI Plans',                   'fa-solid fa-calculator',            'emi-plans'),
            (2, 'emi-setup',       2, 'EMI Rate Charts',             'fa-solid fa-table-list',            'emi-rate-charts'),
            (3, 'in-house-emi',    1, 'EMI Agreements',              'fa-solid fa-file-contract',         'emi-agreements'),
            (3, 'in-house-emi',    2, 'EMI Collections',             'fa-solid fa-hand-holding-dollar',   'emi-collections'),
            (3, 'in-house-emi',    3, 'EMI Overdues & Penalties',    'fa-solid fa-triangle-exclamation',  'emi-overdues-penalties'),
            (3, 'in-house-emi',    4, 'EMI Reschedules & Closures',  'fa-solid fa-calendar-check',        'emi-reschedules-closures'),
            (4, 'credit-card-emi', 1, 'Credit Card EMI Sales',       'fa-solid fa-receipt',               'credit-card-emi-sales'),
            (4, 'credit-card-emi', 2, 'Credit Card EMI Settlements', 'fa-solid fa-scale-balanced',        'credit-card-emi-settlements'),
            (5, 'emi-claims',      1, 'EMI Claim Sheets',            'fa-solid fa-file-lines',            'emi-claim-sheets'),
            (5, 'emi-claims',      2, 'EMI Claim Collections',       'fa-solid fa-money-check-dollar',    'emi-claim-collections')
        ) AS x (menu_ord, menu_key, ord, name, icon, route_key)
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

    -- ---------- Move EMI Reimbursement Schemes -> EMI Setup ----------
    SELECT "Id", "SequenceNo", "Code", "Name", "RouteKey" INTO v_menu
    FROM   "NavigationMenus"
    WHERE  "NavigationModuleId" = v_module."Id"
    AND    lower("RouteKey") = 'emi-setup'
    AND    "IsDeleted" = false;

    SELECT sm."Id", sm."Code", sm."NavigationMenuId", sm."RouteKey", sm."Route" INTO s
    FROM   "NavigationSubmenus" sm
    WHERE  lower(sm."RouteKey") = 'emi-reimbursement-schemes'
    AND    sm."IsDeleted" = false
    ORDER  BY sm."Id"
    LIMIT  1;

    IF s."Id" IS NULL THEN
        RAISE NOTICE 'EMI Reimbursement Schemes not found : nothing to move.';
    ELSIF s."NavigationMenuId" = v_menu."Id" THEN
        RAISE NOTICE 'EMI Reimbursement Schemes already under EMI Setup, skipped (%).', s."Code";
    ELSE
        v_old_code := s."Code";

        SELECT COALESCE(MAX("SequenceNo"), 0) + 1 INTO v_seq
        FROM   "NavigationSubmenus"
        WHERE  "NavigationMenuId" = v_menu."Id";

        v_code := 'SUB-' || substr(v_menu."Code", 5) || '-' || lpad(v_seq::text, 3, '0');

        IF EXISTS (SELECT 1 FROM "NavigationSubmenus" WHERE "Code" = v_code) THEN
            RAISE EXCEPTION 'Code % is already used : move stopped.', v_code;
        END IF;

        UPDATE "NavigationSubmenus"
        SET    "NavigationMenuId" = v_menu."Id",
               "SequenceNo"       = v_seq,
               "Code"             = v_code,
               "Route"            = '/' || v_module."RouteKey" || '/' || v_menu."RouteKey" || '/' || s."RouteKey",
               "DisplayOrder"     = 3
        WHERE  "Id" = s."Id";

        RAISE NOTICE 'Moved EMI Reimbursement Schemes : % (%) -> % (/%/%/%)',
            v_old_code, s."Route", v_code, v_module."RouteKey", v_menu."RouteKey", s."RouteKey";

        -- References (same as NavigationMoveReferences.SubmenuMovedAsync)
        FOREACH t IN ARRAY ARRAY['INF_SubmenuSynchronization', 'CodeSynchronizations']
        LOOP
            IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
                EXECUTE format(
                    'UPDATE public.%I
                     SET    "SubmenuCode" = $1,
                            "ModuleId" = $2, "ModuleCode" = $3, "ModuleName" = $4,
                            "MenuId" = $5, "MenuCode" = $6, "MenuName" = $7
                     WHERE  "SubmenuId" = $8', t)
                USING v_code, v_module."Id", v_module."Code", v_module."Name",
                      v_menu."Id", v_menu."Code", v_menu."Name", s."Id";
                GET DIAGNOSTICS n = ROW_COUNT;
                RAISE NOTICE '% : % row(s) updated', t, n;
            ELSE
                RAISE NOTICE '% not found, skipped', t;
            END IF;
        END LOOP;

        IF to_regclass('public."SystemConfigurations"') IS NOT NULL THEN
            UPDATE "SystemConfigurations"
            SET    "NavigationSubmenuCode" = v_code,
                   "NavigationMenuCode"    = v_menu."Code",
                   "NavigationModuleId"    = v_module."Id"
            WHERE  "NavigationSubmenuCode" = v_old_code;
            GET DIAGNOSTICS n = ROW_COUNT;
            RAISE NOTICE 'SystemConfigurations : % row(s) updated', n;
        END IF;

        IF to_regclass('public."MasterActivityPages"') IS NOT NULL THEN
            UPDATE "MasterActivityPages"
            SET    "NavigationSubmenuCode" = v_code
            WHERE  "NavigationSubmenuCode" = v_old_code;
            GET DIAGNOSTICS n = ROW_COUNT;
            RAISE NOTICE 'MasterActivityPages : % row(s) updated', n;
        END IF;

        FOREACH t IN ARRAY ARRAY['ActivityAssignmentDetails', 'SpecialAssignmentDetails']
        LOOP
            IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
                EXECUTE format(
                    'UPDATE public.%I
                     SET    "ModuleId" = $1, "MenuId" = $2
                     WHERE  "SubMenuId" = $3', t)
                USING v_module."Id", v_menu."Id", s."Id";
                GET DIAGNOSTICS n = ROW_COUNT;
                RAISE NOTICE '% : % row(s) updated', t, n;
            ELSE
                RAISE NOTICE '% not found, skipped', t;
            END IF;
        END LOOP;
    END IF;
END
$$;


-- ---------------------------------------------------------------------
-- Check (run on its own)
-- ---------------------------------------------------------------------

SELECT m."Code"  AS "Menu Code",  m."Name" AS "Menu",
       s."Code"  AS "Submenu Code", s."Name" AS "Submenu",
       s."Icon", s."Route", s."DisplayOrder"
FROM   "NavigationMenus" m
JOIN   "NavigationModules" d ON d."Id" = m."NavigationModuleId" AND lower(d."RouteKey") = 'emi-management'
LEFT   JOIN "NavigationSubmenus" s ON s."NavigationMenuId" = m."Id" AND s."IsDeleted" = false
WHERE  m."IsDeleted" = false
ORDER  BY m."DisplayOrder", s."DisplayOrder";
