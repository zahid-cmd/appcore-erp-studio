ROLLBACK;

--===============================================================
-- StockBatches : allow the free-accessory batches
--
-- Motor Bike Receiving posts the supplier's free accessories as
-- zero-cost AC batches with SourceType = 'AccessoryScheme'
-- (SourceId = ReceivingId, SourceLineId = PurchaseAccessoryDueId).
--
-- 1. CK_StockBatches_SourceType only allowed Purchase / Opening :
--    the post failed with a 500 (check constraint).
-- 2. IX_StockBatches_Source (SourceType, ProductType, SourceLineId)
--    would block a second receiving of the same due row : it now
--    covers Purchase / Opening only, and the scheme batches are
--    unique per receiving + due row.
--
-- Safe to run more than once.
--===============================================================

BEGIN;

ALTER TABLE public."StockBatches"
    DROP CONSTRAINT IF EXISTS "CK_StockBatches_SourceType";

ALTER TABLE public."StockBatches"
    ADD CONSTRAINT "CK_StockBatches_SourceType"
    CHECK ("SourceType" IN ('Purchase', 'Opening', 'AccessoryScheme'));

DROP INDEX IF EXISTS public."IX_StockBatches_Source";

CREATE UNIQUE INDEX "IX_StockBatches_Source"
    ON public."StockBatches" ("SourceType", "ProductType", "SourceLineId")
    WHERE "SourceType" IN ('Purchase', 'Opening');

CREATE UNIQUE INDEX IF NOT EXISTS "IX_StockBatches_SchemeSource"
    ON public."StockBatches" ("SourceType", "ProductType", "SourceId", "SourceLineId")
    WHERE "SourceType" = 'AccessoryScheme';

COMMIT;


-- Check (run on its own)
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM   pg_constraint
-- WHERE  conname = 'CK_StockBatches_SourceType';
--
-- SELECT indexname, indexdef
-- FROM   pg_indexes
-- WHERE  tablename = 'StockBatches' AND indexname LIKE 'IX_StockBatches_S%';
