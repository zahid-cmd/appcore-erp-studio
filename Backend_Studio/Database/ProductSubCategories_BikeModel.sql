-- =============================================================
-- Product Sub Categories : link to Bike Models
--   Motor Bikes / Spare Parts / Accessories sub categories pick a
--   Bike Model; the name is built as "<Type> - <Brand> - <Model>".
--   One sub category per bike model within a category.
-- Safe to run more than once.
-- =============================================================

ALTER TABLE public."ProductSubCategories"
    ADD COLUMN IF NOT EXISTS "BikeModelId" bigint NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "UX_ProductSubCategories_Category_BikeModel"
    ON public."ProductSubCategories" ("ProductCategoryId", "BikeModelId")
    WHERE "IsDeleted" = false AND "BikeModelId" IS NOT NULL;
