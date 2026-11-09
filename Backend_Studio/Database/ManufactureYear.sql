-- =====================================================================
-- ManufactureYear.sql   (2026-11-09)
-- ---------------------------------------------------------------------
-- Year of manufacture per chassis (BRTA Form-17, the customer file,
-- the sales invoice).
--
-- 1. MotorBikeUnits."ManufactureYear" integer NULL
--      Entered on the Unit Desk of Purchases - MB / Motor Bike
--      Receiving (default : the purchase invoice's year) and changed
--      on CKD Documents Status.
-- 2. CustomerFiles."ManufactureYear" integer NULL
--      For an opening customer file whose chassis has no bike record.
-- 3. Existing rows filled once :
--      purchased bikes    -> year of the purchase date
--      opening stock bikes -> year of the opening date
--      customer files      -> the year of the chassis' bike record
--    (rows that already have a year are left as they are)
--
-- Plain statements, safe to run again. Run the whole script (F5).
-- ASCII only.
-- =====================================================================


-- Clears a transaction left open by an earlier failed run in the
-- same pgAdmin tab (a harmless warning when there is none).
ROLLBACK;

BEGIN;

ALTER TABLE public."MotorBikeUnits"
    ADD COLUMN IF NOT EXISTS "ManufactureYear" integer NULL;

ALTER TABLE public."CustomerFiles"
    ADD COLUMN IF NOT EXISTS "ManufactureYear" integer NULL;

ALTER TABLE public."MotorBikeUnits"
    DROP CONSTRAINT IF EXISTS "CK_MotorBikeUnits_ManufactureYear";

ALTER TABLE public."MotorBikeUnits"
    ADD CONSTRAINT "CK_MotorBikeUnits_ManufactureYear"
    CHECK ("ManufactureYear" IS NULL OR "ManufactureYear" BETWEEN 1990 AND 2100);

ALTER TABLE public."CustomerFiles"
    DROP CONSTRAINT IF EXISTS "CK_CustomerFiles_ManufactureYear";

ALTER TABLE public."CustomerFiles"
    ADD CONSTRAINT "CK_CustomerFiles_ManufactureYear"
    CHECK ("ManufactureYear" IS NULL OR "ManufactureYear" BETWEEN 1990 AND 2100);


-- Purchased bikes : the purchase date's year
UPDATE public."MotorBikeUnits" u
SET    "ManufactureYear" = EXTRACT(YEAR FROM p."PurchaseDate")::integer
FROM   public."PurchasesMb" p
WHERE  p."PurchaseId" = u."PurchaseId"
AND    u."PurchaseId" > 0
AND    u."ManufactureYear" IS NULL;

-- Opening stock bikes : the opening date's year
UPDATE public."MotorBikeUnits" u
SET    "ManufactureYear" = EXTRACT(YEAR FROM o."OpeningDate")::integer
FROM   public."OpeningStock" o
WHERE  o."OpeningStockId" = u."OpeningStockId"
AND    u."ManufactureYear" IS NULL;

-- Customer files : the year of the chassis' bike record
UPDATE public."CustomerFiles" f
SET    "ManufactureYear" = u."ManufactureYear"
FROM   public."MotorBikeUnits" u
WHERE  upper(u."ChassisNo") = upper(f."ChassisNo")
AND    u."IsDeleted" = false
AND    u."ManufactureYear" IS NOT NULL
AND    f."ManufactureYear" IS NULL;

COMMIT;


-- Check (run on its own)
-- SELECT "ManufactureYear", count(*) FROM public."MotorBikeUnits"
-- WHERE "IsDeleted" = false GROUP BY 1 ORDER BY 1;
