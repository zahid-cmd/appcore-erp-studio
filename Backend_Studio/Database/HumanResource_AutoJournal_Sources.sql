-- =====================================================================
-- HumanResource_AutoJournal_Sources.sql   (2026-11-14)
-- ---------------------------------------------------------------------
-- Human Resource on Accounts & Finance > Accounting Registers >
-- Auto Journal Registers.
--
-- The journals of Human Resource are Journal Vouchers (JV) written by
-- the pages :
--     Salary Sheets     the salary of a branch's month (posting)
--     PF Settlements    a member leaving the fund
--     PF Interest       the yearly interest of the fund
--
-- A JV typed by hand stays off the register (as before). A JV belongs
-- to a page when that page's table holds its number, so each page
-- gets a small view with one column "VoucherNo" (what the register
-- looks for) :
--     HrSalarySheetVouchers / HrPfSettlementVouchers / HrPfInterestVouchers
--
-- Run AFTER HumanResource_ProvidentFund_Accounting.sql (it adds the
-- voucher columns of the fund) and AutoJournalRegisters_Sources.sql.
-- Safe to run more than once. ASCII only.
-- =====================================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. The voucher numbers of each page
-- ------------------------------------------------------------

CREATE OR REPLACE VIEW public."HrSalarySheetVouchers" AS
SELECT DISTINCT "JournalVoucherNo" AS "VoucherNo"
FROM   public."HrSalarySheets"
WHERE  "JournalVoucherNo" <> '';

CREATE OR REPLACE VIEW public."HrPfSettlementVouchers" AS
SELECT DISTINCT "JournalVoucherNo" AS "VoucherNo"
FROM   public."HrPfSettlements"
WHERE  "JournalVoucherNo" <> '';

CREATE OR REPLACE VIEW public."HrPfInterestVouchers" AS
SELECT DISTINCT "JournalVoucherNo" AS "VoucherNo"
FROM   public."HrPfTransactions"
WHERE  "TxnType" = 'Interest' AND "JournalVoucherNo" <> '';


-- ------------------------------------------------------------
-- 2. Sources (page found by the end of its route)
-- ------------------------------------------------------------

INSERT INTO public."AutoJournalSources"
    ("VoucherType", "SourceTable", "NavigationSubmenuCode", "IsAutoJournal", "DisplayOrder", "Remarks")
SELECT
    v.voucher_type,
    v.source_table,
    COALESCE(s."Code", ''),
    true,
    v.ord,
    v.remarks
FROM
(
    VALUES
        (61, 'JV', 'HrSalarySheetVouchers',  '/salary-sheets',  'Human Resource : salary sheet posted'),
        (62, 'JV', 'HrPfSettlementVouchers', '/pf-settlements', 'Human Resource : provident fund settlement'),
        (63, 'JV', 'HrPfInterestVouchers',   '/pf-interest',    'Human Resource : provident fund interest')
) AS v (ord, voucher_type, source_table, route_end, remarks)
LEFT JOIN LATERAL
(
    SELECT n."Code"
    FROM   "NavigationSubmenus" n
    WHERE  n."IsDeleted" = false
    AND    lower(n."Route") LIKE '/human-resource-manangement/%' || v.route_end
    ORDER  BY n."Id"
    LIMIT  1
) AS s ON true
ON CONFLICT ("VoucherType", "SourceTable") DO UPDATE
SET    "NavigationSubmenuCode" = EXCLUDED."NavigationSubmenuCode"
WHERE  public."AutoJournalSources"."NavigationSubmenuCode" = ''
AND    EXCLUDED."NavigationSubmenuCode" <> '';

COMMIT;


-- ------------------------------------------------------------
-- Check (run on its own) : an empty Page means the route was not
-- found
-- ------------------------------------------------------------

SELECT j."VoucherType",
       j."SourceTable",
       j."NavigationSubmenuCode" AS "Submenu",
       COALESCE(s."Name", '')    AS "Page",
       j."IsAutoJournal",
       j."Remarks"
FROM   public."AutoJournalSources" j
LEFT   JOIN "NavigationSubmenus" s ON s."Code" = j."NavigationSubmenuCode" AND s."IsDeleted" = false
WHERE  j."VoucherType" = 'JV'
ORDER  BY j."DisplayOrder";
