ROLLBACK;

-- ============================================================
-- Posting Setup : clear names for the Campaign Discount purposes
-- ------------------------------------------------------------
-- Two purposes were both named "Campaign Discount - Motor Bikes".
-- They are renamed by code (ledgers and texts are kept) :
--   CAMPAIGN-DISC-MB      (Purchase Discounts) -> Purchase Campaign Discount - Motor Bikes
--   CAMPAIGN-DISCOUNT-MB  (Sales)              -> Sales Campaign Discount - Motor Bikes
--   CAMPAIGN-DISCOUNT-SP  (Sales)              -> Sales Campaign Discount - Spare Parts & Lubricants
--   CAMPAIGN-DISCOUNT-AC  (Sales)              -> Sales Campaign Discount - Accessories
-- Safe to run again.
-- ============================================================

BEGIN;

UPDATE public."PostingSetups" SET "PurposeName" = 'Purchase Campaign Discount - Motor Bikes'
WHERE  "PurposeCode" = 'CAMPAIGN-DISC-MB';

UPDATE public."PostingSetups" SET "PurposeName" = 'Sales Campaign Discount - Motor Bikes'
WHERE  "PurposeCode" = 'CAMPAIGN-DISCOUNT-MB';

UPDATE public."PostingSetups" SET "PurposeName" = 'Sales Campaign Discount - Spare Parts & Lubricants'
WHERE  "PurposeCode" = 'CAMPAIGN-DISCOUNT-SP';

UPDATE public."PostingSetups" SET "PurposeName" = 'Sales Campaign Discount - Accessories'
WHERE  "PurposeCode" = 'CAMPAIGN-DISCOUNT-AC';

COMMIT;

-- Check
SELECT "PurposeCode", "PurposeName", "GroupName", "LedgerCode"
FROM   public."PostingSetups"
WHERE  "PurposeCode" IN ('CAMPAIGN-DISC-MB', 'CAMPAIGN-DISCOUNT-MB', 'CAMPAIGN-DISCOUNT-SP', 'CAMPAIGN-DISCOUNT-AC')
ORDER  BY "GroupName", "PurposeCode";
