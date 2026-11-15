-- =====================================================================
-- FixedAssets_DeleteAll.sql   (2026-11-15)
-- ---------------------------------------------------------------------
-- Restart testing : empties EVERY record of Fixed Assets Management,
-- and the Journal Vouchers it posted, so the ledgers go back to where
-- they were before the module.
--
-- Deleted
--   Asset Setup      FaCategories (Asset Groups + their depreciation
--                    setup), FaLocations
--   Asset Register   FaAcquisitions, FaAcquisitionLines, FaAssets
--                    (asset cards and opening assets)
--   Depreciations    FaDepreciationRuns, FaDepreciationLines
--                    (also the undone ones)
--   Asset Disposal   FaDisposals
--   Asset Reports    FaVerifications, FaVerificationLines
--   (FaTransfers / FaImprovements / FaMaintenance too, if still there)
--   Journal Vouchers posted by acquisitions, opening assets,
--   depreciation charges and disposals (found BEFORE the rows above
--   are deleted) -> their VoucherEntries rows (incl. the reversals
--   of cancelled ones), lines and headers.
--   The activity history of the module (ActivityHistories, module
--   'Fixed Assets').
--   The two ledgers each asset group made (PPE - <name>,
--   ACD - <name>) : marked deleted, ONLY when no voucher entry uses
--   them any more; a ledger still used is kept and named.
--
-- Kept
--   Asset Configuration (the switches and numbering; the month-end
--   check note is cleared), Posting Setup, the menus, every other
--   voucher. Payment / Receipt Vouchers you made by hand against the
--   asset payable / receivable ledgers are NOT touched : delete or
--   cancel them yourself if they belong to the test.
--
-- Turn OFF "Charge Depreciation on Month End" first if it is on, or
-- stop the API, so no charge is posted while this runs.
--
-- To keep the vouchers and delete only the module's rows, set
-- v_with_vouchers := false below.
--
-- Hard delete inside a transaction that you finish yourself :
--   1. Run the whole script (F5) on AppCoreERP_Studio.
--   2. Read the counts in the Messages tab.
--   3. They are right  : run   COMMIT;
--      They are wrong  : run   ROLLBACK;
-- A table that does not exist is skipped. Re-runnable. ASCII only.
-- =====================================================================

ROLLBACK;

BEGIN;

DO $$
DECLARE
    v_with_vouchers boolean := true;

    v_src  record;
    v_tab  text;
    v_n    int;
    v_jv   int;
    v_led  record;
BEGIN
    ------------------------------------------------------------------
    -- 1. What the rows point at : vouchers and group ledgers
    ------------------------------------------------------------------
    CREATE TEMP TABLE _fa_jv  (id bigint PRIMARY KEY) ON COMMIT DROP;
    CREATE TEMP TABLE _fa_led (code text PRIMARY KEY) ON COMMIT DROP;

    FOR v_src IN
        SELECT * FROM (VALUES
            ('FaAcquisitions'),
            ('FaAssets'),
            ('FaDepreciationRuns'),
            ('FaDisposals'),
            ('FaImprovements'),
            ('FaTransfers')
        ) AS s(tab)
    LOOP
        IF to_regclass(format('public.%I', v_src.tab)) IS NOT NULL
           AND EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = 'public'
                         AND table_name = v_src.tab
                         AND column_name = 'JournalVoucherId')
        THEN
            EXECUTE format(
                'INSERT INTO _fa_jv (id) SELECT DISTINCT "JournalVoucherId" FROM public.%I '
                'WHERE "JournalVoucherId" IS NOT NULL AND "JournalVoucherId" > 0 ON CONFLICT DO NOTHING',
                v_src.tab);
        END IF;
    END LOOP;

    IF to_regclass('public."FaCategories"') IS NOT NULL THEN
        INSERT INTO _fa_led (code)
        SELECT c FROM (
            SELECT "CostLedgerCode"  AS c FROM public."FaCategories"
            UNION
            SELECT "AccumLedgerCode" FROM public."FaCategories"
        ) x
        WHERE coalesce(c, '') <> ''
        ON CONFLICT DO NOTHING;
    END IF;

    SELECT count(*) INTO v_jv FROM _fa_jv;

    RAISE NOTICE 'Journal Vouchers found : %', v_jv;

    ------------------------------------------------------------------
    -- 2. The module's rows (children first)
    ------------------------------------------------------------------
    FOREACH v_tab IN ARRAY ARRAY[
        'FaVerificationLines',
        'FaVerifications',
        'FaDisposals',
        'FaDepreciationLines',
        'FaDepreciationRuns',
        'FaImprovements',
        'FaTransfers',
        'FaMaintenance',
        'FaAcquisitionLines',
        'FaAcquisitions',
        'FaAssets',
        'FaCategories',
        'FaLocations'
    ]
    LOOP
        IF to_regclass(format('public.%I', v_tab)) IS NULL THEN
            RAISE NOTICE '% skipped (no table)', rpad(v_tab, 26);
        ELSE
            EXECUTE format('DELETE FROM public.%I', v_tab);
            GET DIAGNOSTICS v_n = ROW_COUNT;
            RAISE NOTICE '% % deleted', rpad(v_tab, 26), v_n;
        END IF;
    END LOOP;

    IF to_regclass('public."FaConfiguration"') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'FaConfiguration'
                     AND column_name = 'AutoLastMessage') THEN
        UPDATE public."FaConfiguration" SET "AutoLastCheck" = NULL, "AutoLastMessage" = '';
    END IF;

    IF to_regclass('public."ActivityHistories"') IS NOT NULL THEN
        DELETE FROM public."ActivityHistories" WHERE "Module" = 'Fixed Assets';
        GET DIAGNOSTICS v_n = ROW_COUNT;
        RAISE NOTICE '% % deleted', rpad('ActivityHistories', 26), v_n;
    END IF;

    ------------------------------------------------------------------
    -- 3. The vouchers
    ------------------------------------------------------------------
    IF v_with_vouchers THEN
        IF to_regclass('public."VoucherEntries"') IS NOT NULL THEN
            DELETE FROM public."VoucherEntries"
            WHERE  "VoucherType" = 'JV'
            AND    "VoucherId" IN (SELECT id FROM _fa_jv);
            GET DIAGNOSTICS v_n = ROW_COUNT;
            RAISE NOTICE '% % deleted', rpad('VoucherEntries', 26), v_n;
        END IF;

        IF to_regclass('public."JournalVoucherLines"') IS NOT NULL THEN
            DELETE FROM public."JournalVoucherLines"
            WHERE  "JournalVoucherId" IN (SELECT id FROM _fa_jv);
            GET DIAGNOSTICS v_n = ROW_COUNT;
            RAISE NOTICE '% % deleted', rpad('JournalVoucherLines', 26), v_n;
        END IF;

        IF to_regclass('public."JournalVoucher"') IS NOT NULL THEN
            DELETE FROM public."JournalVoucher"
            WHERE  "JournalVoucherId" IN (SELECT id FROM _fa_jv);
            GET DIAGNOSTICS v_n = ROW_COUNT;
            RAISE NOTICE '% % deleted', rpad('JournalVoucher', 26), v_n;
        END IF;
    ELSE
        RAISE NOTICE 'Vouchers kept (v_with_vouchers = false)';
    END IF;

    ------------------------------------------------------------------
    -- 4. The ledgers the asset groups made (only when unused)
    ------------------------------------------------------------------
    IF to_regclass('public."GeneralLedgers"') IS NOT NULL THEN
        FOR v_led IN
            SELECT g."LedgerCode", g."LedgerName",
                   (SELECT count(*) FROM public."VoucherEntries" e
                    WHERE e."LedgerCode" = g."LedgerCode") AS used
            FROM   public."GeneralLedgers" g
            WHERE  g."LedgerCode" IN (SELECT code FROM _fa_led)
            AND    g."IsDeleted" = false
            ORDER  BY g."LedgerCode"
        LOOP
            IF v_led.used = 0 THEN
                UPDATE public."GeneralLedgers"
                SET    "IsDeleted" = true, "IsActive" = false
                WHERE  "LedgerCode" = v_led."LedgerCode";
                RAISE NOTICE 'Ledger % % deleted (marked)', v_led."LedgerCode", v_led."LedgerName";
            ELSE
                RAISE NOTICE 'Ledger % % KEPT : % voucher entr(ies) still use it', v_led."LedgerCode", v_led."LedgerName", v_led.used;
            END IF;
        END LOOP;
    END IF;

    RAISE NOTICE 'Done. Check the counts, then run COMMIT; (or ROLLBACK;)';
END $$;

-- Run one of these by hand :
-- COMMIT;
-- ROLLBACK;
