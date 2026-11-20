ROLLBACK;

-- =====================================================================
-- TEST_Tenant_Delete.sql   (2026-11-20)
-- ---------------------------------------------------------------------
-- Deletes the throwaway tenant TEST ("Console Test (throwaway)") that
-- was registered to test the Console (Create database, resets, Remove
-- leftover).
--
-- Removes ONE tenant : Tenants where TenantCode = 'TEST', with its web
-- address (test.localhost), its status history and its module / brand
-- rows (they go with the tenant by themselves).
-- Stops and changes nothing when TEST still has a database recorded.
-- The audit log lines of the test are kept.
-- The customer AppCore Demo Motors is NOT touched.
--
-- Run on the database AppCore_Control only (it refuses any other).
-- Query Tool on AppCore_Control, the whole file (F5). Read the
-- Messages tab, then run COMMIT; (or ROLLBACK;).
-- Safe to run again ("already gone").
-- ASCII only.
-- =====================================================================

BEGIN;

DO $$
DECLARE
    v_id    bigint;
    v_name  text;
    v_db    text;
BEGIN
    IF current_database() <> 'AppCore_Control' THEN
        RAISE EXCEPTION 'This is %, not AppCore_Control - nothing was changed.', current_database();
    END IF;

    SELECT "TenantId", "DisplayName", "DatabaseName" INTO v_id, v_name, v_db
    FROM   public."Tenants"
    WHERE  "TenantCode" = 'TEST';

    IF v_id IS NULL THEN
        RAISE NOTICE 'Tenant TEST is already gone : nothing to do.';
        RETURN;
    END IF;

    IF v_db IS NOT NULL AND trim(v_db) <> '' THEN
        RAISE EXCEPTION 'Tenant TEST still has a database recorded (%). Tell Claude - nothing was changed.', v_db;
    END IF;

    DELETE FROM public."Tenants" WHERE "TenantId" = v_id;

    RAISE NOTICE 'Tenant TEST (%) deleted, with its web address and history.', v_name;
    RAISE NOTICE 'Done. Run COMMIT; (or ROLLBACK;), then refresh the tenant list in the Console.';
END $$;


-- Run one of these by hand :
-- COMMIT;
-- ROLLBACK;


-- ---------------------------------------------------------------------
-- Check (after COMMIT, run on its own) : TEST must not be in the list
-- ---------------------------------------------------------------------
-- SELECT "TenantCode", "DisplayName", "DatabaseName", "Status"
-- FROM   public."Tenants"
-- ORDER  BY "TenantCode";
