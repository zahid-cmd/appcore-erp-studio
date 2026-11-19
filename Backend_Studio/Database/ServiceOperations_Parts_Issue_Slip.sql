ROLLBACK;

-- =====================================================================
-- ServiceOperations_Parts_Issue_Slip.sql   (2026-11-18)
-- ---------------------------------------------------------------------
-- Parts Issues (owner 2026-11-18) : the Material Issue Slip (MIS).
-- The parts allocated to a job card (Job Card Requirements) go out of
-- the store on a slip. One slip can carry the parts of several job
-- cards (switch Parts Issue To Multiple Job Cards).
--
--   PartsIssues            + MisNo : the slip an issue is on
--                            (MIS-<service center>-<FY>-<MM>-00001).
--                            Every job card of a slip keeps its own
--                            issue (WPI : stock, cost, journal,
--                            returns); the slip is their common number.
--                            Empty : an issue of before the slips.
--   WorkshopConfiguration  + IssueToMultipleJobs : ON = one slip can
--                            carry several job cards. Default OFF
--                            (one job card a slip).
--                          + IssueBulkPerJob : ON = a picked job card
--                            brings all its waiting parts on the slip.
--                            Default OFF (the store keeper adds the
--                            parts one by one : job card, part,
--                            quantity).
--
-- Safe to run more than once. Run the whole script (F5). ASCII only.
--
-- AFTER : restart the API.
-- =====================================================================

ALTER TABLE public."PartsIssues"
    ADD COLUMN IF NOT EXISTS "MisNo" character varying(30) NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS "IX_PartsIssues_MisNo"
    ON public."PartsIssues" ("MisNo");

ALTER TABLE public."WorkshopConfiguration"
    ADD COLUMN IF NOT EXISTS "IssueToMultipleJobs" boolean NOT NULL DEFAULT false;

ALTER TABLE public."WorkshopConfiguration"
    ADD COLUMN IF NOT EXISTS "IssueBulkPerJob" boolean NOT NULL DEFAULT false;

DO $$
BEGIN
    RAISE NOTICE 'Parts Issue Slip : PartsIssues.MisNo, WorkshopConfiguration.IssueToMultipleJobs and IssueBulkPerJob are in place.';
END $$;
