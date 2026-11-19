ROLLBACK;

-- =====================================================================
-- Service Operations > Workshop Management : Job Closing, the details
-- (2026-11-19)
--
--   ServiceInvoices      + LineDiscount   the discounts of the lines,
--                                         together (Discount stays the
--                                         discount of the bill as a
--                                         whole : the round off)
--   ServiceInvoiceLines  + DiscountText   as typed : "10%" or "50.00"
--                        + Discount       its amount (VAT is counted
--                                         on Amount - Discount)
--   JobCardComplaints    + Result         '' / Solved / Needs Further
--                        + ResultNote     Work / Not Done, with a note
--   JobCardObservations  + Result
--                        + ResultNote
--
-- Columns only, each with a default : no row is changed and no figure
-- of a posted bill moves. Safe to run again (IF NOT EXISTS). Run the
-- whole script (F5), then restart the API.
-- =====================================================================

ALTER TABLE "ServiceInvoices"
    ADD COLUMN IF NOT EXISTS "LineDiscount" numeric(18,2) NOT NULL DEFAULT 0;

ALTER TABLE "ServiceInvoiceLines"
    ADD COLUMN IF NOT EXISTS "DiscountText" varchar(20) NOT NULL DEFAULT '';

ALTER TABLE "ServiceInvoiceLines"
    ADD COLUMN IF NOT EXISTS "Discount" numeric(18,2) NOT NULL DEFAULT 0;

ALTER TABLE "JobCardComplaints"
    ADD COLUMN IF NOT EXISTS "Result" varchar(30) NOT NULL DEFAULT '';

ALTER TABLE "JobCardComplaints"
    ADD COLUMN IF NOT EXISTS "ResultNote" varchar(300) NOT NULL DEFAULT '';

ALTER TABLE "JobCardObservations"
    ADD COLUMN IF NOT EXISTS "Result" varchar(30) NOT NULL DEFAULT '';

ALTER TABLE "JobCardObservations"
    ADD COLUMN IF NOT EXISTS "ResultNote" varchar(300) NOT NULL DEFAULT '';


-- ---------------------------------------------------------------------
-- Check (run on its own) : the seven columns
-- ---------------------------------------------------------------------

SELECT table_name AS "Table", column_name AS "Column", data_type AS "Type"
FROM   information_schema.columns
WHERE  (table_name = 'ServiceInvoices'     AND column_name = 'LineDiscount')
   OR  (table_name = 'ServiceInvoiceLines' AND column_name IN ('DiscountText', 'Discount'))
   OR  (table_name = 'JobCardComplaints'   AND column_name IN ('Result', 'ResultNote'))
   OR  (table_name = 'JobCardObservations' AND column_name IN ('Result', 'ResultNote'))
ORDER  BY table_name, column_name;
