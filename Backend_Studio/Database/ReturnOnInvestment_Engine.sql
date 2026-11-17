ROLLBACK;

-- =====================================================================
-- ReturnOnInvestment_Engine.sql   (2026-11-16)
-- ---------------------------------------------------------------------
-- 1. Account Sub Groups : "Finance cost" switch
--      "AccountSubGroups"."IsFinanceCost" (default false). Expense
--      sub groups switched on are added back to Net Profit to get
--      Profit before interest (ROCE). Added on the first run only,
--      and on that run SUB-004-001-001 (Financial Expenses) is
--      switched on, by code. After that the Account Sub Group form
--      decides : a re-run changes nothing.
--
-- 2. Accounts & Finance > Financial Statements : one more page
--      Return on Investment
--      /accounts-finance/financial-statements/return-on-investment
--    (hand-written read-only page : NEVER run Menu Sync / Submenu
--    Sync / Code Sync for it). The Trial Balance page's activities
--    (View, Print ...) are linked to it.
--
-- Needs TrialBalance_Navigation.sql first. Safe to run again. Run
-- the whole script (F5). ASCII only.
--
-- AFTER : Security & Permission > Activity Assignment : tick View
-- (and Print) on Return on Investment for the roles, then log in
-- again.
-- =====================================================================

-- ---------- 1. Finance cost switch ----------
DO $$
BEGIN
    IF NOT EXISTS
       (
           SELECT 1
           FROM   information_schema.columns
           WHERE  table_name = 'AccountSubGroups'
           AND    column_name = 'IsFinanceCost'
       )
    THEN
        ALTER TABLE "AccountSubGroups"
            ADD COLUMN "IsFinanceCost" boolean NOT NULL DEFAULT false;

        UPDATE "AccountSubGroups"
        SET    "IsFinanceCost" = true
        WHERE  "SubGroupCode" = 'SUB-004-001-001';

        RAISE NOTICE 'IsFinanceCost added; SUB-004-001-001 switched on.';
    ELSE
        RAISE NOTICE 'IsFinanceCost exists, skipped.';
    END IF;
END
$$;


-- ---------- 2. Page ----------
DO $$
DECLARE
    v_module    record;
    v_menu      record;
    v_tb_code   text;
    v_sub_code  text;
    v_seq       int;
    v_order     int;
    v_links     int;
    a           record;
BEGIN
    SELECT "Id", "SequenceNo", "RouteKey" INTO v_module
    FROM   "NavigationModules"
    WHERE  lower("RouteKey") = 'accounts-finance'
    AND    "IsDeleted" = false;

    IF v_module."Id" IS NULL THEN
        RAISE EXCEPTION 'Module with route key accounts-finance not found - nothing changed.';
    END IF;

    SELECT "Id", "SequenceNo", "RouteKey" INTO v_menu
    FROM   "NavigationMenus"
    WHERE  "NavigationModuleId" = v_module."Id"
    AND    lower("RouteKey") = 'financial-statements'
    AND    "IsDeleted" = false;

    IF v_menu."Id" IS NULL THEN
        RAISE EXCEPTION 'Menu Financial Statements not found : run TrialBalance_Navigation.sql first - nothing changed.';
    END IF;

    SELECT "Code" INTO v_tb_code
    FROM   "NavigationSubmenus"
    WHERE  "NavigationMenuId" = v_menu."Id"
    AND    lower("RouteKey") = 'trial-balance'
    AND    "IsDeleted" = false;

    SELECT "Code" INTO v_sub_code
    FROM   "NavigationSubmenus"
    WHERE  "NavigationMenuId" = v_menu."Id"
    AND    lower("RouteKey") = 'return-on-investment'
    AND    "IsDeleted" = false;

    IF v_sub_code IS NULL THEN
        IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
                   WHERE  lower("Name") = lower('Return on Investment')
                   AND    "IsDeleted" = false) THEN
            RAISE EXCEPTION 'A submenu named "Return on Investment" already exists elsewhere - nothing changed.';
        END IF;

        SELECT COALESCE(MAX("SequenceNo"), 0) + 1, COALESCE(MAX("DisplayOrder"), 0) + 1
        INTO   v_seq, v_order
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
            (v_menu."Id", v_seq, v_sub_code, 'Return on Investment', 'fa-solid fa-arrow-trend-up',
             'return-on-investment',
             '/' || v_module."RouteKey" || '/' || v_menu."RouteKey" || '/return-on-investment',
             v_order,
             'ROI, ROCE, ROE, ROA and stock return (GMROI) by business line (read only).',
             true, false, 1, now());

        RAISE NOTICE 'Submenu created : % Return on Investment', v_sub_code;
    ELSE
        RAISE NOTICE 'Submenu exists, skipped : % Return on Investment', v_sub_code;
    END IF;

    IF v_tb_code IS NULL THEN
        RAISE NOTICE 'Trial Balance page not found : no activities copied (link View / Print by hand).';
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

        RAISE NOTICE 'Activities linked to Return on Investment from Trial Balance (%) : %', v_tb_code, v_links;
    END IF;
END
$$;


-- ---------------------------------------------------------------------
-- Check (run on its own)
-- ---------------------------------------------------------------------

SELECT "SubGroupCode", "SubGroupName", "IsFinanceCost"
FROM   "AccountSubGroups"
WHERE  "IsFinanceCost" AND NOT "IsDeleted";

SELECT s."Code", s."Name", s."Route", s."DisplayOrder"
FROM   "NavigationSubmenus" s
WHERE  lower(s."RouteKey") = 'return-on-investment' AND NOT s."IsDeleted";
