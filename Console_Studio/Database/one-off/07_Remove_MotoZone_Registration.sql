/*===============================================================
  AppCore Console : remove the first registration of Moto Zone
  (2026-11-19, owner : "i want the demo to get 001 id so delete
  moto zone first").

  Run in pgAdmin connected to "AppCore_Control" (Query Tool on that
  database), the whole file (F5).

  Removes from the Console ONLY :
    customer CUS-0001 Moto Zone, its tenant(s) (MOTOZONE), their
    web addresses, modules and status history.
  Then numbering starts again : the next customer is CUS-0001
  (the DEMO company), ids start at 1.

  Not touched : any ERP database (AppCoreERP_Studio keeps all its
  data), the audit log, the website requests (only unlinked).
  Moto Zone is registered again later as a fresh client.
  ASCII only.
===============================================================*/

DO $$
BEGIN
    IF current_database() <> 'AppCore_Control' THEN
        RAISE EXCEPTION 'Wrong database (%). Run this on AppCore_Control.', current_database();
    END IF;

    IF (SELECT count(*) FROM public."Customers") <> 1
       OR NOT EXISTS (SELECT 1 FROM public."Customers" WHERE "CustomerCode" = 'CUS-0001' AND "DisplayName" ILIKE 'Moto Zone%') THEN
        RAISE EXCEPTION 'Expected exactly one customer, CUS-0001 Moto Zone : stopped, nothing changed.';
    END IF;
END $$;

-- website requests converted to this customer : keep, unlink
UPDATE public."SiteRequests"
SET "CustomerId" = NULL
WHERE "CustomerId" IN (SELECT "CustomerId" FROM public."Customers" WHERE "CustomerCode" = 'CUS-0001');

-- tenants (web addresses, modules, status history go with them)
DELETE FROM public."Tenants"
WHERE "CustomerId" IN (SELECT "CustomerId" FROM public."Customers" WHERE "CustomerCode" = 'CUS-0001');

-- the customer (contacts go with it)
DELETE FROM public."Customers"
WHERE "CustomerCode" = 'CUS-0001';

-- ids start at 1 again
ALTER TABLE public."Customers"           ALTER COLUMN "CustomerId"            RESTART WITH 1;
ALTER TABLE public."CustomerContacts"    ALTER COLUMN "CustomerContactId"     RESTART WITH 1;
ALTER TABLE public."Tenants"             ALTER COLUMN "TenantId"              RESTART WITH 1;
ALTER TABLE public."TenantDomains"       ALTER COLUMN "TenantDomainId"        RESTART WITH 1;
ALTER TABLE public."TenantStatusHistory" ALTER COLUMN "TenantStatusHistoryId" RESTART WITH 1;

SELECT
    (SELECT count(*) FROM public."Customers") AS "Customers (must be 0)",
    (SELECT count(*) FROM public."Tenants")   AS "Tenants (must be 0)";
