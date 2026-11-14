-- =====================================================================
-- HumanResource_DeductionLedgers_Engine.sql   (2026-11-14)
-- ---------------------------------------------------------------------
-- A ledger of its own for every deduction of a salary sheet.
--
-- 1. HrSalaryHeads."PayableLedgerCode" : the ledger a DEDUCTION head
--    is credited to when a salary sheet is posted (Tax Payable for
--    the head Tax ...). Picked on Human Resource Setup > Salary Heads.
--
-- 2. Posting Setup : ONE row for every other deduction,
--    "Payroll - Other Deductions Payable" :
--      - the amount typed in the Other - column of a salary sheet
--      - a deduction head that has no Payable Ledger of its own
--    The old row "Payroll - Deductions Payable" is merged into it :
--    its ledger is carried over (when the new row has none) and the
--    old row is removed.
--
-- Safe to run more than once. ASCII only.
-- =====================================================================


-- ------------------------------------------------------------
-- 1. The ledger of a deduction head
-- ------------------------------------------------------------

ALTER TABLE public."HrSalaryHeads"
    ADD COLUMN IF NOT EXISTS "PayableLedgerCode" character varying(30) NOT NULL DEFAULT '';


-- ------------------------------------------------------------
-- 2. Posting Setup : one row for the other deductions
-- ------------------------------------------------------------

INSERT INTO public."PostingSetups"
(
    "PurposeCode", "PurposeName", "GroupName", "Description", "UsedBy",
    "AllowedSubGroupCodes", "LedgerCode", "IsRequired", "DisplayOrder",
    "CreatedBy", "CreatedDate"
)
VALUES
    ('PAYROLL-OTHER-DEDUCTIONS', 'Payroll - Other Deductions Payable', 'Payroll',
     'Credited with the deductions of a salary sheet that have no ledger of their own : the amount typed in the Other - column, and a deduction head without a Payable Ledger (Salary Heads). The provident fund has its own rows (group Provident Fund).',
     'Salary Sheets', '', '', false, 203, 1, now())
ON CONFLICT ("PurposeCode") DO UPDATE
SET "PurposeName"  = EXCLUDED."PurposeName",
    "GroupName"    = EXCLUDED."GroupName",
    "Description"  = EXCLUDED."Description",
    "UsedBy"       = EXCLUDED."UsedBy",
    "DisplayOrder" = EXCLUDED."DisplayOrder";

-- the old row is merged into it : its ledger first, then the row
UPDATE public."PostingSetups" n
SET    "LedgerCode" = o."LedgerCode"
FROM   public."PostingSetups" o
WHERE  n."PurposeCode" = 'PAYROLL-OTHER-DEDUCTIONS'
AND    o."PurposeCode" = 'PAYROLL-DEDUCTIONS-PAYABLE'
AND    n."LedgerCode" = ''
AND    o."LedgerCode" <> '';

DELETE FROM public."PostingSetups"
WHERE  "PurposeCode" = 'PAYROLL-DEDUCTIONS-PAYABLE';


-- ------------------------------------------------------------
-- Check (run on its own)
-- ------------------------------------------------------------
SELECT "Code", "Name", "HeadType", "PayableLedgerCode"
FROM   public."HrSalaryHeads"
WHERE  "IsDeleted" = false AND "HeadType" = 'Deduction'
ORDER  BY "DisplayOrder", "Code";

SELECT "DisplayOrder", "PurposeCode", "PurposeName", "LedgerCode"
FROM   public."PostingSetups"
WHERE  "GroupName" = 'Payroll'
ORDER  BY "DisplayOrder";
