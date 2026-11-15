-- =====================================================================
-- FixedAssets_Verification_DeleteAll.sql   (2026-11-15)
-- ---------------------------------------------------------------------
-- Empties Asset Control > Asset Verification : EVERY count (Draft,
-- Closed and the soft deleted ones), its lines and its history.
--
-- Deleted
--   FaVerificationLines   every line of every count
--   FaVerifications       every count (FAV-....), deleted ones too,
--                         so the next count is FAV-0001 again
--   ActivityHistories     the history of the counts
--                         (module 'Fixed Assets', entity FaVerifications)
--
-- Nothing else is touched : a count never changes an asset card, a
-- ledger or a voucher.
--
-- Hard delete inside a transaction that you finish yourself :
--   1. Run the whole script (F5) on AppCoreERP_Studio.
--   2. Read the counts in the Messages tab.
--   3. They are right  : run   COMMIT;
--      They are wrong  : run   ROLLBACK;
-- A table that does not exist is skipped. Re-runnable. ASCII only.
-- =====================================================================

ROLLBACK;

BEGIN;

DO $$
DECLARE
    v_n     int;
    v_list  text;
BEGIN
    IF to_regclass('public."FaVerifications"') IS NULL THEN
        RAISE NOTICE 'FaVerifications does not exist : nothing to delete.';
        RETURN;
    END IF;

    SELECT string_agg("Code" || CASE WHEN "IsDeleted" THEN ' (deleted)' ELSE ' (' || "Status" || ')' END, ', ' ORDER BY "Code")
    INTO   v_list
    FROM   public."FaVerifications";

    RAISE NOTICE 'Counts found : %', coalesce(v_list, 'none');

    IF to_regclass('public."FaVerificationLines"') IS NOT NULL THEN
        DELETE FROM public."FaVerificationLines";
        GET DIAGNOSTICS v_n = ROW_COUNT;
        RAISE NOTICE '% % deleted', rpad('FaVerificationLines', 22), v_n;
    END IF;

    DELETE FROM public."FaVerifications";
    GET DIAGNOSTICS v_n = ROW_COUNT;
    RAISE NOTICE '% % deleted', rpad('FaVerifications', 22), v_n;

    IF to_regclass('public."ActivityHistories"') IS NOT NULL THEN
        DELETE FROM public."ActivityHistories"
        WHERE  "Module" = 'Fixed Assets'
        AND    "EntityName" = 'FaVerifications';
        GET DIAGNOSTICS v_n = ROW_COUNT;
        RAISE NOTICE '% % deleted', rpad('ActivityHistories', 22), v_n;
    END IF;

    RAISE NOTICE 'Done. Check the counts, then run COMMIT; (or ROLLBACK;)';
END $$;

-- Run one of these by hand :
-- COMMIT;
-- ROLLBACK;
