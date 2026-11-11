ROLLBACK;

-- ============================================================
-- Customer Profiles : contact person of a Corporate /
-- Institution customer (2026-11-11)
--
-- "Corporate Information" on the Inbound customer page :
-- TIN No, BIN No, Contact Person, Contact Person NID.
--   ContactPersonName  CAPITAL LETTERS, optional
--   ContactPersonNid   optional, 10 / 13 / 17 digits, not unique
-- Individuals keep their own NID (NidNo).
--
-- Safe to run more than once. ASCII only.
-- ============================================================

BEGIN;

ALTER TABLE public."CustomerProfiles"
    ADD COLUMN IF NOT EXISTS "ContactPersonName" character varying(150) NOT NULL DEFAULT '';

ALTER TABLE public."CustomerProfiles"
    ADD COLUMN IF NOT EXISTS "ContactPersonNid" character varying(17) NOT NULL DEFAULT '';

COMMIT;

SELECT "CustomerCode", "CustomerName", "IsCorporate", "ContactPersonName", "ContactPersonNid"
FROM   public."CustomerProfiles"
WHERE  "IsCorporate"
ORDER  BY "CustomerCode";
