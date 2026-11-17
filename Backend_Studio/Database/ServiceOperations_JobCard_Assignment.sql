ROLLBACK;

-- =====================================================================
-- ServiceOperations_JobCard_Assignment.sql   (2026-11-18)
-- ---------------------------------------------------------------------
-- The Assignment page of a job card (owner 2026-11-18) :
--
--   JobCards  + SupervisorEmployeeId   the foreman / supervisor
--             + TechnicianEmployeeId   the technician (one, an employee
--                                      for now : changed after HR)
--             + StandardMinutes        the standard time of the picked
--                                      services (can be changed)
--             + AllowedMinutes         the time allowed for the job
--
-- The expected delivery (the delivery date, the time of the
-- assignment + the allowed time) is kept in PromisedAt, which is
-- there already.
--
-- Run ServiceOperations_JobCard_ServiceBikes.sql first.
-- Safe to run more than once. Run the whole script (F5). ASCII only.
--
-- AFTER : restart the API. (The API does not open the job cards
-- before this script is run.)
-- =====================================================================

ALTER TABLE public."JobCards"
    ADD COLUMN IF NOT EXISTS "SupervisorEmployeeId" bigint  NULL,
    ADD COLUMN IF NOT EXISTS "TechnicianEmployeeId" bigint  NULL,
    ADD COLUMN IF NOT EXISTS "StandardMinutes"      integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "AllowedMinutes"       integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "IX_JobCards_TechnicianEmployee" ON public."JobCards" ("TechnicianEmployeeId");


-- ------------------------------------------------------------
-- Check (run on its own) : the four columns
-- ------------------------------------------------------------
-- SELECT column_name, data_type
-- FROM   information_schema.columns
-- WHERE  table_name = 'JobCards'
-- AND    column_name IN ('SupervisorEmployeeId', 'TechnicianEmployeeId', 'StandardMinutes', 'AllowedMinutes');
