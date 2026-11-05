-- ============================================================
-- Enquiry Management : hide Sales Follow-ups and Service
-- Follow-ups (2026-11-04)
--
-- Calls are now logged from Sales / Service Enquiries (phone icon
-- on the list, "Add follow-up" on the form). Follow-up activity
-- goes to the Enquiry Dashboard. The two submenus are set
-- INACTIVE (not deleted) : their names stay reserved and they
-- can be switched back on.
--
-- Plain statements only : run in a NEW pgAdmin Query Tool with
-- F5. Safe to run again.
-- ============================================================

UPDATE "NavigationSubmenus"
SET    "IsActive" = false
WHERE  "IsDeleted" = false
AND    lower("Route") IN
       (
           '/enquiry-management/follow-ups-appointments/sales-follow-ups',
           '/enquiry-management/follow-ups-appointments/service-follow-ups'
       );
