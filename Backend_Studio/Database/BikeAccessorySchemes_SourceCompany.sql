-- ==============================================================
-- Bike Accessory Schemes : source "Dealer" renamed to "Company"
--
-- Run once if BikeAccessorySchemes_Tables.sql was already run.
-- Safe to run again. ASCII only.
-- ==============================================================

BEGIN;

ALTER TABLE "BikeAccessorySchemes"
    DROP CONSTRAINT IF EXISTS "CK_BikeAccessorySchemes_Source";

UPDATE "BikeAccessorySchemes"
SET "SchemeSource" = 'Company'
WHERE "SchemeSource" = 'Dealer';

ALTER TABLE "BikeAccessorySchemes"
    ADD CONSTRAINT "CK_BikeAccessorySchemes_Source"
        CHECK ("SchemeSource" IN ('Supplier', 'Company'));

COMMIT;

-- Check
SELECT "SchemeSource", count(*) AS schemes
FROM "BikeAccessorySchemes"
GROUP BY "SchemeSource"
ORDER BY 1;
