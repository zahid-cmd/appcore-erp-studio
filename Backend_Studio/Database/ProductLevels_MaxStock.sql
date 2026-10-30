-- ============================================================
-- Max Stock Level on the item pages (2026-10-30)
--
-- MotorBikes / SpareParts / Accessories get "MaxStockLevel"
-- (whole number, 0 = not set). Company wide, like Re-order
-- Level and Red Level :
--   Re-order Level : WHEN to order (stock + on order at / below)
--   Max Stock Level: the most stock wanted; a purchase order
--                    cannot take stock + on order above it
--   Suggested Qty  = Max - (stock + on order), shown only when
--                    at / below the Re-order Level
--
-- Safe to run more than once. Run the whole script (F5).
-- ============================================================

ALTER TABLE public."MotorBikes"
    ADD COLUMN IF NOT EXISTS "MaxStockLevel" integer NOT NULL DEFAULT 0;

ALTER TABLE public."SpareParts"
    ADD COLUMN IF NOT EXISTS "MaxStockLevel" integer NOT NULL DEFAULT 0;

ALTER TABLE public."Accessories"
    ADD COLUMN IF NOT EXISTS "MaxStockLevel" integer NOT NULL DEFAULT 0;


-- Check : items whose levels need a look (Max not above Re-order)
SELECT 'Motor Bike' AS "Type", "ProductCode", "ProductName" AS "Name", "ReorderLevel", "RedLevel", "MaxStockLevel"
FROM   public."MotorBikes"
WHERE  NOT "IsDeleted" AND "MaxStockLevel" > 0 AND "MaxStockLevel" <= "ReorderLevel"
UNION ALL
SELECT 'Spare Part / Lubricant', "ProductCode", "PartName", "ReorderLevel", "RedLevel", "MaxStockLevel"
FROM   public."SpareParts"
WHERE  NOT "IsDeleted" AND "MaxStockLevel" > 0 AND "MaxStockLevel" <= "ReorderLevel"
UNION ALL
SELECT 'Accessory', "ProductCode", "AccessoryName", "ReorderLevel", "RedLevel", "MaxStockLevel"
FROM   public."Accessories"
WHERE  NOT "IsDeleted" AND "MaxStockLevel" > 0 AND "MaxStockLevel" <= "ReorderLevel";
