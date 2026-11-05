-- =============================================================
-- Bike Models : Bike Type list update
--   'Electric'  -> 'Electric Bike'
--   new type    -> 'Electric Scooter'
-- Safe to run more than once.
-- =============================================================

BEGIN;

ALTER TABLE public."BikeModels"
    DROP CONSTRAINT IF EXISTS "CK_BikeModels_BikeType";

UPDATE public."BikeModels"
SET    "BikeType" = 'Electric Bike'
WHERE  "BikeType" = 'Electric';

ALTER TABLE public."BikeModels"
    ADD CONSTRAINT "CK_BikeModels_BikeType"
    CHECK ("BikeType" IN ('Scooter', 'Commuter', 'Sports', 'Cruiser', 'Electric Bike', 'Electric Scooter', 'Off-road'));

COMMIT;
