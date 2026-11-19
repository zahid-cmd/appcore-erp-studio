ROLLBACK;

-- =====================================================================
-- ServiceOperations_JobCard_Requirements.sql   (2026-11-18)
-- ---------------------------------------------------------------------
-- Job Card Requirements (owner 2026-11-18) : the parts and the service
-- charges of an assigned job are allocated on one page, per job. It
-- takes the place of the Parts Requisitions page.
--
--   The submenu "Parts Requisitions" of Service Operations is renamed
--   "Job Card Requirements". Its route stays the same
--   (.../parts-requisitions), so the permissions the roles have on it
--   stay as they are.
--
-- No table is changed : the requirement is kept in the lines of the
-- job card (JobCardParts, JobCardServices), and the new status
-- "Allocated" is a value of JobCards.Status.
--
-- Safe to run more than once. Run the whole script (F5). ASCII only.
--
-- AFTER : restart the API, then log in again (the side bar is read
-- at login).
-- =====================================================================

DO $$
DECLARE
    v_count integer;
BEGIN
    -- Submenu names are unique across the system (Code Sync)
    IF EXISTS (SELECT 1
               FROM   "NavigationSubmenus"
               WHERE  lower("Name") = 'job card requirements'
               AND    "IsDeleted" = false
               AND    NOT (lower("RouteKey") = 'parts-requisitions' AND lower("Route") LIKE '/service-operations/%')) THEN
        RAISE EXCEPTION 'A submenu named "Job Card Requirements" already exists elsewhere : names must be unique.';
    END IF;

    UPDATE "NavigationSubmenus"
    SET    "Name" = 'Job Card Requirements',
           "Icon" = 'fa-solid fa-list-check'
    WHERE  lower("RouteKey") = 'parts-requisitions'
    AND    lower("Route") LIKE '/service-operations/%'
    AND    "IsDeleted" = false;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RAISE NOTICE 'Submenu renamed to Job Card Requirements : % row(s)', v_count;
END $$;


-- ------------------------------------------------------------
-- Check (run on its own) : the submenu
-- ------------------------------------------------------------
-- SELECT "Code", "Name", "Route"
-- FROM   "NavigationSubmenus"
-- WHERE  lower("RouteKey") = 'parts-requisitions';
