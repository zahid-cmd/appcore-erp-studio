ROLLBACK;

-- ============================================================
-- Accessories : optional image (2026-11-13)
--
-- Adds "ImagePath" to "Accessories", like Motor Bikes and
-- Spare Parts. '' = no image : the pages show the item icon.
-- The file itself is saved by the API under
-- wwwroot/uploads/accessory-images/.
--
-- Safe to run more than once. Run the whole script (F5).
-- ============================================================

ALTER TABLE public."Accessories"
    ADD COLUMN IF NOT EXISTS "ImagePath" character varying(500) NOT NULL DEFAULT '';


-- Check : must show 1 row (character varying, 500, NO)
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM   information_schema.columns
WHERE  table_schema = 'public'
  AND  table_name   = 'Accessories'
  AND  column_name  = 'ImagePath';
