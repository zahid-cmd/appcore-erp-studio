-- =====================================================================
-- HumanResource_ProvidentFund_Accounting.sql   (2026-11-14)
-- ---------------------------------------------------------------------
-- Accounting of the provident fund, by Posting Setup.
--
-- 1. Posting Setup : eight rows, group "Provident Fund". Choose the
--    ledger of each on Settings > Account Settings > Posting Setup
--    before posting a salary sheet with fund deductions, crediting
--    the yearly interest or saving a settlement.
--
--      PF-MEMBERS-FUND            liability  what the fund owes the
--                                            members
--      PF-COMPANY-CONTRIBUTION    expense    the company's monthly part
--      PF-LOAN-RECEIVABLE         asset      loans still out
--      PF-LOAN-INTEREST-INCOME    income     interest recovered on loans
--      PF-INTEREST-EXPENSE        expense    yearly interest credited
--      PF-FORFEITURE-INCOME       income     company part a leaver does
--                                            not get, kept by the fund
--      PF-FORFEITURE-COMPANY      income     the same, when the policy
--                                            gives it back to the company
--      PF-SETTLEMENT-PAYABLE      liability  net due to a leaver
--
--    What is posted :
--      Salary sheet posted (one Journal Voucher, with the payroll rows)
--        Dr PF-COMPANY-CONTRIBUTION   company part of the month
--        Cr PF-MEMBERS-FUND           own part + company part
--        Cr PF-LOAN-RECEIVABLE        principal in the loan instalments
--        Cr PF-LOAN-INTEREST-INCOME   interest in the loan instalments
--      Yearly interest credited (one Journal Voucher a branch)
--        Dr PF-INTEREST-EXPENSE       Cr PF-MEMBERS-FUND
--      Settlement saved (one Journal Voucher)
--        Dr PF-MEMBERS-FUND           own balance + company balance
--        Cr PF-FORFEITURE-INCOME      company part forfeited (or
--           PF-FORFEITURE-COMPANY     when the policy gives it back
--                                     to the company)
--        Cr PF-LOAN-RECEIVABLE        loan principal still out
--        Cr PF-LOAN-INTEREST-INCOME   loan interest taken on settling
--        Cr PF-SETTLEMENT-PAYABLE     net payable
--      By Payment Voucher (yourself) :
--        loan given        Dr PF-LOAN-RECEIVABLE     Cr cash / bank
--        settlement paid   Dr PF-SETTLEMENT-PAYABLE  Cr cash / bank
--      Opening balances of members post nothing : they belong to the
--      opening balances of the accounts.
--
-- 2. The Journal Voucher of a settlement and of the yearly interest
--    is kept on the row (two columns each).
--
-- Safe to run more than once. ASCII only.
-- =====================================================================


-- ------------------------------------------------------------
-- 1. Posting Setup : the provident fund ledgers
-- ------------------------------------------------------------

INSERT INTO public."PostingSetups"
(
    "PurposeCode", "PurposeName", "GroupName", "Description", "UsedBy",
    "AllowedSubGroupCodes", "LedgerCode", "IsRequired", "DisplayOrder",
    "CreatedBy", "CreatedDate"
)
VALUES
    ('PF-MEMBERS-FUND', 'Provident Fund - Members Fund', 'Provident Fund',
     'What the fund owes the members (liability) : credited with the own part and the company part of every salary sheet and with the yearly interest; debited when a member is settled.',
     'Salary Sheets, PF Interest, PF Settlements', '', '', false, 210, 1, now()),
    ('PF-COMPANY-CONTRIBUTION', 'Provident Fund - Company Contribution', 'Provident Fund',
     'Debited with the company part of the fund when a salary sheet is posted (expense).',
     'Salary Sheets', '', '', false, 211, 1, now()),
    ('PF-LOAN-RECEIVABLE', 'Provident Fund - Loan Receivable', 'Provident Fund',
     'Loans given from the fund and still out (asset) : debited when a loan is paid out by Payment Voucher; credited with the principal recovered from salary or taken off a settlement.',
     'Salary Sheets, PF Loans, PF Settlements', '', '', false, 212, 1, now()),
    ('PF-LOAN-INTEREST-INCOME', 'Provident Fund - Loan Interest Income', 'Provident Fund',
     'Credited with the interest in the loan instalments recovered (income of the fund).',
     'Salary Sheets, PF Settlements', '', '', false, 213, 1, now()),
    ('PF-INTEREST-EXPENSE', 'Provident Fund - Interest Expense', 'Provident Fund',
     'Debited with the yearly interest credited to the members on PF Interest (expense).',
     'PF Interest', '', '', false, 214, 1, now()),
    ('PF-FORFEITURE-INCOME', 'Provident Fund - Forfeiture Income', 'Provident Fund',
     'Credited with the company part a member does not get on leaving (policy : years, misconduct), when the policy keeps it in the fund.',
     'PF Settlements', '', '', false, 215, 1, now()),
    ('PF-FORFEITURE-COMPANY', 'Provident Fund - Forfeiture to Company', 'Provident Fund',
     'Credited with the company part a member does not get on leaving, when the policy gives it back to the company (income of the company).',
     'PF Settlements', '', '', false, 217, 1, now()),
    ('PF-SETTLEMENT-PAYABLE', 'Provident Fund - Settlement Payable', 'Provident Fund',
     'Credited with the net amount due to a member who is settled (liability); debited when it is paid by Payment Voucher.',
     'PF Settlements', '', '', false, 216, 1, now())
ON CONFLICT ("PurposeCode") DO UPDATE
SET "PurposeName" = EXCLUDED."PurposeName",
    "GroupName"   = EXCLUDED."GroupName",
    "Description" = EXCLUDED."Description",
    "UsedBy"      = EXCLUDED."UsedBy";

-- (the other deductions of a salary sheet : "Payroll - Other
--  Deductions Payable", HumanResource_DeductionLedgers_Engine.sql)


-- ------------------------------------------------------------
-- 2. The Journal Voucher of a settlement / of the yearly interest
-- ------------------------------------------------------------

ALTER TABLE public."HrPfSettlements"
    ADD COLUMN IF NOT EXISTS "JournalVoucherId" bigint                NULL,
    ADD COLUMN IF NOT EXISTS "JournalVoucherNo" character varying(30) NOT NULL DEFAULT '';

-- The company part forfeited : kept by the fund (false) or given
-- back to the company (true). The policy decides; a settlement
-- keeps what the policy said on its day.
ALTER TABLE public."HrPfPolicy"
    ADD COLUMN IF NOT EXISTS "ForfeitToCompany" boolean NOT NULL DEFAULT false;

ALTER TABLE public."HrPfSettlements"
    ADD COLUMN IF NOT EXISTS "ForfeitedToCompany" boolean NOT NULL DEFAULT false;

ALTER TABLE public."HrPfTransactions"
    ADD COLUMN IF NOT EXISTS "JournalVoucherId" bigint                NULL,
    ADD COLUMN IF NOT EXISTS "JournalVoucherNo" character varying(30) NOT NULL DEFAULT '';


-- ------------------------------------------------------------
-- Check (run on its own)
-- ------------------------------------------------------------
SELECT "PurposeCode", "PurposeName", "LedgerCode"
FROM   public."PostingSetups"
WHERE  "GroupName" = 'Provident Fund'
ORDER  BY "DisplayOrder";
