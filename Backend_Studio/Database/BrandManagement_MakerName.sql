-- ==============================================================
-- Brand Management : Maker's Name
--
-- The manufacturer of the brand's bikes, printed as "Maker's
-- name" (item 20) on BRTA Form-17. Motor Bike Specifications
-- take it from the brand.
--
-- Safe to run again. ASCII only.
-- ==============================================================

ALTER TABLE "BrandManagements"
    ADD COLUMN IF NOT EXISTS "MakerName" varchar(150) NOT NULL DEFAULT '';

-- Check
SELECT "BrandCode", "BrandName", "MakerName"
FROM "BrandManagements"
WHERE NOT "IsDeleted"
ORDER BY "BrandCode";
