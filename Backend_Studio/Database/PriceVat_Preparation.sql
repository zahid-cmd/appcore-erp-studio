-- =============================================================
-- Price change / VAT settlement : preparation
--
--   1. StockBatches : the VAT paid at source (base VAT) per batch
--      SourceVatRate, SourceVatPerUnit ; filled for the batches
--      already there from their purchase / opening stock line.
--   2. ProductPricingLines : the batch's supplier (SupplierCode),
--      filled from the batches.
--
-- Run once in a new pgAdmin Query Tool (safe to run again).
-- =============================================================

ALTER TABLE public."StockBatches"
    ADD COLUMN IF NOT EXISTS "SourceVatRate" numeric(9,4) NOT NULL DEFAULT 0;

ALTER TABLE public."StockBatches"
    ADD COLUMN IF NOT EXISTS "SourceVatPerUnit" numeric(18,4) NOT NULL DEFAULT 0;

ALTER TABLE public."ProductPricingLines"
    ADD COLUMN IF NOT EXISTS "SupplierCode" varchar(40) NOT NULL DEFAULT '';


-- Purchases (Motor Bikes) : VAT of the line over its units (qty + free)
UPDATE public."StockBatches" b
SET "SourceVatRate" = CASE WHEN h."VatCharged" THEN l."VatRate" ELSE 0 END,
    "SourceVatPerUnit" =
        CASE
            WHEN h."VatCharged" AND (l."Quantity" + l."FreeQuantity") > 0
                THEN ROUND(l."VatAmount" / (l."Quantity" + l."FreeQuantity"), 4)
            ELSE 0
        END
FROM public."PurchasesMbLines" l
JOIN public."PurchasesMb" h ON h."PurchaseId" = l."PurchaseId"
WHERE b."SourceType" = 'Purchase'
  AND b."ProductType" = 'MB'
  AND b."SourceLineId" = l."PurchaseLineId";

-- Purchases (Spare Parts & Lubricants)
UPDATE public."StockBatches" b
SET "SourceVatRate" = CASE WHEN h."VatCharged" THEN l."VatRate" ELSE 0 END,
    "SourceVatPerUnit" =
        CASE
            WHEN h."VatCharged" AND (l."Quantity" + l."FreeQuantity") > 0
                THEN ROUND(l."VatAmount" / (l."Quantity" + l."FreeQuantity"), 4)
            ELSE 0
        END
FROM public."PurchasesSpLines" l
JOIN public."PurchasesSp" h ON h."PurchaseId" = l."PurchaseId"
WHERE b."SourceType" = 'Purchase'
  AND b."ProductType" = 'SP'
  AND b."SourceLineId" = l."PurchaseLineId";

-- Purchases (Accessories)
UPDATE public."StockBatches" b
SET "SourceVatRate" = CASE WHEN h."VatCharged" THEN l."VatRate" ELSE 0 END,
    "SourceVatPerUnit" =
        CASE
            WHEN h."VatCharged" AND (l."Quantity" + l."FreeQuantity") > 0
                THEN ROUND(l."VatAmount" / (l."Quantity" + l."FreeQuantity"), 4)
            ELSE 0
        END
FROM public."PurchasesAcLines" l
JOIN public."PurchasesAc" h ON h."PurchaseId" = l."PurchaseId"
WHERE b."SourceType" = 'Purchase'
  AND b."ProductType" = 'AC'
  AND b."SourceLineId" = l."PurchaseLineId";

-- Opening stock : VAT of the line over its quantity
UPDATE public."StockBatches" b
SET "SourceVatRate" = l."VatRate",
    "SourceVatPerUnit" =
        CASE
            WHEN l."Quantity" > 0 THEN ROUND(l."VatAmount" / l."Quantity", 4)
            ELSE 0
        END
FROM public."OpeningStockLines" l
WHERE b."SourceType" = 'Opening'
  AND b."SourceLineId" = l."OpeningStockLineId";

-- Price change lines : the batch's supplier
UPDATE public."ProductPricingLines" p
SET "SupplierCode" = COALESCE(b."SupplierCode", '')
FROM public."StockBatches" b
WHERE p."StockBatchId" > 0
  AND p."StockBatchId" = b."StockBatchId";


-- Checks (run on their own if you want) :
-- SELECT "BatchNo", "SourceType", "SourceVatRate", "SourceVatPerUnit", "Mrp" FROM public."StockBatches" ORDER BY "StockBatchId" DESC LIMIT 30;
-- SELECT "ProductCode", "BatchNo", "SupplierCode" FROM public."ProductPricingLines" ORDER BY "ProductPricingLineId" DESC LIMIT 30;
