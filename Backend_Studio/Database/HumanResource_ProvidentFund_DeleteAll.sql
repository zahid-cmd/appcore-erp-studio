-- =====================================================================
-- HumanResource_ProvidentFund_DeleteAll.sql   (2026-11-14)
-- ---------------------------------------------------------------------
-- Empties the provident fund : EVERY member and everything that hangs
-- on the members :
--
--   HrPfLoanRecoveries   what was recovered of the loans
--   HrPfLoans            the loans
--   HrPfSettlements      the settlements
--   HrPfTransactions     the fund ledger : opening, contributions,
--                        INTEREST (every year credited), payment,
--                        forfeit
--   HrPfMembers          the members
--
-- Kept : the Provident Fund Policy (HrPfPolicy) and the menu.
--
-- This is a hard delete : the rows are gone, not marked deleted.
-- It cannot be undone, so it runs inside a transaction that you
-- finish yourself :
--
--   1. Run the whole script (F5) on AppCoreERP_Studio.
--   2. Read the counts in the Messages tab.
--   3. They are right  : run   COMMIT;
--      They are wrong  : run   ROLLBACK;
--
-- Salary sheets are not touched : a sheet that already kept back a
-- fund deduction or a loan instalment keeps its figures. Recalculate
-- a Draft sheet afterwards if you want them gone.
-- ASCII only.
-- =====================================================================

BEGIN;

DO $$
DECLARE
    v_recoveries int;
    v_loans      int;
    v_settle     int;
    v_interest   int;
    v_ledger     int;
    v_members    int;
BEGIN
    DELETE FROM public."HrPfLoanRecoveries";
    GET DIAGNOSTICS v_recoveries = ROW_COUNT;

    DELETE FROM public."HrPfLoans";
    GET DIAGNOSTICS v_loans = ROW_COUNT;

    DELETE FROM public."HrPfSettlements";
    GET DIAGNOSTICS v_settle = ROW_COUNT;

    -- the interest rows first, to count them on their own
    DELETE FROM public."HrPfTransactions" WHERE "TxnType" = 'Interest';
    GET DIAGNOSTICS v_interest = ROW_COUNT;

    DELETE FROM public."HrPfTransactions";
    GET DIAGNOSTICS v_ledger = ROW_COUNT;

    DELETE FROM public."HrPfMembers";
    GET DIAGNOSTICS v_members = ROW_COUNT;

    RAISE NOTICE 'Provident fund emptied : % member(s), % loan(s), % loan recovery row(s), % settlement(s), % interest row(s), % other ledger row(s).',
        v_members, v_loans, v_recoveries, v_settle, v_interest, v_ledger;
    RAISE NOTICE 'Nothing is final yet : run COMMIT; to keep it, or ROLLBACK; to undo it.';
END $$;

-- Run ONE of these on its own after reading the Messages tab :
--   COMMIT;
--   ROLLBACK;
