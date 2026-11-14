-- =====================================================================
-- HumanResource_Payroll_ProvidentFund_DeleteAll.sql   (2026-11-14)
-- ---------------------------------------------------------------------
-- Restart testing : empties EVERY record under Payroll Management and
-- Provident Fund, and the accounting vouchers they posted, so the
-- ledgers (Advance Against Salary, Salary Payable, PF ledgers, cash /
-- bank) go back to where they were before payroll.
--
-- Payroll Management
--   HrPaymentLines, HrPayments          Payroll Payments (salary,
--                                       overtime, advance, bonus,
--                                       encashment, PF settlement,
--                                       PF loan)
--   HrAdvanceRecoveries, HrSalaryAdvances
--   HrSalarySheetLineHeads, HrSalarySheetLines, HrSalarySheets
--   HrBonusSheetLines, HrBonusSheets    Festival Bonus
--   HrLeaveEncashmentLines, HrLeaveEncashments
-- Provident Fund
--   HrPfLoanRecoveries, HrPfLoans, HrPfSettlements,
--   HrPfTransactions, HrPfMembers
-- Vouchers they posted (found BEFORE the rows above are deleted)
--   Journal Vouchers : salary sheets, bonus sheets, encashments,
--                      PF transactions, PF settlements
--   Payment Vouchers : payroll payments
--   -> VoucherEntries rows (incl. cancel reversals), the voucher
--      lines / payments and the voucher headers.
--
-- Kept : employees, attendance, leave, every setup and policy
-- (salary / bonus / overtime structures, encash policies,
-- HrPfPolicy, Posting Setup), all other vouchers and the menus.
-- Voucher / document numbers are not reset (gaps are normal).
--
-- To keep the vouchers and delete only the HR rows, set
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
    v_pv   int;
BEGIN
    ------------------------------------------------------------------
    -- 1. The vouchers the HR rows posted
    ------------------------------------------------------------------
    CREATE TEMP TABLE _hr_jv (id bigint PRIMARY KEY) ON COMMIT DROP;
    CREATE TEMP TABLE _hr_pv (id bigint PRIMARY KEY) ON COMMIT DROP;

    FOR v_src IN
        SELECT * FROM (VALUES
            ('HrSalarySheets',     'JournalVoucherId', '_hr_jv'),
            ('HrBonusSheets',      'JournalVoucherId', '_hr_jv'),
            ('HrLeaveEncashments', 'JournalVoucherId', '_hr_jv'),
            ('HrPfTransactions',   'JournalVoucherId', '_hr_jv'),
            ('HrPfSettlements',    'JournalVoucherId', '_hr_jv'),
            ('HrPayments',         'PaymentVoucherId', '_hr_pv')
        ) AS s(tab, col, dest)
    LOOP
        IF to_regclass(format('public.%I', v_src.tab)) IS NOT NULL
           AND EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = 'public'
                         AND table_name = v_src.tab
                         AND column_name = v_src.col)
        THEN
            EXECUTE format(
                'INSERT INTO %I (id) SELECT DISTINCT %I FROM public.%I '
                'WHERE %I IS NOT NULL AND %I > 0 ON CONFLICT DO NOTHING',
                v_src.dest, v_src.col, v_src.tab, v_src.col, v_src.col);
        END IF;
    END LOOP;

    SELECT count(*) INTO v_jv FROM _hr_jv;
    SELECT count(*) INTO v_pv FROM _hr_pv;

    RAISE NOTICE 'Vouchers found : % journal, % payment', v_jv, v_pv;

    ------------------------------------------------------------------
    -- 2. The HR rows (children first)
    ------------------------------------------------------------------
    FOREACH v_tab IN ARRAY ARRAY[
        'HrPaymentLines',
        'HrPayments',
        'HrPfLoanRecoveries',
        'HrAdvanceRecoveries',
        'HrPfTransactions',
        'HrPfSettlements',
        'HrPfLoans',
        'HrPfMembers',
        'HrSalarySheetLineHeads',
        'HrSalarySheetLines',
        'HrSalarySheets',
        'HrSalaryAdvances',
        'HrBonusSheetLines',
        'HrBonusSheets',
        'HrLeaveEncashmentLines',
        'HrLeaveEncashments'
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

    ------------------------------------------------------------------
    -- 3. The vouchers
    ------------------------------------------------------------------
    IF NOT v_with_vouchers THEN
        RAISE NOTICE 'Vouchers kept (v_with_vouchers = false)';
        RETURN;
    END IF;

    IF to_regclass('public."VoucherEntries"') IS NOT NULL THEN
        DELETE FROM public."VoucherEntries" e
        WHERE (e."VoucherType" = 'JV' AND e."VoucherId" IN (SELECT id FROM _hr_jv))
           OR (e."VoucherType" = 'PV' AND e."VoucherId" IN (SELECT id FROM _hr_pv));
        GET DIAGNOSTICS v_n = ROW_COUNT;
        RAISE NOTICE '% % deleted', rpad('VoucherEntries', 26), v_n;
    END IF;

    IF to_regclass('public."PaymentVoucherPayments"') IS NOT NULL THEN
        DELETE FROM public."PaymentVoucherPayments"
        WHERE "PaymentVoucherId" IN (SELECT id FROM _hr_pv);
        GET DIAGNOSTICS v_n = ROW_COUNT;
        RAISE NOTICE '% % deleted', rpad('PaymentVoucherPayments', 26), v_n;
    END IF;

    IF to_regclass('public."PaymentVoucherLines"') IS NOT NULL THEN
        DELETE FROM public."PaymentVoucherLines"
        WHERE "PaymentVoucherId" IN (SELECT id FROM _hr_pv);
        GET DIAGNOSTICS v_n = ROW_COUNT;
        RAISE NOTICE '% % deleted', rpad('PaymentVoucherLines', 26), v_n;
    END IF;

    IF to_regclass('public."PaymentVoucher"') IS NOT NULL THEN
        DELETE FROM public."PaymentVoucher"
        WHERE "PaymentVoucherId" IN (SELECT id FROM _hr_pv);
        GET DIAGNOSTICS v_n = ROW_COUNT;
        RAISE NOTICE '% % deleted', rpad('PaymentVoucher', 26), v_n;
    END IF;

    IF to_regclass('public."JournalVoucherLines"') IS NOT NULL THEN
        DELETE FROM public."JournalVoucherLines"
        WHERE "JournalVoucherId" IN (SELECT id FROM _hr_jv);
        GET DIAGNOSTICS v_n = ROW_COUNT;
        RAISE NOTICE '% % deleted', rpad('JournalVoucherLines', 26), v_n;
    END IF;

    IF to_regclass('public."JournalVoucher"') IS NOT NULL THEN
        DELETE FROM public."JournalVoucher"
        WHERE "JournalVoucherId" IN (SELECT id FROM _hr_jv);
        GET DIAGNOSTICS v_n = ROW_COUNT;
        RAISE NOTICE '% % deleted', rpad('JournalVoucher', 26), v_n;
    END IF;

    RAISE NOTICE 'Done. Check the counts, then run COMMIT; (or ROLLBACK;)';
END $$;

-- Run one of these by hand :
-- COMMIT;
-- ROLLBACK;
