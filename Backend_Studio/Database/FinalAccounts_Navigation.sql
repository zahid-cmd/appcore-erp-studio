ROLLBACK;

-- =====================================================================
-- FinalAccounts_Navigation.sql   (2026-11-14)
-- ---------------------------------------------------------------------
-- Accounts & Finance > Financial Statements : two more pages
--   Profit & Loss   /accounts-finance/financial-statements/profit-loss
--   Balance Sheet   /accounts-finance/financial-statements/balance-sheet
-- (hand-written read-only pages : NEVER run Menu Sync / Submenu
-- Sync / Code Sync for them)
--
-- Page activities : the same activities the Trial Balance page has
-- (View, Print ...) are linked to both pages.
--
-- Needs TrialBalance_Navigation.sql first (the Financial Statements
-- menu and the Trial Balance page). Rows that already exist are
-- skipped : safe to run again. Run the whole script (F5). ASCII only.
--
-- AFTER : Security & Permission > Activity Assignment : tick View
-- (and Print) on Profit & Loss and Balance Sheet for the roles, then
-- log in again.
-- =====================================================================

DO $$
DECLARE
    v_module    record;
    v_menu      record;
    v_tb_code   text;
    v_sub_code  text;
    v_seq       int;
    v_links     int;
    p           record;
    a           record;
BEGIN
    -- ---------- Module ----------
    SELECT "Id", "SequenceNo", "RouteKey", "Name", "Code" INTO v_module
    FROM   "NavigationModules"
    WHERE  lower("RouteKey") = 'accounts-finance'
    AND    "IsDeleted" = false;

    IF v_module."Id" IS NULL THEN
        RAISE EXCEPTION 'Module with route key accounts-finance not found - nothing changed.';
    END IF;

    -- ---------- Menu : Financial Statements ----------
    SELECT "Id", "SequenceNo", "RouteKey", "Code" INTO v_menu
    FROM   "NavigationMenus"
    WHERE  "NavigationModuleId" = v_module."Id"
    AND    lower("RouteKey") = 'financial-statements'
    AND    "IsDeleted" = false;

    IF v_menu."Id" IS NULL THEN
        RAISE EXCEPTION 'Menu Financial Statements not found : run TrialBalance_Navigation.sql first - nothing changed.';
    END IF;

    UPDATE "NavigationMenus"
    SET    "Remarks" = 'Trial Balance, Profit & Loss, Balance Sheet.'
    WHERE  "Id" = v_menu."Id";

    -- Trial Balance page (its activities are copied)
    SELECT "Code" INTO v_tb_code
    FROM   "NavigationSubmenus"
    WHERE  "NavigationMenuId" = v_menu."Id"
    AND    lower("RouteKey") = 'trial-balance'
    AND    "IsDeleted" = false;

    -- ---------- Pages ----------
    FOR p IN
        SELECT *
        FROM (VALUES
            (2, 'profit-loss',   'Profit & Loss', 'fa-solid fa-chart-line',
             'Sales, cost of goods sold, gross and net profit; comparison and business lines (read only).'),
            (3, 'balance-sheet', 'Balance Sheet', 'fa-solid fa-building-columns',
             'Assets, liabilities and equity on a date; comparison and balance check (read only).')
        ) AS t(display_order, route_key, page_name, icon, remarks)
        ORDER BY 1
    LOOP
        SELECT "Code" INTO v_sub_code
        FROM   "NavigationSubmenus"
        WHERE  "NavigationMenuId" = v_menu."Id"
        AND    lower("RouteKey") = p.route_key
        AND    "IsDeleted" = false;

        IF v_sub_code IS NULL THEN
            -- Submenu names must be unique across the system (Code Sync)
            IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
                       WHERE  lower("Name") = lower(p.page_name)
                       AND    "IsDeleted" = false) THEN
                RAISE EXCEPTION 'A submenu named "%" already exists elsewhere - nothing changed.', p.page_name;
            END IF;

            SELECT COALESCE(MAX("SequenceNo"), 0) + 1 INTO v_seq
            FROM   "NavigationSubmenus"
            WHERE  "NavigationMenuId" = v_menu."Id";

            v_sub_code :=
                'SUB-' || lpad(v_module."SequenceNo"::text, 3, '0')
                       || '-' || lpad(v_menu."SequenceNo"::text, 3, '0')
                       || '-' || lpad(v_seq::text, 3, '0');

            INSERT INTO "NavigationSubmenus"
                ("NavigationMenuId", "SequenceNo", "Code", "Name", "Icon",
                 "RouteKey", "Route", "DisplayOrder", "Remarks",
                 "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
            VALUES
                (v_menu."Id", v_seq, v_sub_code, p.page_name, p.icon,
                 p.route_key,
                 '/' || v_module."RouteKey" || '/' || v_menu."RouteKey" || '/' || p.route_key,
                 p.display_order, p.remarks,
                 true, false, 1, now());

            RAISE NOTICE 'Submenu created : % %', v_sub_code, p.page_name;
        ELSE
            RAISE NOTICE 'Submenu exists, skipped : % %', v_sub_code, p.page_name;
        END IF;

        -- ---------- Activities : copy the links of Trial Balance ----------
        IF v_tb_code IS NULL THEN
            RAISE NOTICE 'Trial Balance page not found : no activities copied to % (link View / Print by hand).', p.page_name;
        ELSE
            v_links := 0;

            FOR a IN
                SELECT DISTINCT m."MasterActivityCode"
                FROM   "MasterActivityPages" m
                WHERE  m."NavigationSubmenuCode" = v_tb_code
            LOOP
                IF NOT EXISTS (SELECT 1 FROM "MasterActivityPages"
                               WHERE "MasterActivityCode" = a."MasterActivityCode"
                               AND   "NavigationSubmenuCode" = v_sub_code) THEN
                    IF EXISTS (SELECT 1 FROM information_schema.columns
                               WHERE table_name = 'MasterActivityPages' AND column_name = 'CreatedBy') THEN
                        EXECUTE format('INSERT INTO "MasterActivityPages" ("MasterActivityCode", "NavigationSubmenuCode", "CreatedDate", "CreatedBy") VALUES (%L, %L, now(), 1)',
                                       a."MasterActivityCode", v_sub_code);
                    ELSE
                        EXECUTE format('INSERT INTO "MasterActivityPages" ("MasterActivityCode", "NavigationSubmenuCode", "CreatedDate") VALUES (%L, %L, now())',
                                       a."MasterActivityCode", v_sub_code);
                    END IF;

                    v_links := v_links + 1;
                END IF;
            END LOOP;

            RAISE NOTICE 'Activities linked to % from Trial Balance (%) : %', p.page_name, v_tb_code, v_links;
        END IF;
    END LOOP;
END
$$;


-- ---------------------------------------------------------------------
-- Check (run on its own)
-- ---------------------------------------------------------------------

SELECT m."Code" AS "Menu Code", m."Name" AS "Menu",
       s."Code" AS "Page Code", s."Name" AS "Page", s."Route", s."DisplayOrder",
       (SELECT string_agg(x."MasterActivityCode", ', ')
        FROM   "MasterActivityPages" x
        WHERE  x."NavigationSubmenuCode" = s."Code") AS "Activities"
FROM   "NavigationMenus" m
LEFT   JOIN "NavigationSubmenus" s ON s."NavigationMenuId" = m."Id" AND s."IsDeleted" = false
WHERE  m."IsDeleted" = false AND lower(m."RouteKey") = 'financial-statements'
ORDER  BY s."DisplayOrder", s."SequenceNo";
