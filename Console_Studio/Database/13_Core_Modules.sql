/*===============================================================
  AppCore Console : Accounts & Finance and Inventory Management
  are core modules (2026-11-20).

  ERP blueprint claude\blueprint-module-setup-rearrangement.md,
  owner decision 3 : these two can never be switched off. Since
  the same day they also hold the pages that were Settings >
  Account Settings (Accounts Setup) and Settings > Product
  Settings (Product Setup), which every other module needs.

  Run in pgAdmin on "AppCore_Control" (Query Tool on that
  database), the whole file (F5). Safe to run again.
  No Console update is needed : it already keeps a core module
  on and shows it as "always".

  1. ProductModules.IsCore = true for the two modules
     (product TWO-WHEELER).
  2. Any tenant that has one of them switched off gets it back
     (the ERP picks it up within a minute).
  ASCII only.
===============================================================*/

DO $$
BEGIN
    IF current_database() <> 'AppCore_Control' THEN
        RAISE EXCEPTION 'Run this on AppCore_Control, not on %.', current_database();
    END IF;
END $$;

-- 1. core ------------------------------------------------------------------
UPDATE public."ProductModules" m
SET    "IsCore" = true
FROM   public."Products" p
WHERE  p."ProductId" = m."ProductId"
AND    p."ProductCode" = 'TWO-WHEELER'
AND    lower(m."ModuleCode") IN ('accounts-finance', 'inventory-management')
AND    m."IsCore" = false;

-- 2. back on for every tenant ---------------------------------------------
UPDATE public."Tenants" t
SET    "DisabledModules" = COALESCE((
           SELECT string_agg(x, ',' ORDER BY ord)
           FROM   unnest(string_to_array(t."DisabledModules", ',')) WITH ORDINALITY AS u(x, ord)
           WHERE  lower(trim(x)) NOT IN ('accounts-finance', 'inventory-management', '')
       ), '')
WHERE  lower(t."DisabledModules") LIKE '%accounts-finance%'
   OR  lower(t."DisabledModules") LIKE '%inventory-management%';

-- Check ---------------------------------------------------------------------
SELECT m."ModuleCode", m."ModuleName", m."IsCore"
FROM   public."ProductModules" m
JOIN   public."Products" p ON p."ProductId" = m."ProductId"
WHERE  p."ProductCode" = 'TWO-WHEELER'
ORDER  BY m."DisplayOrder";

SELECT "TenantCode", "DisabledModules" FROM public."Tenants" ORDER BY "TenantCode";
