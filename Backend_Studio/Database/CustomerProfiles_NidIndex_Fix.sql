-- ==============================================================
-- Customer Profiles : NID unique index fix
-- --------------------------------------------------------------
-- The database has "UX_CustomerProfiles_NidNo", which treats an
-- EMPTY NID as a value : only ONE customer without NID can exist,
-- so a second Outside customer (no NID) is refused.
--
-- The rule (as in CustomerProfilesConfiguration) : an NID must be
-- unique among live customers, empty NIDs are not checked.
-- This replaces the index with that one. Safe to run again.
-- ==============================================================

-- Before : the NID index(es) now in the database
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename  = 'CustomerProfiles'
  AND indexdef ILIKE '%NidNo%';

DROP INDEX IF EXISTS "UX_CustomerProfiles_NidNo";

CREATE UNIQUE INDEX IF NOT EXISTS "IX_CustomerProfiles_NidNo"
    ON "CustomerProfiles" ("NidNo")
    WHERE "IsDeleted" = false AND "NidNo" <> '';

-- After : only IX_CustomerProfiles_NidNo, with the filter
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename  = 'CustomerProfiles'
  AND indexdef ILIKE '%NidNo%';
