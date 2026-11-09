-- =============================================================
-- Motor Bike Specifications : Mileage / Range and Top Speed
-- (shown on the website). Safe to run more than once.
-- =============================================================

ALTER TABLE "MotorBikeSpecifications"
    ADD COLUMN IF NOT EXISTS "Mileage" varchar(60) NOT NULL DEFAULT '';

ALTER TABLE "MotorBikeSpecifications"
    ADD COLUMN IF NOT EXISTS "TopSpeedKmh" integer NOT NULL DEFAULT 0;

-- Check
SELECT "SpecificationCode", "Mileage", "TopSpeedKmh"
FROM "MotorBikeSpecifications"
ORDER BY "MotorBikeSpecificationId";
