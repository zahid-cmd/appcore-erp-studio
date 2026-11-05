-- ============================================================
-- Enquiry Setup : Interest Levels by days to purchase (2026-11-03)
--
-- Adds a days range to the Interest Levels (Enquiry Setup) and
-- the Super Hot level. An open sales enquiry with an Expected
-- Purchase Date takes the level whose range holds the days left
-- to that date, and heats up as the date comes near :
--
--     Super Hot   0 -  3 days   (also when the date is past)
--     Hot         4 -  7 days
--     Warm        8 - 15 days
--     Cold       16+    days
--
-- Change the ranges on the Enquiry Setup page (Interest Levels).
--
-- Plain statements only : run in a NEW pgAdmin Query Tool with
-- F5. Safe to run again (ranges already set are not touched).
-- ============================================================


-- ------------------------------------------------------------
-- 1. Columns
-- ------------------------------------------------------------

ALTER TABLE public."EnquirySetups"
    ADD COLUMN IF NOT EXISTS "DaysFrom" integer NULL;

ALTER TABLE public."EnquirySetups"
    ADD COLUMN IF NOT EXISTS "DaysTo" integer NULL;


-- ------------------------------------------------------------
-- 2. Super Hot (next INT code; skipped when it exists)
-- ------------------------------------------------------------

INSERT INTO public."EnquirySetups"
    ("SetupType", "Code", "Name", "ColorCode", "Stage", "DisplayOrder",
     "IsDefault", "IsSystem", "Remarks", "IsActive", "IsDeleted",
     "CreatedBy", "CreatedDate")
SELECT
    'InterestLevel',
    'INT-' || lpad(s.n::text, 3, '0'),
    'Super Hot',
    '#DC2626',
    '',
    1,
    false, false, '', true, false,
    1, now()
FROM
(
    SELECT COALESCE(MAX(substring("Code" FROM 5)::int), 0) + 1 AS n
    FROM   public."EnquirySetups"
    WHERE  "SetupType" = 'InterestLevel'
      AND  "Code" ~ '^INT-[0-9]+$'
) AS s
WHERE NOT EXISTS
(
    SELECT 1
    FROM   public."EnquirySetups" e
    WHERE  e."SetupType" = 'InterestLevel'
      AND  e."IsDeleted" = false
      AND  lower(e."Name") = 'super hot'
);


-- ------------------------------------------------------------
-- 3. Hot turns orange (only if it still has the starter red,
--    which Super Hot now uses)
-- ------------------------------------------------------------

UPDATE public."EnquirySetups"
SET    "ColorCode" = '#EA580C'
WHERE  "SetupType" = 'InterestLevel'
  AND  "IsDeleted" = false
  AND  lower("Name") = 'hot'
  AND  upper("ColorCode") = '#DC2626';


-- ------------------------------------------------------------
-- 4. Order and starter ranges (rows without a range only)
-- ------------------------------------------------------------

UPDATE public."EnquirySetups" e
SET    "DisplayOrder" = v.ord,
       "DaysFrom"     = v.days_from,
       "DaysTo"       = v.days_to
FROM
(
    VALUES
        ('super hot', 1,  0,    3),
        ('hot',       2,  4,    7),
        ('warm',      3,  8,   15),
        ('cold',      4, 16, NULL::int)
) AS v (name, ord, days_from, days_to)
WHERE  e."SetupType" = 'InterestLevel'
  AND  e."IsDeleted" = false
  AND  lower(e."Name") = v.name
  AND  e."DaysFrom" IS NULL
  AND  e."DaysTo" IS NULL;


-- ------------------------------------------------------------
-- Check (run on its own) :
--
-- SELECT "Code", "Name", "ColorCode", "DaysFrom", "DaysTo",
--        "DisplayOrder", "IsDefault", "IsActive"
-- FROM   public."EnquirySetups"
-- WHERE  "SetupType" = 'InterestLevel' AND "IsDeleted" = false
-- ORDER  BY "DisplayOrder";
-- ------------------------------------------------------------
