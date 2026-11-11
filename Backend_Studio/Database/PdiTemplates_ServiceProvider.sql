ROLLBACK;

-- ============================================================
-- PDI Templates : Service Provider (2026-11-10)
--
-- The blank / filled PDI sheet prints a top row : the brand
-- logo (left, from Brand Management of the template's models)
-- and the service provider name (right, typed on the template,
-- e.g. Swiftech Service Limited for REVOO).
--
-- Run after BikeDeliveries_Pdi_Engine.sql. Safe to run again.
-- ============================================================

BEGIN;

ALTER TABLE public."PdiTemplates"
    ADD COLUMN IF NOT EXISTS "ServiceProviderName" varchar(150) NOT NULL DEFAULT '';

UPDATE public."PdiTemplates"
SET    "ServiceProviderName" = 'Swiftech Service Limited'
WHERE  "Code" = 'PDI-0001'
AND    trim("ServiceProviderName") = '';

COMMIT;

SELECT "Code", "Name", "ServiceProviderName"
FROM   public."PdiTemplates"
ORDER  BY "Code";
