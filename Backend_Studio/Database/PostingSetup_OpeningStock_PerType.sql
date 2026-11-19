ROLLBACK;

-- ============================================================
-- Opening Stock : one Posting Setup ledger per product type
-- (2026-11-18)
--
--   OPENING-STOCK     Opening Stock - Motor Bikes               (kept, renamed)
--   OPENING-STOCK-SP  Opening Stock - Spare Parts & Lubricants  (new, ledger not set)
--   OPENING-STOCK-AC  Opening Stock - Accessories               (new, ledger not set)
--
-- The new rows copy the group, allowed sub groups and order of
-- OPENING-STOCK. Their ledger is left empty : choose it on
-- Settings > Account Settings > Posting Setup. While the switch
-- CFG-MOD-012-0006 Lock Opening Stock Ledger is ON, a Spare
-- Parts or Accessories opening stock can't be saved until its
-- ledger is set.
--
-- Safe to run more than once : a ledger already chosen is never
-- overwritten. Run the whole script (F5).
-- ============================================================

UPDATE public."PostingSetups"
SET    "PurposeName" = 'Opening Stock - Motor Bikes',
       "Description" = 'Credit side of the motor bike opening stock entry (Dr each bike''s inventory ledger, Cr this ledger).',
       "UsedBy"      = 'Opening Stock page (Motor Bikes)'
WHERE  "PurposeCode" = 'OPENING-STOCK';

INSERT INTO public."PostingSetups"
(
    "PurposeCode", "PurposeName", "GroupName", "Description", "UsedBy",
    "AllowedSubGroupCodes", "LedgerCode", "IsRequired", "DisplayOrder"
)
SELECT v."PurposeCode", v."PurposeName", m."GroupName", v."Description", v."UsedBy",
       m."AllowedSubGroupCodes", '', m."IsRequired", m."DisplayOrder"
FROM
(
    VALUES
        ('OPENING-STOCK-SP', 'Opening Stock - Spare Parts & Lubricants',
         'Credit side of the spare parts and lubricants opening stock entry (Dr each item''s inventory ledger, Cr this ledger).',
         'Opening Stock page (Spare Parts & Lubricants)'),
        ('OPENING-STOCK-AC', 'Opening Stock - Accessories',
         'Credit side of the accessories opening stock entry (Dr each item''s inventory ledger, Cr this ledger).',
         'Opening Stock page (Accessories)')
) AS v ("PurposeCode", "PurposeName", "Description", "UsedBy")
CROSS JOIN
(
    SELECT "GroupName", "AllowedSubGroupCodes", "IsRequired", "DisplayOrder"
    FROM   public."PostingSetups"
    WHERE  "PurposeCode" = 'OPENING-STOCK'
) AS m
ON CONFLICT ("PurposeCode") DO UPDATE
SET "PurposeName"          = EXCLUDED."PurposeName",
    "GroupName"            = EXCLUDED."GroupName",
    "Description"          = EXCLUDED."Description",
    "UsedBy"               = EXCLUDED."UsedBy",
    "AllowedSubGroupCodes" = EXCLUDED."AllowedSubGroupCodes",
    "IsRequired"           = EXCLUDED."IsRequired",
    "DisplayOrder"         = EXCLUDED."DisplayOrder";

-- Check (run on its own) :
-- SELECT "PurposeCode", "PurposeName", "GroupName", "AllowedSubGroupCodes", "LedgerCode", "DisplayOrder"
-- FROM public."PostingSetups" WHERE "PurposeCode" LIKE 'OPENING-STOCK%' ORDER BY "PurposeCode";
