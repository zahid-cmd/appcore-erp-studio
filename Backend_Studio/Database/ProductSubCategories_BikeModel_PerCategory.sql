-- =============================================================
-- Product Sub Categories : Bike Model per category
--   Motor Bikes / Spare Parts / Accessories sub categories pick a
--   Bike Model; a model is used once per category (one Motor
--   Bikes, one Spare Parts and one Accessories sub category).
--   Also links existing sub categories named
--   "<Category Type> - <Brand> - <Model>" to their bike model.
-- Run after ProductSubCategories_BikeModel.sql.
-- Safe to run more than once.
-- =============================================================

BEGIN;

ALTER TABLE public."ProductSubCategories"
    ADD COLUMN IF NOT EXISTS "BikeModelId" bigint NULL;

-- Old rule (one sub category per model overall)
DROP INDEX IF EXISTS public."UX_ProductSubCategories_BikeModelId";

-- New rule : one sub category per model within a category
CREATE UNIQUE INDEX IF NOT EXISTS "UX_ProductSubCategories_Category_BikeModel"
    ON public."ProductSubCategories" ("ProductCategoryId", "BikeModelId")
    WHERE "IsDeleted" = false AND "BikeModelId" IS NOT NULL;

-- Link existing rows saved before the model link (matched by name)
UPDATE public."ProductSubCategories" s
SET    "BikeModelId" = m."BikeModelId"
FROM   public."ProductCategories" c,
       public."BikeModels"        m,
       public."BrandManagements"  b
WHERE  s."BikeModelId" IS NULL
  AND  s."IsDeleted" = false
  AND  c."ProductCategoryId" = s."ProductCategoryId"
  AND  c."CategoryType" IN ('Motor Bikes', 'Spare Parts', 'Accessories')
  AND  m."BrandManagementId" = c."BrandManagementId"
  AND  m."IsDeleted" = false
  AND  b."BrandManagementId" = m."BrandManagementId"
  AND  lower(s."SubCategoryName") =
       lower(c."CategoryType" || ' - ' || b."BrandName" || ' - ' || m."ModelName")
  AND  NOT EXISTS
       (
           SELECT 1
           FROM   public."ProductSubCategories" o
           WHERE  o."ProductCategoryId" = s."ProductCategoryId"
             AND  o."BikeModelId" = m."BikeModelId"
             AND  o."IsDeleted" = false
       );

COMMIT;

-- Check
SELECT s."SubCategoryCode", s."SubCategoryName", s."BikeModelId"
FROM   public."ProductSubCategories" s
WHERE  s."IsDeleted" = false
ORDER  BY s."SubCategoryCode";
