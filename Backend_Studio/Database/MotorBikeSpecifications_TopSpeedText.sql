ROLLBACK;

-- ============================================================
-- Motor Bike Specifications : Top Speed as typed text (2026-11-19)
--   e.g. "25-35 km/h", like Mileage ("60-85 km per charge").
--   Adds "TopSpeed" varchar(60); fills it from the old
--   "TopSpeedKmh" number where it was set and TopSpeed is empty.
--   "TopSpeedKmh" stays (older rows); the form now edits TopSpeed.
-- Safe to run more than once. Run the whole script (F5).
-- ============================================================

ALTER TABLE "MotorBikeSpecifications"
    ADD COLUMN IF NOT EXISTS "TopSpeed" varchar(60) NOT NULL DEFAULT '';

UPDATE "MotorBikeSpecifications"
SET    "TopSpeed" = "TopSpeedKmh"::text || ' km/h'
WHERE  "TopSpeed" = ''
AND    "TopSpeedKmh" > 0;

-- Check (run on its own) :
-- SELECT "SpecificationCode", "Mileage", "TopSpeed", "TopSpeedKmh"
-- FROM "MotorBikeSpecifications" ORDER BY "MotorBikeSpecificationId";
