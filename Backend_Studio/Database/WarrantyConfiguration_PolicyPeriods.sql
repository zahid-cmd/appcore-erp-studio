-- ============================================================
-- Warranty Configuration : policy periods (2026-11-08) - run ONCE
-- (after WarrantyConfiguration_Redesign.sql)
--
-- The whole-bike warranty moves INTO the policy, and coverages
-- become part-level only :
--
--   WarrantyPolicies    + EffectiveTo (empty = open-ended)
--                       + PeriodValue / PeriodUnit / KmLimit
--                         (the whole-bike warranty)
--                       Policies of the same brand / model may
--                       not overlap in dates (checked by the
--                       page; the old one-row-per-date index is
--                       removed)
--   WarrantyCoverages   WarrantyPartId required (one part each)
--
-- A Whole Bike coverage row, if any, is copied into its policy
-- and removed. Policies with no such row get 1 Year : open them
-- and set the right period.
--
-- Run it in a NEW pgAdmin Query Tool with F5. ASCII only.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Policy : end date + whole-bike period
-- ------------------------------------------------------------

ALTER TABLE public."WarrantyPolicies"
    ADD COLUMN IF NOT EXISTS "EffectiveTo" date NULL;

ALTER TABLE public."WarrantyPolicies"
    ADD COLUMN IF NOT EXISTS "PeriodValue" integer NOT NULL DEFAULT 1;

ALTER TABLE public."WarrantyPolicies"
    ADD COLUMN IF NOT EXISTS "PeriodUnit" character varying(10) NOT NULL DEFAULT 'Years';

ALTER TABLE public."WarrantyPolicies"
    ADD COLUMN IF NOT EXISTS "KmLimit" integer NULL;


-- ------------------------------------------------------------
-- 2. Whole Bike coverage rows -> their policy
-- ------------------------------------------------------------

UPDATE public."WarrantyPolicies" AS p
SET    "PeriodValue" = c."PeriodValue",
       "PeriodUnit"  = c."PeriodUnit",
       "KmLimit"     = c."KmLimit"
FROM   public."WarrantyCoverages" AS c
WHERE  c."WarrantyPolicyId" = p."WarrantyPolicyId"
  AND  c."WarrantyPartId" IS NULL
  AND  c."IsDeleted" = false;

DELETE FROM public."WarrantyCoverages"
WHERE  "WarrantyPartId" IS NULL;

ALTER TABLE public."WarrantyPolicies"
    ALTER COLUMN "PeriodValue" DROP DEFAULT;

ALTER TABLE public."WarrantyPolicies"
    ALTER COLUMN "PeriodUnit" DROP DEFAULT;


-- ------------------------------------------------------------
-- 3. Rules
-- ------------------------------------------------------------

ALTER TABLE public."WarrantyPolicies"
    DROP CONSTRAINT IF EXISTS "CK_WarrantyPolicies_Unit";

ALTER TABLE public."WarrantyPolicies"
    ADD CONSTRAINT "CK_WarrantyPolicies_Unit"
    CHECK ("PeriodUnit" IN ('Days', 'Months', 'Years'));

ALTER TABLE public."WarrantyPolicies"
    DROP CONSTRAINT IF EXISTS "CK_WarrantyPolicies_Period";

ALTER TABLE public."WarrantyPolicies"
    ADD CONSTRAINT "CK_WarrantyPolicies_Period"
    CHECK ("PeriodValue" > 0);

ALTER TABLE public."WarrantyPolicies"
    DROP CONSTRAINT IF EXISTS "CK_WarrantyPolicies_Dates";

ALTER TABLE public."WarrantyPolicies"
    ADD CONSTRAINT "CK_WarrantyPolicies_Dates"
    CHECK ("EffectiveTo" IS NULL OR "EffectiveTo" >= "EffectiveFrom");

-- Overlap is checked by the page; this index only helped one
-- row per start date
DROP INDEX IF EXISTS public."UX_WarrantyPolicies_Scope_Date";

CREATE INDEX IF NOT EXISTS "IX_WarrantyPolicies_Scope"
    ON public."WarrantyPolicies" ("BrandManagementId", "BikeModelId");

-- Coverages : one part each, once per policy
ALTER TABLE public."WarrantyCoverages"
    ALTER COLUMN "WarrantyPartId" SET NOT NULL;

DROP INDEX IF EXISTS public."UX_WarrantyCoverages_Policy_Part";

CREATE UNIQUE INDEX "UX_WarrantyCoverages_Policy_Part"
    ON public."WarrantyCoverages" ("WarrantyPolicyId", "WarrantyPartId")
    WHERE "IsDeleted" = false;


-- ------------------------------------------------------------
-- Check
-- ------------------------------------------------------------

SELECT "Code", "Name", "EffectiveFrom", "EffectiveTo", "PeriodValue", "PeriodUnit", "KmLimit"
FROM   public."WarrantyPolicies"
ORDER  BY "Code";
