ROLLBACK;

-- =====================================================================
-- TEST_Tenant_Make_Leftover.sql   (2026-11-20)
-- ---------------------------------------------------------------------
-- TEST HELPER, only for the throwaway tenant TEST.
--
-- Makes tenant TEST look like a Create database that failed half way :
-- the Console forgets the database of TEST, but the database
-- AppCore_TW_TEST and the login appcore_t_tw_test stay on the server.
-- The tenant page then offers "Remove leftover", which is what is
-- being tested (review-console-onboarding-2026-11-20.md, B1).
--
-- Touches ONE row : Tenants where TenantCode = 'TEST'.
-- Run on the database AppCore_Control only (it refuses any other).
-- Query Tool on AppCore_Control, the whole file (F5). Read the
-- Messages tab, then run COMMIT; (or ROLLBACK;).
-- Safe to run again.
-- ASCII only.
-- =====================================================================

BEGIN;

DO $$
DECLARE
    n int;
BEGIN
    IF current_database() <> 'AppCore_Control' THEN
        RAISE EXCEPTION 'This is %, not AppCore_Control - nothing was changed.', current_database();
    END IF;

    UPDATE "Tenants"
    SET    "DatabaseName"     = NULL,
           "DbUsername"       = NULL,
           "DbPasswordSealed" = NULL,
           "Status"           = 'Provisioning',
           "TrialEndsOn"      = NULL
    WHERE  "TenantCode" = 'TEST';

    GET DIAGNOSTICS n = ROW_COUNT;

    IF n <> 1 THEN
        RAISE EXCEPTION 'Expected 1 tenant TEST, found % - nothing was changed.', n;
    END IF;

    RAISE NOTICE 'Tenant TEST : database forgotten, status Provisioning.';
    RAISE NOTICE 'Done. Run COMMIT; (or ROLLBACK;), then refresh the tenant page in the Console.';
END $$;


-- Run one of these by hand :
-- COMMIT;
-- ROLLBACK;
