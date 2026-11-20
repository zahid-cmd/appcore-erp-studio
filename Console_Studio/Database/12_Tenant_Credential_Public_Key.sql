/*===============================================================
  12_Tenant_Credential_Public_Key.sql   (2026-11-20)

  Puts the ERP server's PUBLIC key into AppCore_Control, so the
  Console can seal each new client's database password with it.

  Where the key comes from : the ERP on skyhost makes its key pair
  by itself the first time it starts with this version :
      C:\ProgramData\AppCore\keys\tenant-credentials.pem          PRIVATE : never copy, never send
      C:\ProgramData\AppCore\keys\tenant-credentials.public.pem   public  : this one

  1. On skyhost open tenant-credentials.public.pem in Notepad,
     select all, copy.
  2. Below, replace the line PASTE THE PUBLIC KEY HERE with it
     (keep the $key$ lines as they are).
  3. Query Tool on AppCore_Control, the whole file (F5).

  A public key is not secret. Running again replaces it (only do
  that if the ERP's key pair was made again : clients sealed with
  the old key then need "Reset database login").  ASCII only.
===============================================================*/

INSERT INTO public."PlatformKeys" ("KeyName", "PublicKeyPem", "Remarks")
VALUES
(
    'tenant-credentials',
$key$
PASTE THE PUBLIC KEY HERE
$key$,
    'ERP server key : seals client database passwords'
)
ON CONFLICT ("KeyName") DO UPDATE
SET "PublicKeyPem" = EXCLUDED."PublicKeyPem", "CreatedDate" = now();

-- Check : must start with -----BEGIN PUBLIC KEY-----
SELECT "KeyName", left(trim("PublicKeyPem"), 26) AS "Starts with", length("PublicKeyPem") AS "Length"
FROM public."PlatformKeys";
