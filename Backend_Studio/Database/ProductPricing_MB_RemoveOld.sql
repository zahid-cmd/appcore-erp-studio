ROLLBACK;

-- ============================================================
-- Remove the OLD Motor Bike pricing data (owner 2026-11-09).
-- Run ONCE, on purpose, after a database backup. It cannot be
-- undone.
--
-- Removes :
--   a. the Motor Bike price changes of the old Product Pricing page
--      (ProductPricing PageType 'MB', their lines, their history);
--   b. the Motor Bike price index (Price List) entries, except
--      those of the new price cards (SourceType 'PriceCard').
-- Keeps : the MRP of the Motor Bike stock batches (stock in hand
-- keeps selling at its current MRP until the first cards are
-- posted), Spare Parts and Accessories data (untouched).
-- ============================================================

BEGIN;

DELETE FROM public."ProductPricingLines"
WHERE  "ProductPricingId" IN (SELECT "ProductPricingId" FROM public."ProductPricing" WHERE "PageType" = 'MB');

DELETE FROM public."ProductPricing"
WHERE  "PageType" = 'MB';

DELETE FROM public."ActivityHistories"
WHERE  "EntityName" = 'ProductPricingMB';

DELETE FROM public."ProductPriceIndex"
WHERE  "ProductType" = 'MB'
AND    "SourceType" <> 'PriceCard';

COMMIT;


/*  Check (select and run on its own) : all should be 0

SELECT (SELECT count(*) FROM public."ProductPricing" WHERE "PageType" = 'MB') AS "Old MB price changes",
       (SELECT count(*) FROM public."ProductPriceIndex" WHERE "ProductType" = 'MB' AND "SourceType" <> 'PriceCard') AS "Old MB index rows";
*/
