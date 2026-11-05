-- ============================================================
-- MRP is the sale price (2026-11-01).
-- Plain statements only : run in a NEW pgAdmin Query Tool (F5).
-- Safe to run again.
--
-- There is no separate selling price anywhere : the MRP (VAT
-- inclusive) of a batch is what it sells at.
--
-- 1. Opening stock batches priced before : a batch without MRP
--    takes its old sale price as MRP.
-- 2. Purchase batches : take the MRP of their purchase line
--    (purchases did not copy it to the batch before).
-- 3. The SalePrice columns are dropped from StockBatches and
--    OpeningStockLines.
-- ============================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'StockBatches' AND column_name = 'SalePrice') THEN
        UPDATE public."StockBatches" SET "Mrp" = "SalePrice" WHERE "Mrp" = 0 AND "SalePrice" > 0;
    END IF;
END $$;

UPDATE public."StockBatches" b SET "Mrp" = l."Mrp"
FROM   public."PurchasesMbLines" l
WHERE  b."SourceType" = 'Purchase' AND b."ProductType" = 'MB' AND b."SourceLineId" = l."PurchaseLineId" AND b."Mrp" = 0 AND l."Mrp" > 0;

UPDATE public."StockBatches" b SET "Mrp" = l."Mrp"
FROM   public."PurchasesSpLines" l
WHERE  b."SourceType" = 'Purchase' AND b."ProductType" = 'SP' AND b."SourceLineId" = l."PurchaseLineId" AND b."Mrp" = 0 AND l."Mrp" > 0;

UPDATE public."StockBatches" b SET "Mrp" = l."Mrp"
FROM   public."PurchasesAcLines" l
WHERE  b."SourceType" = 'Purchase' AND b."ProductType" = 'AC' AND b."SourceLineId" = l."PurchaseLineId" AND b."Mrp" = 0 AND l."Mrp" > 0;

ALTER TABLE public."StockBatches"      DROP COLUMN IF EXISTS "SalePrice";

ALTER TABLE public."OpeningStockLines" DROP COLUMN IF EXISTS "SalePrice";


-- ------------------------------------------------------------
-- Check (select and run on its own) : 0 and 0
-- ------------------------------------------------------------
/*
SELECT count(*) AS "SalePrice Columns Left"
FROM   information_schema.columns
WHERE  table_schema = 'public' AND column_name = 'SalePrice'
AND    table_name IN ('StockBatches', 'OpeningStockLines');
*/
