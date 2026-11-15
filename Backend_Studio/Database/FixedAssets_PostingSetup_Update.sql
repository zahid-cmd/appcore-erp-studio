ROLLBACK;

-- =====================================================================
-- FixedAssets_PostingSetup_Update.sql   (2026-11-15)
-- ---------------------------------------------------------------------
-- Posting Setup, group Fixed Assets :
--
--   1. NEW purpose ASSET-DEPRECIATION-EXPENSE  "Fixed Assets -
--      Depreciation Expense" : the expense ledger of an asset group
--      whose Depreciation Setup leaves it to Posting Setup (the same
--      way as Gain / Loss on Disposal).
--      When its ledger is empty and exactly ONE active ledger is named
--      like "Depreciation Expense...", that ledger is filled in; else
--      choose it on Settings > Account Settings > Posting Setup.
--   2. ASSET-PURCHASE-PAYABLE : "Used by" no longer names Asset
--      Improvements (the page was removed).
--
-- Safe to run again (an existing ledger choice is never changed).
-- Run the whole script (F5) on AppCoreERP_Studio. ASCII only.
-- =====================================================================

INSERT INTO public."PostingSetups"
(
    "PurposeCode", "PurposeName", "GroupName", "Description", "UsedBy",
    "AllowedSubGroupCodes", "LedgerCode", "IsRequired", "DisplayOrder",
    "CreatedBy", "CreatedDate"
)
VALUES
    ('ASSET-DEPRECIATION-EXPENSE', 'Fixed Assets - Depreciation Expense', 'Fixed Assets',
     'Debited with the monthly depreciation of an asset group (expense), against its ACD ledger. Used when Depreciation Setup names no expense ledger for the group.',
     'Charge Depreciation', '', '', false, 305, 1, now())
ON CONFLICT ("PurposeCode") DO UPDATE
SET "PurposeName"  = EXCLUDED."PurposeName",
    "GroupName"    = EXCLUDED."GroupName",
    "Description"  = EXCLUDED."Description",
    "UsedBy"       = EXCLUDED."UsedBy",
    "DisplayOrder" = EXCLUDED."DisplayOrder";

UPDATE public."PostingSetups"
SET    "UsedBy" = 'Asset Acquisitions'
WHERE  "PurposeCode" = 'ASSET-PURCHASE-PAYABLE';

DO $$
DECLARE
    v_count int;
    v_code  text;
    v_name  text;
BEGIN
    IF EXISTS (SELECT 1 FROM public."PostingSetups"
               WHERE "PurposeCode" = 'ASSET-DEPRECIATION-EXPENSE'
               AND   coalesce("LedgerCode", '') <> '') THEN
        RAISE NOTICE 'Depreciation Expense : a ledger is chosen already, kept.';
        RETURN;
    END IF;

    SELECT count(*), min("LedgerCode"), min("LedgerName")
    INTO   v_count, v_code, v_name
    FROM   public."GeneralLedgers"
    WHERE  "IsDeleted" = false
    AND    "IsActive" = true
    AND    lower(trim("LedgerName")) LIKE 'depreciation expense%';

    IF v_count = 1 THEN
        UPDATE public."PostingSetups"
        SET    "LedgerCode" = v_code
        WHERE  "PurposeCode" = 'ASSET-DEPRECIATION-EXPENSE';

        RAISE NOTICE 'Depreciation Expense : ledger % % filled in.', v_code, v_name;
    ELSE
        RAISE NOTICE 'Depreciation Expense : % ledger(s) named like "Depreciation Expense" - choose it on Posting Setup.', v_count;
    END IF;
END $$;


-- ------------------------------------------------------------
-- Check (run on its own)
-- ------------------------------------------------------------
SELECT p."DisplayOrder", p."PurposeCode", p."PurposeName", p."LedgerCode", g."LedgerName", p."IsRequired", p."UsedBy"
FROM   public."PostingSetups" p
LEFT   JOIN public."GeneralLedgers" g ON g."LedgerCode" = p."LedgerCode" AND g."IsDeleted" = false
WHERE  p."GroupName" = 'Fixed Assets'
ORDER  BY p."DisplayOrder";
