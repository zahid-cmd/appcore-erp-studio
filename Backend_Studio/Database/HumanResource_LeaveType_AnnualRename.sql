-- =====================================================================
-- HumanResource_LeaveType_AnnualRename.sql   (2026-11-14)
-- ---------------------------------------------------------------------
-- Renames the leave type "Annual Leave" to "Annual Leave / Earned
-- Leave". Safe to run more than once. ASCII only.
-- =====================================================================

UPDATE public."HrLeaveTypes"
SET    "Name" = 'Annual Leave / Earned Leave',
       "ModifiedDate" = now()
WHERE  lower(trim("Name")) = 'annual leave'
AND    "IsDeleted" = false;

-- Check
SELECT "Code", "Name", "DaysPerYear", "IsPaid", "AppliesTo"
FROM   public."HrLeaveTypes"
WHERE  "IsDeleted" = false
ORDER  BY "Code";
