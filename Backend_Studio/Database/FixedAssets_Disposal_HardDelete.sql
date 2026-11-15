-- =====================================================================
-- FixedAssets_Disposal_HardDelete.sql   (2026-11-15)
-- ---------------------------------------------------------------------
-- Testing : removes ONE asset disposal for good, as if it was never
-- made :
--   - its Journal Voucher (VoucherEntries rows incl. a reversal,
--     lines, header) is deleted;
--   - the asset card goes back to the status it had before the
--     disposal (In Use / Idle / Under Repair), disposed date cleared;
--   - the disposal row and its activity history are deleted.
-- The next disposal can take its code again (FAD-0001 ...).
--
-- Set the code below (v_code), run the whole script (F5) on
-- AppCoreERP_Studio, read the Messages tab, then run COMMIT; (or
-- ROLLBACK; when the counts are wrong). ASCII only.
-- =====================================================================

ROLLBACK;

BEGIN;

DO $$
DECLARE
    v_code  text := 'FAD-0001';

    v_disp  record;
    v_asset record;
    v_back  text;
    v_n     int;
BEGIN
    SELECT * INTO v_disp
    FROM   public."FaDisposals"
    WHERE  "Code" = v_code
    ORDER  BY "FaDisposalId" DESC
    LIMIT  1;

    IF v_disp."FaDisposalId" IS NULL THEN
        RAISE EXCEPTION 'Disposal % not found - nothing changed.', v_code;
    END IF;

    SELECT "FaAssetId", "AssetNo", "Status" INTO v_asset
    FROM   public."FaAssets"
    WHERE  "FaAssetId" = v_disp."FaAssetId";

    RAISE NOTICE 'Disposal % : asset %, %, journal % (deleted already : %)',
        v_disp."Code", v_asset."AssetNo", v_disp."Kind", v_disp."JournalVoucherNo", v_disp."IsDeleted";

    -- ---------- the asset card ----------
    IF v_asset."Status" NOT IN ('In Use', 'Idle', 'Under Repair') THEN
        v_back := CASE WHEN v_disp."PrevStatus" IN ('In Use', 'Idle', 'Under Repair') THEN v_disp."PrevStatus" ELSE 'In Use' END;

        UPDATE public."FaAssets"
        SET    "Status" = v_back,
               "DisposedDate" = NULL
        WHERE  "FaAssetId" = v_asset."FaAssetId";

        RAISE NOTICE 'Asset % : % -> %', v_asset."AssetNo", v_asset."Status", v_back;
    ELSE
        RAISE NOTICE 'Asset % is % already : not changed', v_asset."AssetNo", v_asset."Status";
    END IF;

    -- ---------- the Journal Voucher ----------
    IF v_disp."JournalVoucherId" IS NOT NULL THEN
        DELETE FROM public."VoucherEntries"
        WHERE  "VoucherType" = 'JV' AND "VoucherId" = v_disp."JournalVoucherId";
        GET DIAGNOSTICS v_n = ROW_COUNT;
        RAISE NOTICE 'VoucherEntries        % deleted', v_n;

        DELETE FROM public."JournalVoucherLines" WHERE "JournalVoucherId" = v_disp."JournalVoucherId";
        GET DIAGNOSTICS v_n = ROW_COUNT;
        RAISE NOTICE 'JournalVoucherLines   % deleted', v_n;

        DELETE FROM public."JournalVoucher" WHERE "JournalVoucherId" = v_disp."JournalVoucherId";
        GET DIAGNOSTICS v_n = ROW_COUNT;
        RAISE NOTICE 'JournalVoucher        % deleted', v_n;
    END IF;

    -- ---------- the disposal ----------
    IF to_regclass('public."ActivityHistories"') IS NOT NULL THEN
        DELETE FROM public."ActivityHistories"
        WHERE  "Module" = 'Fixed Assets' AND "EntityName" = 'FaDisposals' AND "EntityId" = v_disp."FaDisposalId";
        GET DIAGNOSTICS v_n = ROW_COUNT;
        RAISE NOTICE 'ActivityHistories     % deleted', v_n;
    END IF;

    DELETE FROM public."FaDisposals" WHERE "FaDisposalId" = v_disp."FaDisposalId";
    GET DIAGNOSTICS v_n = ROW_COUNT;
    RAISE NOTICE 'FaDisposals           % deleted', v_n;

    RAISE NOTICE 'Done. Check the counts, then run COMMIT; (or ROLLBACK;)';
END $$;

-- Run one of these by hand :
-- COMMIT;
-- ROLLBACK;
