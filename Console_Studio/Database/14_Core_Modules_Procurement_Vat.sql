ROLLBACK;

/*===============================================================
  AppCore Console : Procurement and VAT Management become core
  modules, "Reports" leaves the list (2026-11-20).

  ERP blueprint claude\blueprint-module-isolation.md, owner
  decisions :
    D2  Procurement is core : stock cannot be received without
        purchase invoices.
    D3  VAT Management is core for now : purchases, opening stock
        and bike pricing need its VAT rate rules. (It becomes
        switchable again when the Mushak books and returns are
        built as their own part.)
    D5  Reports : no such module exists in the ERP; the line is
        removed until one does.

  Run in pgAdmin on "AppCore_Control" (Query Tool on that
  database), the whole file (F5). Safe to run again.
  No Console update is needed : it already keeps a core module
  on and shows it as "always".
  ASCII only.
===============================================================*/

DO $$
BEGIN
    IF current_database() <> 'AppCore_Control' THEN
        RAISE EXCEPTION 'Run this on AppCore_Control, not on %.', current_database();
    END IF;
END $$;

BEGIN;

-- 1. core ------------------------------------------------------------------
UPDATE public."ProductModules" m
SET    "IsCore" = true
FROM   public."Products" p
WHERE  p."ProductId" = m."ProductId"
AND    p."ProductCode" = 'TWO-WHEELER'
AND    lower(m."ModuleCode") IN ('procurement', 'vat-management')
AND    m."IsCore" = false;

-- 2. Reports leaves the list -------------------------------------------------
DELETE FROM public."ProductPackageModules" x
USING  public."ProductModules" m
WHERE  m."ProductModuleId" = x."ProductModuleId"
AND    lower(m."ModuleCode") = 'reports';

DELETE FROM public."ProductModules"
WHERE  lower("ModuleCode") = 'reports';

-- 3. back on / cleaned for every tenant --------------------------------------
UPDATE public."Tenants" t
SET    "DisabledModules" = COALESCE((
           SELECT string_agg(x, ',' ORDER BY ord)
           FROM   unnest(string_to_array(t."DisabledModules", ',')) WITH ORDINALITY AS u(x, ord)
           WHERE  lower(trim(x)) NOT IN ('procurement', 'vat-management', 'reports', '')
       ), '')
WHERE  lower(t."DisabledModules") LIKE '%procurement%'
   OR  lower(t."DisabledModules") LIKE '%vat-management%'
   OR  lower(t."DisabledModules") LIKE '%reports%';

COMMIT;

-- Check ---------------------------------------------------------------------
SELECT m."ModuleCode", m."ModuleName", m."IsCore"
FROM   public."ProductModules" m
JOIN   public."Products" p ON p."ProductId" = m."ProductId"
WHERE  p."ProductCode" = 'TWO-WHEELER'
ORDER  BY m."DisplayOrder";

SELECT "TenantCode", "DisabledModules" FROM public."Tenants" ORDER BY "TenantCode";
