ROLLBACK;

-- ============================================================
-- Sales Invoices - MB : VAT Payable - Motor Bikes (2026-11-11)
-- Run the whole file in a NEW pgAdmin Query Tool (F5).
-- Safe to run again. ASCII only.
--
-- 1. SalesInvoicesMbLines."VatPayable" : the VAT on the dealer's
--    value addition per chassis = VAT inside the selling price -
--    VAT inside the price card DP (the card's "VAT Payable").
-- 2. Posting Setup purpose VAT-PAYABLE-MB. Choose its ledger
--    (a liability, e.g. "VAT Payable - Motor Bikes") on the
--    Posting Setup page : an MB sale does not post until it has one.
--
-- MB sale VAT lines after this change :
--   Cr VAT Current Account        6.3 VAT of the batch (as before)
--   Cr VAT Payable - MB           VAT inside - VAT inside card DP
--   Dr VAT Reimbursement - MB     6.3 VAT - VAT inside card DP
--      (Cr when negative)
-- Invoices posted before this change keep their journal; their
-- VatPayable stays 0.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Column
-- ------------------------------------------------------------

ALTER TABLE public."SalesInvoicesMbLines"
    ADD COLUMN IF NOT EXISTS "VatPayable" numeric(18,2) NOT NULL DEFAULT 0;


-- ------------------------------------------------------------
-- 2. Posting Setup : VAT Payable - Motor Bikes (the ledger is
--    chosen on the Posting Setup page; never touched here)
-- ------------------------------------------------------------

INSERT INTO public."PostingSetups"
(
    "PurposeCode", "PurposeName", "GroupName", "Description", "UsedBy",
    "AllowedSubGroupCodes", "LedgerCode", "IsRequired", "DisplayOrder"
)
VALUES
    ('VAT-PAYABLE-MB', 'VAT Payable - Motor Bikes', 'VAT Payable',
     'VAT on the dealer''s value addition per Motor Bike sold : VAT inside the selling price minus VAT inside the price card DP. Credited on each Sales Invoice - MB, debited when paid on VAT Payment (A-Challan, per chassis).',
     'Sales Invoices - MB, VAT Payment (later)',
     '', '', false, 71)
ON CONFLICT ("PurposeCode") DO UPDATE
SET "PurposeName"          = EXCLUDED."PurposeName",
    "GroupName"            = EXCLUDED."GroupName",
    "Description"          = EXCLUDED."Description",
    "UsedBy"               = EXCLUDED."UsedBy",
    "AllowedSubGroupCodes" = EXCLUDED."AllowedSubGroupCodes",
    "IsRequired"           = EXCLUDED."IsRequired",
    "DisplayOrder"         = EXCLUDED."DisplayOrder";


/*  Check (select and run on its own)

SELECT "PurposeCode", "PurposeName", "LedgerCode"
FROM   public."PostingSetups"
WHERE  "PurposeCode" IN ('VAT-PAYABLE-MB', 'VAT-REIMB-MB');

*/
