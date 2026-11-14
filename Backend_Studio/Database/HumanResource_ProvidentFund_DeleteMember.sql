-- =====================================================================
-- HumanResource_ProvidentFund_DeleteMember.sql   (2026-11-14)
-- ---------------------------------------------------------------------
-- Removes ONE provident fund member completely, with everything that
-- hangs on it :
--
--   HrPfLoanRecoveries   what was recovered of the member's loans
--   HrPfLoans            the member's loans
--   HrPfSettlements      the member's settlements
--   HrPfTransactions     the member's fund ledger (opening,
--                        contributions, interest, payment, forfeit)
--   HrPfMembers          the member
--
-- This is a hard delete : the rows are gone, not marked deleted.
-- It cannot be undone, so it runs inside a transaction that you
-- finish yourself :
--
--   1. Set the member code on the line marked  <<< CHANGE  below.
--   2. Run the whole script (F5) on AppCoreERP_Studio.
--   3. Read the counts in the Messages tab.
--   4. They are right  : run   COMMIT;
--      They are wrong  : run   ROLLBACK;
--
-- Salary sheets are not touched : a sheet that already kept back a
-- fund deduction or a loan instalment for this employee keeps its
-- figures. Recalculate a Draft sheet afterwards if you want them gone.
-- ASCII only.
-- =====================================================================

BEGIN;

DO $$
DECLARE
    v_code       text := 'PFM-0001';      -- <<< CHANGE : the member to remove
    v_member     bigint;
    v_recoveries int;
    v_loans      int;
    v_settle     int;
    v_ledger     int;
BEGIN
    SELECT "PfMemberId" INTO v_member
    FROM   public."HrPfMembers"
    WHERE  upper(trim("Code")) = upper(trim(v_code))
    LIMIT  1;

    IF v_member IS NULL THEN
        RAISE EXCEPTION 'Provident fund member % was not found - nothing was deleted.', v_code;
    END IF;

    DELETE FROM public."HrPfLoanRecoveries"
    WHERE  "PfLoanId" IN (SELECT "PfLoanId" FROM public."HrPfLoans" WHERE "PfMemberId" = v_member);
    GET DIAGNOSTICS v_recoveries = ROW_COUNT;

    DELETE FROM public."HrPfLoans" WHERE "PfMemberId" = v_member;
    GET DIAGNOSTICS v_loans = ROW_COUNT;

    DELETE FROM public."HrPfSettlements" WHERE "PfMemberId" = v_member;
    GET DIAGNOSTICS v_settle = ROW_COUNT;

    DELETE FROM public."HrPfTransactions" WHERE "PfMemberId" = v_member;
    GET DIAGNOSTICS v_ledger = ROW_COUNT;

    DELETE FROM public."HrPfMembers" WHERE "PfMemberId" = v_member;

    RAISE NOTICE 'Member % removed : % loan(s), % loan recovery row(s), % settlement(s), % ledger row(s).',
        v_code, v_loans, v_recoveries, v_settle, v_ledger;
    RAISE NOTICE 'Nothing is final yet : run COMMIT; to keep it, or ROLLBACK; to undo it.';
END $$;

-- Run ONE of these on its own after reading the Messages tab :
--   COMMIT;
--   ROLLBACK;
