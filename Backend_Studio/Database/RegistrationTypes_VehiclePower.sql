-- ============================================================
-- Registration Types : Vehicle Power (2026-11-08)
--
-- Registration fees / costs differ for fuel and electric bikes.
-- Each registration type now carries a Vehicle Power :
--   Electric  bikes whose specification Fuel Type is Electric
--   Fuel      every other fuel type (Petrol, Octane, Hybrid,
--             Diesel, CNG)
-- The Sales Invoice offers the types of the bike's power.
--
-- This script (run AFTER RegistrationConfiguration_Tables.sql) :
--   1. adds the column "VehiclePower" (locked after saving)
--   2. turns the 4 original system types into ELECTRIC and adds
--      " - Electric" to their names (their fees / costs stay)
--   3. adds the 4 FUEL system types (no rates yet), codes after
--      the highest RTY code in use
--
-- Plain statements, safe to run again. ASCII only.
-- ============================================================


-- 1. Column ---------------------------------------------------

ALTER TABLE public."RegistrationTypes"
    ADD COLUMN IF NOT EXISTS "VehiclePower" character varying(20) NOT NULL DEFAULT 'Fuel';

ALTER TABLE public."RegistrationTypes"
    DROP CONSTRAINT IF EXISTS "CK_RegistrationTypes_Power";

ALTER TABLE public."RegistrationTypes"
    ADD CONSTRAINT "CK_RegistrationTypes_Power"
        CHECK ("VehiclePower" IN ('Fuel', 'Electric'));


-- 2. The 4 original system types -> Electric -------------------
--    (system rows whose name does not yet end with a power)

UPDATE public."RegistrationTypes"
SET    "VehiclePower" = 'Electric',
       "Name"         = "Name" || ' - Electric',
       "ModifiedBy"   = 1,
       "ModifiedDate" = now()
WHERE  "IsSystem" = true
  AND  "Name" NOT LIKE '% - Electric'
  AND  "Name" NOT LIKE '% - Fuel';


-- 3. The 4 Fuel system types (one per plan and mode) -----------

INSERT INTO public."RegistrationTypes"
    ("Code", "RegistrationPlan", "ValidityYears", "RegistrationMode", "VehiclePower", "Name",
     "DisplayOrder", "IsDefault", "IsSystem", "Remarks", "IsActive", "IsDeleted",
     "CreatedBy", "CreatedDate")
SELECT
    'RTY-' || lpad((m.top + row_number() OVER (ORDER BY v.ord))::text, 3, '0'),
    v.plan, v.years, v.mode, 'Fuel', v.name,
    o.top_order + v.ord, false, true, '', true, false,
    1, now()
FROM
(
    VALUES
        (1, 'Installment',      2,  'Online',  'Installment System - Online - Fuel'),
        (2, 'Installment',      2,  'Offline', 'Installment System - Offline - Fuel'),
        (3, 'FullRegistration', 10, 'Online',  'One Time Full Registration - Online - Fuel'),
        (4, 'FullRegistration', 10, 'Offline', 'One Time Full Registration - Offline - Fuel')
) AS v (ord, plan, years, mode, name)
CROSS JOIN
(
    SELECT COALESCE(MAX(substring("Code" FROM '^RTY-([0-9]+)$')::int), 0) AS top
    FROM   public."RegistrationTypes"
) AS m
CROSS JOIN
(
    SELECT COALESCE(MAX("DisplayOrder"), 0) AS top_order
    FROM   public."RegistrationTypes"
    WHERE  "IsDeleted" = false
) AS o
WHERE NOT EXISTS
(
    SELECT 1
    FROM   public."RegistrationTypes" t
    WHERE  t."IsDeleted" = false
      AND  (
               (t."RegistrationPlan" = v.plan AND t."RegistrationMode" = v.mode
                AND t."VehiclePower" = 'Fuel' AND t."IsSystem" = true)
            OR lower(t."Name") = lower(v.name)
           )
);


-- 4. Check -----------------------------------------------------

SELECT "Code", "Name", "RegistrationPlan", "RegistrationMode", "VehiclePower",
       "ValidityYears", "IsDefault", "IsSystem"
FROM   public."RegistrationTypes"
WHERE  "IsDeleted" = false
ORDER  BY "DisplayOrder", "Code";
