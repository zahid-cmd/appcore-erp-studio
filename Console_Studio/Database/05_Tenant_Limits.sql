ROLLBACK;

/*===============================================================
  AppCore Console : limits of a tenant (2026-11-19).

  Run in pgAdmin connected to "AppCore_Control" (Query Tool on that
  database), the whole file (F5). Safe to run again.

  The client makes his own company and branches inside the ERP;
  the Console only says how many he may have :

      Tenants."MaxCompanies"  how many companies (1 by default)
      Tenants."MaxBranches"   how many branches (empty = no limit)

  The ERP reads both with the tenant and refuses a new company or
  branch above the limit. Existing rows are never touched : every
  tenant starts with 1 company and no branch limit.
===============================================================*/

BEGIN;

ALTER TABLE public."Tenants" ADD COLUMN IF NOT EXISTS "MaxCompanies" integer NOT NULL DEFAULT 1;
ALTER TABLE public."Tenants" ADD COLUMN IF NOT EXISTS "MaxBranches"  integer;

ALTER TABLE public."Tenants" DROP CONSTRAINT IF EXISTS "CK_Tenants_MaxCompanies";
ALTER TABLE public."Tenants" ADD CONSTRAINT "CK_Tenants_MaxCompanies" CHECK ("MaxCompanies" >= 1);

ALTER TABLE public."Tenants" DROP CONSTRAINT IF EXISTS "CK_Tenants_MaxBranches";
ALTER TABLE public."Tenants" ADD CONSTRAINT "CK_Tenants_MaxBranches" CHECK ("MaxBranches" IS NULL OR "MaxBranches" >= 1);

COMMIT;

SELECT "TenantCode", "DisplayName", "MaxCompanies", "MaxBranches"
FROM public."Tenants"
ORDER BY "TenantCode";
