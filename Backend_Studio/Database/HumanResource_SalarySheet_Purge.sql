-- =====================================================================
-- HumanResource_SalarySheet_Purge.sql   (2026-11-14)
-- ---------------------------------------------------------------------
-- FOR TEST DATA ONLY. Removes ONE salary sheet and everything it left
-- behind, in whatever state it is (Draft, Approved, Posted, paid) :
--
--   its payments (Payroll Payments : salary and overtime)
--       HrPaymentLines, HrPayments
--       and their Payment Vouchers :
--       PaymentVoucherPayments, PaymentVoucherLines, PaymentVoucher
--       and what those left on MFS / Check Reconciliation (the rows
--       still waiting there)
--   its Journal Voucher (the posting of the sheet)
--       JournalVoucherLines, JournalVoucher
--   the ledger entries of those vouchers
--       VoucherEntries
--   the sheet itself
--       HrPfLoanRecoveries, HrPfTransactions (its fund rows),
--       HrAdvanceRecoveries, HrSalarySheetLineHeads,
--       HrSalarySheetLines, HrSalarySheets
--
-- The overtime sheet (OTS-....) is the overtime of the salary sheet :
-- it has no table and goes with the sheet.
--
-- This is NOT how a real month is taken back : in real books the
-- payment is cancelled and the sheet unposted on the pages, so the
-- vouchers stay as cancelled. Here the vouchers are wiped as if they
-- were never made; their numbers are left as gaps.
--
-- It cannot be undone, so it runs inside a transaction that you finish
-- yourself :
--   1. Set the sheet code on the line marked  <<< CHANGE  below.
--   2. Run the whole script (F5) on AppCoreERP_Studio.
--   3. Read the counts in the Messages tab.
--   4. They are right  : run   COMMIT;
--      They are wrong  : run   ROLLBACK;
--
-- ASCII only.
-- =====================================================================

BEGIN;

DO $$
DECLARE
    v_code     text := 'SAL-0001';      -- <<< CHANGE : the sheet to remove
    v_sheet    bigint;
    v_status   text;
    v_jv       bigint;
    v_jv_no    text;
    v_pv_ids   bigint[] := '{}';
    v_pv_nos   text[]   := '{}';
    v_payments int := 0;
    v_entries  int := 0;
    v_more     int;
    v_lines    int;
BEGIN
    SELECT "SalarySheetId", "Status", "JournalVoucherId", "JournalVoucherNo"
    INTO   v_sheet, v_status, v_jv, v_jv_no
    FROM   public."HrSalarySheets"
    WHERE  upper(trim("Code")) = upper(trim(v_code))
    ORDER  BY "IsDeleted", "SalarySheetId" DESC
    LIMIT  1;

    IF v_sheet IS NULL THEN
        RAISE EXCEPTION 'Salary sheet % was not found - nothing was deleted.', v_code;
    END IF;

    -- ---------- its payments and their Payment Vouchers ----------
    IF to_regclass('public."HrPayments"') IS NOT NULL THEN
        SELECT COALESCE(array_agg("PaymentVoucherId") FILTER (WHERE "PaymentVoucherId" IS NOT NULL), '{}'),
               COALESCE(array_agg("PaymentVoucherNo") FILTER (WHERE "PaymentVoucherNo" <> ''), '{}')
        INTO   v_pv_ids, v_pv_nos
        FROM   public."HrPayments"
        WHERE  "PaymentType" IN ('Salary', 'Overtime') AND "SourceId" = v_sheet;

        DELETE FROM public."HrPaymentLines"
        WHERE  "PaymentId" IN (SELECT "PaymentId" FROM public."HrPayments"
                               WHERE "PaymentType" IN ('Salary', 'Overtime') AND "SourceId" = v_sheet);

        DELETE FROM public."HrPayments"
        WHERE  "PaymentType" IN ('Salary', 'Overtime') AND "SourceId" = v_sheet;
        GET DIAGNOSTICS v_payments = ROW_COUNT;
    END IF;

    IF array_length(v_pv_ids, 1) > 0 THEN
        DELETE FROM public."VoucherEntries" WHERE "VoucherNo" = ANY (v_pv_nos);
        GET DIAGNOSTICS v_entries = ROW_COUNT;

        -- (an MFS / cheque payment waits on a reconciliation page)
        IF to_regclass('public."MfsReconciliations"') IS NOT NULL THEN
            DELETE FROM public."MfsReconciliationHistory"
            WHERE  "MfsReconciliationId" IN (SELECT "MfsReconciliationId" FROM public."MfsReconciliations" WHERE "SourceVoucherNo" = ANY (v_pv_nos));

            DELETE FROM public."MfsReconciliations" WHERE "SourceVoucherNo" = ANY (v_pv_nos);
        END IF;

        IF to_regclass('public."CheckReconciliations"') IS NOT NULL THEN
            DELETE FROM public."CheckReconciliationHistory"
            WHERE  "CheckReconciliationId" IN (SELECT "CheckReconciliationId" FROM public."CheckReconciliations" WHERE "SourceVoucherNo" = ANY (v_pv_nos));

            DELETE FROM public."CheckReconciliations" WHERE "SourceVoucherNo" = ANY (v_pv_nos);
        END IF;

        DELETE FROM public."PaymentVoucherPayments" WHERE "PaymentVoucherId" = ANY (v_pv_ids);
        DELETE FROM public."PaymentVoucherLines"    WHERE "PaymentVoucherId" = ANY (v_pv_ids);
        DELETE FROM public."PaymentVoucher"         WHERE "PaymentVoucherId" = ANY (v_pv_ids);
    END IF;

    -- ---------- its Journal Voucher ----------
    IF v_jv IS NOT NULL THEN
        DELETE FROM public."VoucherEntries" WHERE "VoucherNo" = v_jv_no AND v_jv_no <> '';
        GET DIAGNOSTICS v_more = ROW_COUNT;
        v_entries := v_entries + v_more;

        DELETE FROM public."JournalVoucherLines" WHERE "JournalVoucherId" = v_jv;
        DELETE FROM public."JournalVoucher"      WHERE "JournalVoucherId" = v_jv;
    END IF;

    -- ---------- the sheet ----------
    SELECT count(*) INTO v_lines FROM public."HrSalarySheetLines" WHERE "SalarySheetId" = v_sheet;

    IF to_regclass('public."HrPfLoanRecoveries"') IS NOT NULL THEN
        DELETE FROM public."HrPfLoanRecoveries" WHERE "SalarySheetId" = v_sheet;
        DELETE FROM public."HrPfTransactions"   WHERE "SourceType" = 'SalarySheet' AND "SourceId" = v_sheet;
    END IF;

    DELETE FROM public."HrAdvanceRecoveries" WHERE "SalarySheetId" = v_sheet;

    DELETE FROM public."HrSalarySheetLineHeads"
    WHERE  "SalarySheetLineId" IN (SELECT "SalarySheetLineId" FROM public."HrSalarySheetLines" WHERE "SalarySheetId" = v_sheet);

    DELETE FROM public."HrSalarySheetLines" WHERE "SalarySheetId" = v_sheet;

    DELETE FROM public."HrSalarySheets" WHERE "SalarySheetId" = v_sheet;

    RAISE NOTICE 'Salary sheet % (%) removed : % line(s), % payment(s), Journal Voucher %, Payment Voucher(s) %, % ledger entr(ies).',
        v_code, v_status, v_lines, v_payments, COALESCE(NULLIF(v_jv_no, ''), '-'), COALESCE(NULLIF(array_to_string(v_pv_nos, ', '), ''), '-'), v_entries;
    RAISE NOTICE 'Nothing is final yet : run COMMIT; to keep it, or ROLLBACK; to undo it.';
END $$;

-- Run ONE of these on its own after reading the Messages tab :
--   COMMIT;
--   ROLLBACK;
