-- =====================================================================
-- BikeAccessories_Step1.sql   (2026-11-07)
-- ---------------------------------------------------------------------
-- Additional / Promotional Accessories with motor bikes : step 1
--
-- 1. ProductSubCategories."AccessoryUse" and Accessories."AccessoryUse"
--      For Sale (default) / Additional Accessories / Promotional
--      Accessories. Chosen on the Product Sub Category form
--      (Accessories categories only); its products take it.
--      Every product keeps its groups, sub groups and ledgers
--      whatever its use.
--      First fill : Accessories sub categories named "Additional
--      Accessories..." / "Promotional Accessories..." get that use.
-- 2. Posting Setup purpose PROMOTIONAL-EXPENSES
--      Cost of any accessory given free with a bike (its batch
--      cost; zero-cost supplier items post nothing). The ledger is
--      not set here : create a General Ledger "Promotional Expenses"
--      under the Expense class, then choose it on
--      Settings > Account Settings > Posting Setup.
--
-- Safe to run again. Run the whole script (F5). ASCII only.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Accessory use
-- ---------------------------------------------------------------------

ALTER TABLE public."Accessories"
    ADD COLUMN IF NOT EXISTS "AccessoryUse" character varying(30) NOT NULL DEFAULT 'For Sale';

UPDATE public."Accessories"
SET    "AccessoryUse" = 'For Sale'
WHERE  "AccessoryUse" IS NULL OR btrim("AccessoryUse") = '';

CREATE INDEX IF NOT EXISTS "IX_Accessories_AccessoryUse"
    ON public."Accessories" ("AccessoryUse")
    WHERE "IsDeleted" = false;


-- 1b. Sub category use (Accessories categories only) + first fill,
--     then the products follow their sub category
-- ---------------------------------------------------------------------

ALTER TABLE public."ProductSubCategories"
    ADD COLUMN IF NOT EXISTS "AccessoryUse" character varying(30) NOT NULL DEFAULT 'For Sale';

UPDATE public."ProductSubCategories" s
SET    "AccessoryUse" = CASE
                            WHEN lower(s."SubCategoryName") LIKE 'additional accessor%'  THEN 'Additional Accessories'
                            WHEN lower(s."SubCategoryName") LIKE 'promotional accessor%' THEN 'Promotional Accessories'
                            ELSE s."AccessoryUse"
                        END
FROM   public."ProductCategories" c
WHERE  c."ProductCategoryId" = s."ProductCategoryId"
AND    lower(c."CategoryType") = 'accessories'
AND    s."AccessoryUse" = 'For Sale';

UPDATE public."Accessories" a
SET    "AccessoryUse" = s."AccessoryUse"
FROM   public."ProductSubCategories" s
WHERE  s."ProductSubCategoryId" = a."ProductSubCategoryId"
AND    a."AccessoryUse" IS DISTINCT FROM s."AccessoryUse";


-- ---------------------------------------------------------------------
-- 2. Posting Setup : Promotional Expenses
--    Texts refreshed every run; a ledger chosen on the page is kept
-- ---------------------------------------------------------------------

INSERT INTO public."PostingSetups"
(
    "PurposeCode", "PurposeName", "GroupName", "Description", "UsedBy",
    "AllowedSubGroupCodes", "LedgerCode", "IsRequired", "DisplayOrder"
)
VALUES
    ('PROMOTIONAL-EXPENSES', 'Promotional Expenses', 'Sales Promotion',
     'Cost of accessories given free with motor bikes (Additional / Promotional Accessories, dealer gifts) : Dr this ledger, Cr the accessory''s inventory ledger at its batch cost. Zero-cost supplier items post nothing.',
     'Sales Invoices - MB, Accessory Delivery',
     '', '', false, 71)
ON CONFLICT ("PurposeCode") DO UPDATE
SET "PurposeName"  = EXCLUDED."PurposeName",
    "GroupName"    = EXCLUDED."GroupName",
    "Description"  = EXCLUDED."Description",
    "UsedBy"       = EXCLUDED."UsedBy",
    "IsRequired"   = EXCLUDED."IsRequired",
    "DisplayOrder" = EXCLUDED."DisplayOrder";


-- ---------------------------------------------------------------------
-- Check (run on its own)
-- ---------------------------------------------------------------------

SELECT s."SubCategoryCode", s."SubCategoryName", s."AccessoryUse"
FROM   public."ProductSubCategories" s
WHERE  s."AccessoryUse" <> 'For Sale' AND s."IsDeleted" = false;

SELECT "AccessoryUse", count(*) AS "Products"
FROM   public."Accessories"
WHERE  "IsDeleted" = false
GROUP  BY "AccessoryUse"
ORDER  BY 1;

SELECT "PurposeCode", "PurposeName", "LedgerCode"
FROM   public."PostingSetups"
WHERE  "PurposeCode" = 'PROMOTIONAL-EXPENSES';
