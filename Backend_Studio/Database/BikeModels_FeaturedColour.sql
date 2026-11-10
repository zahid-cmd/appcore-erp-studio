-- ==============================================================
-- Website : featured colour per bike model (2026-11-10)
-- --------------------------------------------------------------
-- Website Configuration > Bikes : the colour (Motor Bike record)
-- whose photo shows on the website's card and hero. NULL = the
-- first colour with a photo (as before). Run before starting the
-- new API. Safe to run again. ASCII only.
-- ==============================================================

ALTER TABLE "BikeModels"
    ADD COLUMN IF NOT EXISTS "FeaturedMotorBikeId" bigint NULL;

-- Check
SELECT "BikeModelId", "ModelName", "IsFeatured", "FeaturedMotorBikeId"
FROM   "BikeModels"
WHERE  NOT "IsDeleted"
ORDER  BY "DisplayOrder", "ModelName";
