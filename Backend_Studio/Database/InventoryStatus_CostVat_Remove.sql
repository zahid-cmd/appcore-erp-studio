-- ============================================================
-- Inventory Status pages : remove "View Cost incl. VAT"
-- (2026-11-06, owner : one "View Cost" per page; the cost on the
-- stock pages is always incl. VAT)
--
-- Run this only if InventoryStatus_CostVat_Activity.sql was run.
-- It unlinks the action from every page, removes it from the
-- roles / users that had it, and marks it deleted.
--
-- Safe to run more than once. Run the whole script (F5).
-- ============================================================

BEGIN;

DELETE FROM "MasterActivityPages" p
USING  "MasterActivities" a
WHERE  p."MasterActivityCode" = a."Code"
AND    lower(trim(a."Name")) = lower('View Cost incl. VAT');

UPDATE "MasterActivities"
SET    "IsDeleted" = true,
       "IsActive"  = false
WHERE  lower(trim("Name")) = lower('View Cost incl. VAT')
AND    "IsDeleted" = false;

COMMIT;

-- Check : should return no row
SELECT "Code", "Name", "IsDeleted"
FROM   "MasterActivities"
WHERE  lower(trim("Name")) = lower('View Cost incl. VAT')
AND    "IsDeleted" = false;
