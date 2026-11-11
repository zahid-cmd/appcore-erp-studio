/*===============================================================
  One-off : after Delete_SalesInvoicesMb_All.sql, put the number
  counters of Sales Invoices - MB (SIMB) and Receipt Vouchers (RV)
  back to the highest number still in use in each branch / year /
  month (owner 2026-11-11). With no MB invoice left the next one
  is ...-00001 again; RV goes back to the last receipt voucher
  that still exists (other receipts keep their numbers).

  Safe to run more than once. ASCII only. Run the whole file (F5).
===============================================================*/

BEGIN;

-- What changes (before)
SELECT s."Prefix", s."BranchDigits", s."FinancialYearCode", s."PeriodMonth", s."LastNumber" AS "Last (before)"
FROM   public."VoucherSequences" s
WHERE  s."Prefix" IN ('SIMB', 'RV')
ORDER  BY s."Prefix", s."BranchDigits", s."FinancialYearCode", s."PeriodMonth";

UPDATE public."VoucherSequences" s
SET    "LastNumber"   = COALESCE(
           (
               SELECT max(substring(d.no FROM '([0-9]+)$')::integer)
               FROM
               (
                   SELECT h."InvoiceNo" AS no FROM public."SalesInvoicesMb" h WHERE s."Prefix" = 'SIMB'
                   UNION ALL
                   SELECT r."VoucherNo" FROM public."ReceiptVoucher" r WHERE s."Prefix" = 'RV'
               ) d
               WHERE d.no LIKE s."Prefix" || '-' || s."BranchDigits" || '-' || s."FinancialYearCode" || '-'
                               || lpad(s."PeriodMonth"::text, 2, '0') || '-%'
           ), 0),
       "ModifiedDate" = now()
WHERE  s."Prefix" IN ('SIMB', 'RV');

COMMIT;

-- After
SELECT s."Prefix", s."BranchDigits", s."FinancialYearCode", s."PeriodMonth", s."LastNumber" AS "Last (after)"
FROM   public."VoucherSequences" s
WHERE  s."Prefix" IN ('SIMB', 'RV')
ORDER  BY s."Prefix", s."BranchDigits", s."FinancialYearCode", s."PeriodMonth";

