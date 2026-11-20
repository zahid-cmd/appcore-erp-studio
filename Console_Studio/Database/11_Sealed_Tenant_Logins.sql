/*===============================================================
  11_Sealed_Tenant_Logins.sql   (2026-11-20)

  Onboarding automation, step 1 : a client database's own login
  is kept in AppCore_Control, its password SEALED (encrypted with
  the ERP server's public key). Only the ERP server, which holds
  the private key, can open it. No more pasting a line into the
  server's appsettings and redeploying.

    Tenants."DbUsername"        the client database login
    Tenants."DbPasswordSealed"  'rsa-oaep-256:' + base64
    PlatformKeys                public keys (never private ones)

  The ERP's read-only login (appcore_erp_control) already reads
  "Tenants", so nothing new to grant. It cannot read PlatformKeys
  (it does not need to).

  Existing tenants (DEMO, MOTOZONE) keep their appsettings line :
  the ERP uses appsettings first, the sealed login second.

  Query Tool on AppCore_Control, the whole file (F5). Safe to run
  again. ASCII only.
===============================================================*/

DO $$
BEGIN
    IF current_database() <> 'AppCore_Control' THEN
        RAISE EXCEPTION 'Wrong database (%). Run this on AppCore_Control.', current_database();
    END IF;
END $$;

ALTER TABLE public."Tenants" ADD COLUMN IF NOT EXISTS "DbUsername"       varchar(100) NULL;
ALTER TABLE public."Tenants" ADD COLUMN IF NOT EXISTS "DbPasswordSealed" text         NULL;

CREATE TABLE IF NOT EXISTS public."PlatformKeys"
(
    "KeyName"      varchar(100) PRIMARY KEY,
    "PublicKeyPem" text         NOT NULL,
    "Remarks"      varchar(500) NOT NULL DEFAULT '',
    "CreatedDate"  timestamp with time zone NOT NULL DEFAULT now()
);

-- Check
SELECT column_name AS "New column", data_type AS "Type"
FROM information_schema.columns
WHERE table_name = 'Tenants' AND column_name IN ('DbUsername', 'DbPasswordSealed')
ORDER BY column_name;
