/*===============================================================
  AppCore Console : databases per product (2026-11-19).

  Run in pgAdmin connected to "AppCore_Control" (Query Tool on that
  database), the whole file (F5). Safe to run again.

  Design (project doc design-database-multi-product.md, owner
  approved 2026-11-17) : one PostgreSQL server per product, one
  Control for all. Each client database has its OWN login.

    Products."ShortCode"         TW / AU / RE / CO : part of the
                                 database names (AppCoreTpl_TW,
                                 AppCore_TW_<CLIENT>)
    DatabaseServers."ProductId"  the product whose databases live
                                 on that server (empty = any)
    ProductTemplates."DatabaseServerId"
                                 where the template database is
    Tenants."CredentialKey"      the client database's own login :
                                 the ERP reads the user name and
                                 password from its appsettings
                                 (Tenancy:Credentials:<key>), never
                                 from here. Empty = the server's key.

  Seeds :
    server PG-TW-01 (Two Wheeler; same PostgreSQL as PG-01 while we
    are on skyhost : 100.117.11.97:5433, login key PG-TW-01)
    template "Two Wheeler Standard" = AppCoreTpl_TW (current)

  A tenant can only be placed on a server of its own product
  (trigger). Nothing existing is changed : Moto Zone stays where it
  is until it moves to AppCore_TW_MOTOZONE.
  ASCII only.
===============================================================*/

-- Stops here unless pgAdmin is on AppCore_Control (2026-11-20)
DO $$
BEGIN
    IF current_database() <> 'AppCore_Control' THEN
        RAISE EXCEPTION 'Wrong database (%). Run this on AppCore_Control.', current_database();
    END IF;
END $$;

-- 1. Product short codes --------------------------------------------

ALTER TABLE public."Products" ADD COLUMN IF NOT EXISTS "ShortCode" varchar(4);

UPDATE public."Products" SET "ShortCode" = 'TW' WHERE "ProductCode" = 'TWO-WHEELER' AND "ShortCode" IS NULL;
UPDATE public."Products" SET "ShortCode" = 'AU' WHERE "ProductCode" = 'AUTOMOBILE'  AND "ShortCode" IS NULL;
UPDATE public."Products" SET "ShortCode" = 'RE' WHERE "ProductCode" = 'REAL-ESTATE' AND "ShortCode" IS NULL;
UPDATE public."Products" SET "ShortCode" = 'CO' WHERE "ProductCode" = 'CONSULTANCY' AND "ShortCode" IS NULL;

ALTER TABLE public."Products" DROP CONSTRAINT IF EXISTS "CK_Products_ShortCode";
ALTER TABLE public."Products" ADD CONSTRAINT "CK_Products_ShortCode"
    CHECK ("ShortCode" IS NULL OR "ShortCode" ~ '^[A-Z][A-Z0-9]{1,3}$');

CREATE UNIQUE INDEX IF NOT EXISTS "UX_Products_ShortCode"
    ON public."Products" ("ShortCode") WHERE "ShortCode" IS NOT NULL;


-- 2. Which product a database server is for ---------------------------

ALTER TABLE public."DatabaseServers"
    ADD COLUMN IF NOT EXISTS "ProductId" bigint REFERENCES public."Products" ("ProductId");


-- 3. Where a template database lives ----------------------------------

ALTER TABLE public."ProductTemplates"
    ADD COLUMN IF NOT EXISTS "DatabaseServerId" bigint REFERENCES public."DatabaseServers" ("DatabaseServerId");


-- 4. The client database's own login (key into the ERP settings) -----

ALTER TABLE public."Tenants" ADD COLUMN IF NOT EXISTS "CredentialKey" varchar(100);


-- 5. A tenant only on a server of its product -------------------------

CREATE OR REPLACE FUNCTION public."fn_Tenants_ServerProduct"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    server_product bigint;
BEGIN
    IF NEW."DatabaseServerId" IS NOT NULL THEN
        SELECT "ProductId" INTO server_product
        FROM public."DatabaseServers"
        WHERE "DatabaseServerId" = NEW."DatabaseServerId";

        IF server_product IS NOT NULL AND server_product <> NEW."ProductId" THEN
            RAISE EXCEPTION 'Tenant % : its database server belongs to another product.', NEW."TenantCode";
        END IF;
    END IF;

    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS "trg_Tenants_ServerProduct" ON public."Tenants";

CREATE TRIGGER "trg_Tenants_ServerProduct"
BEFORE INSERT OR UPDATE OF "DatabaseServerId", "ProductId" ON public."Tenants"
FOR EACH ROW EXECUTE FUNCTION public."fn_Tenants_ServerProduct"();


-- 6. Seeds : the Two Wheeler server and template ----------------------

INSERT INTO public."DatabaseServers" ("ServerCode", "ServerName", "Host", "Port", "CredentialKey", "ProductId")
SELECT 'PG-TW-01', 'Two Wheeler PostgreSQL 1', '100.117.11.97', 5433, 'PG-TW-01', p."ProductId"
FROM public."Products" p
WHERE p."ShortCode" = 'TW'
ON CONFLICT ("ServerCode") DO NOTHING;

INSERT INTO public."ProductTemplates" ("ProductId", "TemplateName", "DatabaseName", "SchemaVersion", "IsCurrent", "DatabaseServerId")
SELECT p."ProductId", 'Two Wheeler Standard', 'AppCoreTpl_TW', '2026.11.19', true, s."DatabaseServerId"
FROM public."Products" p
JOIN public."DatabaseServers" s ON s."ServerCode" = 'PG-TW-01'
WHERE p."ShortCode" = 'TW'
  AND NOT EXISTS (SELECT 1 FROM public."ProductTemplates" t WHERE t."DatabaseName" = 'AppCoreTpl_TW');

-- only one current template per product
UPDATE public."ProductTemplates" t
SET "IsCurrent" = false
WHERE t."IsCurrent"
  AND t."DatabaseName" <> 'AppCoreTpl_TW'
  AND t."ProductId" = (SELECT "ProductId" FROM public."Products" WHERE "ShortCode" = 'TW');


-- 7. Check ---------------------------------------------------------------

SELECT p."ShortCode", p."ProductName", p."Status",
       (SELECT string_agg(s."ServerCode", ', ') FROM public."DatabaseServers" s WHERE s."ProductId" = p."ProductId") AS "Servers",
       (SELECT string_agg(t."DatabaseName", ', ') FROM public."ProductTemplates" t WHERE t."ProductId" = p."ProductId" AND t."IsCurrent") AS "Current template"
FROM public."Products" p
ORDER BY p."DisplayOrder";
