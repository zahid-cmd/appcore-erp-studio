-- =====================================================================
-- HumanResource_EncashmentApproval_Engine.sql   (2026-11-14)
-- ---------------------------------------------------------------------
-- Leave Encashments : an approval step.
--
--   Pending    saved : the days are held off the leave balance,
--              nothing is posted
--   Approved   the Journal Voucher is posted; it can be paid on
--              Payroll Payments
--   Rejected   the days go back to the leave balance
--
-- The encashments saved before this script were posted on saving :
-- they become Approved.
--
-- Run AFTER HumanResource_EncashmentPolicies_Engine.sql. Safe to run
-- more than once. ASCII only.
-- =====================================================================

ALTER TABLE public."HrLeaveEncashments"
    ADD COLUMN IF NOT EXISTS "Status"       character varying(10)    NOT NULL DEFAULT 'Approved',
    ADD COLUMN IF NOT EXISTS "ApprovedBy"   bigint                   NULL,
    ADD COLUMN IF NOT EXISTS "ApprovedDate" timestamp with time zone NULL,
    ADD COLUMN IF NOT EXISTS "RejectReason" character varying(300)   NOT NULL DEFAULT '';

-- Check (run on its own)
SELECT "Code", "Status", "Days", "Amount", "JournalVoucherNo"
FROM   public."HrLeaveEncashments"
WHERE  "IsDeleted" = false
ORDER  BY "Code";
