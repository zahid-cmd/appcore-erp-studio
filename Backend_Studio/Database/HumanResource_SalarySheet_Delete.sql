-- =====================================================================
-- HumanResource_SalarySheet_Delete.sql   (2026-11-14)
-- ---------------------------------------------------------------------
-- Removes ONE salary sheet completely, so the month of that branch
-- can be generated again :
--
--   HrPfLoanRecoveries       provident fund loan instalments it took
--   HrPfTransactions         provident fund contributions it wrote
--   HrAdvanceRecoveries      advance instalments it took
--   HrSalarySheetLineHeads   the heads of every line
--   HrSalarySheetLines       the lines (employees)
--   HrPayments (+ lines)     its CANCELLED payments (Payroll Payments)
--   HrSalarySheets           the sheet
--
-- The advances and the fund loans get their instalments back : they
-- are taken again when the month is generated again.
--
-- A POSTED sheet is refused : it has a Journal Voucher in the
-- accounts. Unpost it on the page first (that cancels the voucher).
-- A sheet with a payment that is not cancelled is refused too : its
-- Payment Voucher is in the accounts. Cancel the payment on Payroll
-- Payments first (that cancels the voucher).
--
-- This is a hard delete : the rows are gone, not marked deleted.
-- It cannot be undone, so it runs inside a transaction that you
-- finish yourself :
--
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
    v_lines    int;
    v_advances int;
    v_pfloans  int;
    v_pf       int;
    v_paid     int;
    v_payments int := 0;
BEGIN
    SELECT "SalarySheetId", "Status" INTO v_sheet, v_status
    FROM   public."HrSalarySheets"
    WHERE  upper(trim("Code")) = upper(trim(v_code))
    ORDER  BY "IsDeleted", "SalarySheetId" DESC
    LIMIT  1;

    IF v_sheet IS NULL THEN
        RAISE EXCEPTION 'Salary sheet % was not found - nothing was deleted.', v_code;
    END IF;

    IF v_status = 'Posted' THEN
        RAISE EXCEPTION 'Salary sheet % is Posted : unpost it on the page first (its Journal Voucher must be cancelled). Nothing was deleted.', v_code;
    END IF;

    -- (only when Payroll Payments is installed)
    IF to_regclass('public."HrPayments"') IS NOT NULL THEN
        SELECT count(*) INTO v_paid
        FROM   public."HrPayments"
        WHERE  "PaymentType" IN ('Salary', 'Overtime') AND "SourceId" = v_sheet AND "IsCancelled" = false;

        IF v_paid > 0 THEN
            RAISE EXCEPTION 'Salary sheet % has % payment(s) on Payroll Payments : open each one and press Cancel Payment first. Nothing was deleted.', v_code, v_paid;
        END IF;

        -- the cancelled payments go with the sheet (their vouchers
        -- stay in the accounts, cancelled)
        DELETE FROM public."HrPayments"
        WHERE  "PaymentType" IN ('Salary', 'Overtime') AND "SourceId" = v_sheet;
        GET DIAGNOSTICS v_payments = ROW_COUNT;
    END IF;

    SELECT count(*) INTO v_lines    FROM public."HrSalarySheetLines"  WHERE "SalarySheetId" = v_sheet;
    SELECT count(*) INTO v_advances FROM public."HrAdvanceRecoveries" WHERE "SalarySheetId" = v_sheet;

    DELETE FROM public."HrPfLoanRecoveries" WHERE "SalarySheetId" = v_sheet;
    GET DIAGNOSTICS v_pfloans = ROW_COUNT;

    DELETE FROM public."HrPfTransactions" WHERE "SourceType" = 'SalarySheet' AND "SourceId" = v_sheet;
    GET DIAGNOSTICS v_pf = ROW_COUNT;

    -- (the lines, their heads and the advance instalments go with
    --  the sheet; deleted here too in case the tables were made
    --  without the cascade)
    DELETE FROM public."HrAdvanceRecoveries" WHERE "SalarySheetId" = v_sheet;

    DELETE FROM public."HrSalarySheetLineHeads"
    WHERE  "SalarySheetLineId" IN (SELECT "SalarySheetLineId" FROM public."HrSalarySheetLines" WHERE "SalarySheetId" = v_sheet);

    DELETE FROM public."HrSalarySheetLines" WHERE "SalarySheetId" = v_sheet;

    DELETE FROM public."HrSalarySheets" WHERE "SalarySheetId" = v_sheet;

    RAISE NOTICE 'Salary sheet % (%) removed : % line(s), % advance instalment(s), % fund loan instalment(s), % fund contribution row(s), % cancelled payment(s).',
        v_code, v_status, v_lines, v_advances, v_pfloans, v_pf, v_payments;
    RAISE NOTICE 'Nothing is final yet : run COMMIT; to keep it, or ROLLBACK; to undo it.';
END $$;

-- Run ONE of these on its own after reading the Messages tab :
--   COMMIT;
--   ROLLBACK;
