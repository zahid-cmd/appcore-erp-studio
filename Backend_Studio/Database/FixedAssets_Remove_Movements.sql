ROLLBACK;

-- =====================================================================
-- FixedAssets_Remove_Movements.sql   (2026-11-15)
-- ---------------------------------------------------------------------
-- Fixed Assets Management : the menu Asset Movements is removed (not
-- required) :
--     Asset Transfers, Asset Improvements, Asset Maintenance
--
--   1. The menu and its three pages leave the navigation (marked
--      deleted, the way the Navigation page deletes).
--   2. Their Auto Journal Register sources and views go.
--   3. The Posting Setup row ASSET-TRANSFER-CLEARING goes.
--   4. The tables FaTransfers / FaImprovements / FaMaintenance are
--      dropped - ONLY when they are empty. A table that holds rows is
--      kept and named in the Messages tab.
--
-- The pages and their code are already out of the application. Safe
-- to run more than once. Run the whole script (F5). ASCII only.
--
-- AFTER : log in again (the menu leaves the side bar).
-- =====================================================================

BEGIN;

DO $$
DECLARE
    v_module   record;
    v_menu     record;
    v_pages    int := 0;
    v_rows     bigint;
    t          text;
BEGIN
    -- ---------- 1. Navigation ----------
    SELECT "Id", "Name" INTO v_module
    FROM   "NavigationModules"
    WHERE  lower(trim("RouteKey")) = 'fixed-assets-management'
    AND    "IsDeleted" = false
    LIMIT  1;

    IF v_module."Id" IS NULL THEN
        RAISE NOTICE 'Module fixed-assets-management not found : navigation skipped.';
    ELSE
        FOR v_menu IN
            SELECT "Id", "Name"
            FROM   "NavigationMenus"
            WHERE  "NavigationModuleId" = v_module."Id"
            AND    lower(trim("RouteKey")) = 'asset-movements'
            AND    "IsDeleted" = false
        LOOP
            UPDATE "NavigationSubmenus"
            SET    "IsDeleted"   = true,
                   "IsActive"    = false,
                   "DeletedBy"   = 1,
                   "DeletedDate" = now()
            WHERE  "NavigationMenuId" = v_menu."Id"
            AND    "IsDeleted" = false;

            GET DIAGNOSTICS v_pages = ROW_COUNT;

            UPDATE "NavigationMenus"
            SET    "IsDeleted"   = true,
                   "IsActive"    = false,
                   "DeletedBy"   = 1,
                   "DeletedDate" = now()
            WHERE  "Id" = v_menu."Id";

            RAISE NOTICE 'Menu removed : % (% page(s))', v_menu."Name", v_pages;
        END LOOP;

        IF NOT FOUND THEN
            RAISE NOTICE 'Menu asset-movements is not in the navigation (removed already).';
        END IF;
    END IF;

    -- ---------- 2. Auto Journal Registers ----------
    IF to_regclass('public."AutoJournalSources"') IS NOT NULL THEN
        DELETE FROM public."AutoJournalSources"
        WHERE  "SourceTable" IN ('FaImprovementVouchers', 'FaTransferVouchers');
    END IF;

    DROP VIEW IF EXISTS public."FaImprovementVouchers";
    DROP VIEW IF EXISTS public."FaTransferVouchers";

    -- ---------- 3. Posting Setup ----------
    DELETE FROM public."PostingSetups"
    WHERE  "PurposeCode" = 'ASSET-TRANSFER-CLEARING';

    -- ---------- 4. The tables (only when empty) ----------
    FOREACH t IN ARRAY ARRAY['FaTransfers', 'FaImprovements', 'FaMaintenance']
    LOOP
        IF to_regclass(format('public.%I', t)) IS NULL THEN
            RAISE NOTICE 'Table % is not there (dropped already).', t;
        ELSE
            EXECUTE format('SELECT count(*) FROM public.%I', t) INTO v_rows;

            IF v_rows = 0 THEN
                EXECUTE format('DROP TABLE public.%I', t);
                RAISE NOTICE 'Table % dropped.', t;
            ELSE
                RAISE NOTICE 'Table % KEPT : it holds % row(s). Tell before it is dropped.', t, v_rows;
            END IF;
        END IF;
    END LOOP;
END $$;

COMMIT;


-- ------------------------------------------------------------
-- Check (run on its own) : the menus of the module that remain
-- ------------------------------------------------------------
SELECT m."DisplayOrder", m."Name" AS "Menu", s."DisplayOrder" AS "No", s."Name" AS "Page", s."Route"
FROM   "NavigationMenus" m
JOIN   "NavigationModules" d ON d."Id" = m."NavigationModuleId"
LEFT JOIN "NavigationSubmenus" s ON s."NavigationMenuId" = m."Id" AND s."IsDeleted" = false
WHERE  lower(trim(d."RouteKey")) = 'fixed-assets-management'
AND    m."IsDeleted" = false
ORDER  BY m."DisplayOrder", s."DisplayOrder";
