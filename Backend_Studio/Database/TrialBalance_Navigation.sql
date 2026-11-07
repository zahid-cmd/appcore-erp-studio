-- =====================================================================
-- TrialBalance_Navigation.sql   (2026-11-06)
-- ---------------------------------------------------------------------
-- 1. Menu    Accounts & Finance > Financial Statements
--            /accounts-finance/financial-statements
-- 2. Page    Trial Balance
--            /accounts-finance/financial-statements/trial-balance
--            (hand-written read-only page : NEVER run Menu Sync /
--            Submenu Sync / Code Sync for it)
-- 3. Page activities : the same activities Ledger Statements has
--    (Print ...) are linked to Trial Balance too.
-- 4. Posting Setup purpose RETAINED-EARNINGS
--      -> GLR-001-002-001-00001 Retained Earnings
--    The Trial Balance adds the profit / loss of the earlier
--    financial years to this ledger's opening. A ledger already
--    chosen on the Posting Setup page is never overwritten.
--
-- Codes follow the Navigation page : MNU-<module>-<menu>,
-- SUB-<module>-<menu>-<sub>. Rows that already exist are skipped :
-- safe to run again. Run the whole script (F5). ASCII only.
--
-- AFTER : Security & Permission > Activity Assignment : tick View
-- (and Print) on Trial Balance for the roles, then log in again.
-- =====================================================================

DO $$
DECLARE
    v_module    record;
    v_menu      record;
    v_menu_id   bigint;
    v_seq       int;
    v_sub_code  text;
    v_ls_code   text;
    v_links     int := 0;
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

    RAISE NOTICE 'Module % % (route key %)', v_module."Code", v_module."Name", v_module."RouteKey";

    -- ---------- 1. Menu : Financial Statements ----------
    SELECT "Id" INTO v_menu_id
    FROM   "NavigationMenus"
    WHERE  "NavigationModuleId" = v_module."Id"
    AND    lower("RouteKey") = 'financial-statements'
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
             'Financial Statements', 'fa-solid fa-file-invoice-dollar',
             'financial-statements', '/' || v_module."RouteKey" || '/financial-statements',
             v_seq, 'Trial Balance; later Profit & Loss and Balance Sheet.',
             true, false, 1, now())
        RETURNING "Id" INTO v_menu_id;

        RAISE NOTICE 'Menu created : Financial Statements';
    ELSE
        RAISE NOTICE 'Menu exists, skipped : Financial Statements';
    END IF;

    SELECT "Id", "SequenceNo", "RouteKey", "Code" INTO v_menu
    FROM   "NavigationMenus"
    WHERE  "Id" = v_menu_id;

    -- ---------- 2. Page : Trial Balance ----------
    SELECT "Code" INTO v_sub_code
    FROM   "NavigationSubmenus"
    WHERE  "NavigationMenuId" = v_menu."Id"
    AND    lower("RouteKey") = 'trial-balance'
    AND    "IsDeleted" = false;

    IF v_sub_code IS NULL THEN
        -- Submenu names must be unique across the system (Code Sync)
        IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
                   WHERE  lower("Name") = 'trial balance'
                   AND    "IsDeleted" = false) THEN
            RAISE EXCEPTION 'A submenu named "Trial Balance" already exists elsewhere - nothing changed.';
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
            (v_menu."Id", v_seq, v_sub_code, 'Trial Balance', 'fa-solid fa-scale-balanced',
             'trial-balance',
             '/' || v_module."RouteKey" || '/' || v_menu."RouteKey" || '/trial-balance',
             1, 'Opening / period / closing of every ledger (read only).',
             true, false, 1, now());

        RAISE NOTICE 'Submenu created : % Trial Balance', v_sub_code;
    ELSE
        RAISE NOTICE 'Submenu exists, skipped : % Trial Balance', v_sub_code;
    END IF;

    -- ---------- 3. Activities : copy the links of Ledger Statements ----------
    SELECT s."Code" INTO v_ls_code
    FROM   "NavigationSubmenus" s
    WHERE  lower(s."RouteKey") = 'ledger-statements'
    AND    s."IsDeleted" = false
    LIMIT  1;

    IF v_ls_code IS NULL THEN
        RAISE NOTICE 'Ledger Statements page not found : no activities copied (link Print by hand).';
    ELSE
        FOR a IN
            SELECT DISTINCT p."MasterActivityCode"
            FROM   "MasterActivityPages" p
            WHERE  p."NavigationSubmenuCode" = v_ls_code
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

        RAISE NOTICE 'Activities linked from Ledger Statements (%) : %', v_ls_code, v_links;
    END IF;
END
$$;


-- ---------------------------------------------------------------------
-- 4. Posting Setup : Retained Earnings
--    Texts are refreshed every run; the ledger only when the row is new
-- ---------------------------------------------------------------------

INSERT INTO public."PostingSetups"
(
    "PurposeCode", "PurposeName", "GroupName", "Description", "UsedBy",
    "AllowedSubGroupCodes", "LedgerCode", "IsRequired", "DisplayOrder"
)
VALUES
    ('RETAINED-EARNINGS', 'Retained Earnings', 'Year End',
     'Profit / loss carried from the earlier financial years. The Trial Balance adds the net income and expense of the earlier years to its opening (until year-end closing is built).',
     'Trial Balance (later : year-end closing)',
     'SUB-001-002-001', 'GLR-001-002-001-00001', true, 61)
ON CONFLICT ("PurposeCode") DO UPDATE
SET "PurposeName"          = EXCLUDED."PurposeName",
    "GroupName"            = EXCLUDED."GroupName",
    "Description"          = EXCLUDED."Description",
    "UsedBy"               = EXCLUDED."UsedBy",
    "AllowedSubGroupCodes" = EXCLUDED."AllowedSubGroupCodes",
    "IsRequired"           = EXCLUDED."IsRequired",
    "DisplayOrder"         = EXCLUDED."DisplayOrder";


-- ---------------------------------------------------------------------
-- Check (run on its own)
-- ---------------------------------------------------------------------

SELECT m."Code" AS "Menu Code", m."Name" AS "Menu",
       s."Code" AS "Page Code", s."Name" AS "Page", s."Route",
       (SELECT string_agg(p."MasterActivityCode", ', ')
        FROM   "MasterActivityPages" p
        WHERE  p."NavigationSubmenuCode" = s."Code") AS "Activities"
FROM   "NavigationMenus" m
LEFT   JOIN "NavigationSubmenus" s ON s."NavigationMenuId" = m."Id" AND s."IsDeleted" = false
WHERE  m."IsDeleted" = false AND lower(m."RouteKey") = 'financial-statements';

SELECT p."PurposeCode", p."PurposeName", p."LedgerCode", g."LedgerName"
FROM   public."PostingSetups" p
LEFT   JOIN public."GeneralLedgers" g ON g."LedgerCode" = p."LedgerCode" AND g."IsDeleted" = false
WHERE  p."PurposeCode" = 'RETAINED-EARNINGS';
