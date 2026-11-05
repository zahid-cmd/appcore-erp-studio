-- =====================================================================
-- ProductSales_Accounts.sql  (2026-11-04)
--
-- Product Sales Accounts : the sales side of the product tree.
--
--   Category Type            Sales class (by CODE)
--   Motor Bikes              CLS-005 Motor Bike Sales
--   Spare Parts, Lubricants  CLS-006 Spare Parts Sale
--   Accessories              CLS-008 Accessories Sale
--
--   Product Category     -> Account Group      GRP-ccc-ggg
--   Product Sub Category -> Account Sub Group  SUB-ccc-ggg-sss
--   Motor Bike / Spare Part / Accessory
--                        -> General Ledger     GLR-ccc-ggg-sss-nnnnn
--
-- ggg / sss / nnnnn are copied from the record's INV code, so a
-- product's INV / WIP / COGS / Sales ledgers carry the same
-- numbers. Names : "Sales - <name>".
--
-- 1. Adds the columns (SalesGroupCode / Name, SalesSubGroupCode /
--    Name, SalesLedgerCode).
-- 2. Creates the missing groups, sub groups and ledgers for every
--    live category, sub category and product, and stores their
--    codes on the records.
--
-- Safe to run more than once (creates only what is missing).
-- One transaction : any error leaves the database unchanged.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------

ALTER TABLE public."ProductCategories"
    ADD COLUMN IF NOT EXISTS "SalesGroupCode" character varying(50)  NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "SalesGroupName" character varying(200) NOT NULL DEFAULT '';

ALTER TABLE public."ProductSubCategories"
    ADD COLUMN IF NOT EXISTS "SalesSubGroupCode" character varying(50)  NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "SalesSubGroupName" character varying(200) NOT NULL DEFAULT '';

ALTER TABLE public."MotorBikes"
    ADD COLUMN IF NOT EXISTS "SalesLedgerCode" character varying(50) NOT NULL DEFAULT '';

ALTER TABLE public."SpareParts"
    ADD COLUMN IF NOT EXISTS "SalesLedgerCode" character varying(50) NOT NULL DEFAULT '';

ALTER TABLE public."Accessories"
    ADD COLUMN IF NOT EXISTS "SalesLedgerCode" character varying(50) NOT NULL DEFAULT '';


-- ---------------------------------------------------------------------
-- 2. The three sales classes must exist and be active
-- ---------------------------------------------------------------------

DO $$
DECLARE
    v_missing text;
BEGIN
    SELECT string_agg(c.code, ', ')
      INTO v_missing
      FROM (VALUES ('CLS-005'), ('CLS-006'), ('CLS-008')) AS c(code)
     WHERE NOT EXISTS
           (
               SELECT 1
                 FROM public."AccountClasses" a
                WHERE a."ClassCode" = c.code
                  AND NOT a."IsDeleted"
                  AND a."IsActive"
           );

    IF v_missing IS NOT NULL THEN
        RAISE EXCEPTION 'Sales account class missing or inactive: %', v_missing;
    END IF;
END $$;


-- Category Type -> sales class code
CREATE OR REPLACE FUNCTION pg_temp.sales_class(p_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE lower(trim(coalesce(p_type, '')))
               WHEN 'motor bikes' THEN 'CLS-005'
               WHEN 'spare parts' THEN 'CLS-006'
               WHEN 'lubricants'  THEN 'CLS-006'
               WHEN 'accessories' THEN 'CLS-008'
           END
$$;

-- INV-001-002-008-00001 + CLS-006 + GLR -> GLR-006-002-008-00001
CREATE OR REPLACE FUNCTION pg_temp.sales_code(p_prefix text, p_class text, p_inventory_code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
               WHEN p_class IS NULL
                 OR coalesce(p_inventory_code, '') !~ '^[^-]+-[^-]+-.+'
               THEN NULL
               ELSE p_prefix || '-' || split_part(p_class, '-', 2) || '-'
                    || regexp_replace(upper(trim(p_inventory_code)), '^[^-]+-[^-]+-', '')
           END
$$;


-- ---------------------------------------------------------------------
-- 3. Categories -> sales groups
-- ---------------------------------------------------------------------

UPDATE public."ProductCategories" c
   SET "SalesGroupCode" = pg_temp.sales_code('GRP', pg_temp.sales_class(c."CategoryType"), c."InventoryGroupCode"),
       "SalesGroupName" = left('Sales - ' || trim(c."CategoryName"), 200)
 WHERE NOT c."IsDeleted"
   AND pg_temp.sales_code('GRP', pg_temp.sales_class(c."CategoryType"), c."InventoryGroupCode") IS NOT NULL;

INSERT INTO public."AccountGroups"
    ("AccountClassId", "ClassCode", "Mode", "GroupCode", "GroupName", "AllowManualSubGroup",
     "Remarks", "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
SELECT a."AccountClassId", a."ClassCode", a."Mode", c."SalesGroupCode", c."SalesGroupName", false,
       'System generated from Product Category ' || c."CategoryCode" || ' (sales).',
       c."IsActive", false, c."CreatedBy", now()
  FROM public."ProductCategories" c
  JOIN public."AccountClasses" a
    ON a."ClassCode" = pg_temp.sales_class(c."CategoryType")
   AND NOT a."IsDeleted"
 WHERE NOT c."IsDeleted"
   AND c."SalesGroupCode" <> ''
   AND NOT EXISTS
       (
           SELECT 1 FROM public."AccountGroups" g
            WHERE g."GroupCode" = c."SalesGroupCode" AND NOT g."IsDeleted"
       );


-- ---------------------------------------------------------------------
-- 4. Sub categories -> sales sub groups
-- ---------------------------------------------------------------------

UPDATE public."ProductSubCategories" s
   SET "SalesSubGroupCode" = pg_temp.sales_code('SUB', pg_temp.sales_class(c."CategoryType"), s."InventorySubGroupCode"),
       "SalesSubGroupName" = left('Sales - ' || trim(s."SubCategoryName"), 200)
  FROM public."ProductCategories" c
 WHERE c."ProductCategoryId" = s."ProductCategoryId"
   AND NOT s."IsDeleted"
   AND pg_temp.sales_code('SUB', pg_temp.sales_class(c."CategoryType"), s."InventorySubGroupCode") IS NOT NULL;

INSERT INTO public."AccountSubGroups"
    ("AccountClassId", "AccountGroupId", "ClassCode", "Mode", "GroupCode", "SubGroupCode", "SubGroupName",
     "AllowManualLedger", "Remarks", "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
SELECT g."AccountClassId", g."AccountGroupId", g."ClassCode", g."Mode", g."GroupCode",
       s."SalesSubGroupCode", s."SalesSubGroupName", false,
       'System generated from Product Sub Category ' || s."SubCategoryCode" || ' (sales).',
       s."IsActive", false, s."CreatedBy", now()
  FROM public."ProductSubCategories" s
  JOIN public."ProductCategories" c
    ON c."ProductCategoryId" = s."ProductCategoryId"
  JOIN public."AccountGroups" g
    ON g."GroupCode" = c."SalesGroupCode"
   AND NOT g."IsDeleted"
 WHERE NOT s."IsDeleted"
   AND s."SalesSubGroupCode" <> ''
   AND NOT EXISTS
       (
           SELECT 1 FROM public."AccountSubGroups" x
            WHERE x."SubGroupCode" = s."SalesSubGroupCode" AND NOT x."IsDeleted"
       );


-- ---------------------------------------------------------------------
-- 5. Products -> sales ledgers (Motor Bikes, Spare Parts, Accessories)
--    Name : "Sales - " + the product's INV ledger name without "INV - "
-- ---------------------------------------------------------------------

CREATE TEMP TABLE _products ON COMMIT DROP AS
SELECT 'MotorBikes'::text AS source, 'Motor Bike'::text AS label,
       p."MotorBikeId" AS id, p."ProductSubCategoryId", p."ProductCode",
       p."InventoryLedgerCode", p."IsActive", p."CreatedBy"
  FROM public."MotorBikes" p
 WHERE NOT p."IsDeleted"
UNION ALL
SELECT 'SpareParts', 'Spare Part',
       p."SparePartId", p."ProductSubCategoryId", p."ProductCode",
       p."InventoryLedgerCode", p."IsActive", p."CreatedBy"
  FROM public."SpareParts" p
 WHERE NOT p."IsDeleted"
UNION ALL
SELECT 'Accessories', 'Accessory',
       p."AccessoryId", p."ProductSubCategoryId", p."ProductCode",
       p."InventoryLedgerCode", p."IsActive", p."CreatedBy"
  FROM public."Accessories" p
 WHERE NOT p."IsDeleted";

ALTER TABLE _products ADD COLUMN sales_code text;
ALTER TABLE _products ADD COLUMN sales_name text;

UPDATE _products p
   SET sales_code = pg_temp.sales_code('GLR', pg_temp.sales_class(c."CategoryType"), p."InventoryLedgerCode"),
       sales_name = left('Sales - ' || coalesce
                    (
                        nullif(trim(regexp_replace
                        (
                            (
                                SELECT l."LedgerName"
                                  FROM public."GeneralLedgers" l
                                 WHERE l."LedgerCode" = p."InventoryLedgerCode"
                                 ORDER BY l."IsDeleted"
                                 LIMIT 1
                            ),
                            '^[A-Za-z]{2,6} - ', ''
                        )), ''),
                        p."ProductCode"
                    ), 200)
  FROM public."ProductSubCategories" s
  JOIN public."ProductCategories" c
    ON c."ProductCategoryId" = s."ProductCategoryId"
 WHERE s."ProductSubCategoryId" = p."ProductSubCategoryId";

INSERT INTO public."GeneralLedgers"
    ("AccountClassId", "AccountGroupId", "AccountSubGroupId", "ClassCode", "Mode", "GroupCode",
     "SubGroupCode", "LedgerCode", "LedgerName", "Remarks", "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
SELECT sg."AccountClassId", sg."AccountGroupId", sg."AccountSubGroupId", sg."ClassCode", sg."Mode", sg."GroupCode",
       sg."SubGroupCode", p.sales_code, p.sales_name,
       'System generated from ' || p.label || ' ' || p."ProductCode" || ' (sales).',
       p."IsActive", false, p."CreatedBy", now()
  FROM _products p
  JOIN public."ProductSubCategories" s
    ON s."ProductSubCategoryId" = p."ProductSubCategoryId"
  JOIN public."AccountSubGroups" sg
    ON sg."SubGroupCode" = s."SalesSubGroupCode"
   AND NOT sg."IsDeleted"
 WHERE p.sales_code IS NOT NULL
   AND NOT EXISTS
       (
           SELECT 1 FROM public."GeneralLedgers" l
            WHERE l."LedgerCode" = p.sales_code AND NOT l."IsDeleted"
       );

UPDATE public."MotorBikes" t SET "SalesLedgerCode" = p.sales_code
  FROM _products p WHERE p.source = 'MotorBikes' AND p.id = t."MotorBikeId" AND p.sales_code IS NOT NULL;

UPDATE public."SpareParts" t SET "SalesLedgerCode" = p.sales_code
  FROM _products p WHERE p.source = 'SpareParts' AND p.id = t."SparePartId" AND p.sales_code IS NOT NULL;

UPDATE public."Accessories" t SET "SalesLedgerCode" = p.sales_code
  FROM _products p WHERE p.source = 'Accessories' AND p.id = t."AccessoryId" AND p.sales_code IS NOT NULL;


-- ---------------------------------------------------------------------
-- 6. Result
-- ---------------------------------------------------------------------

SELECT 'Groups' AS "Level", count(*) AS "Sales accounts"
  FROM public."ProductCategories" WHERE NOT "IsDeleted" AND "SalesGroupCode" <> ''
UNION ALL
SELECT 'Sub Groups', count(*)
  FROM public."ProductSubCategories" WHERE NOT "IsDeleted" AND "SalesSubGroupCode" <> ''
UNION ALL
SELECT 'Ledgers', count(*)
  FROM _products WHERE sales_code IS NOT NULL;

COMMIT;
