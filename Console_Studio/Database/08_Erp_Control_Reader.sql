/*===============================================================
  AppCore Console : the ERP's read-only login to AppCore_Control
  (2026-11-20, step D : Mode Host).

  Run in pgAdmin connected to "AppCore_Control" (Query Tool on that
  database), the whole file (F5). Safe to run again.

  Makes the login appcore_erp_control (NO password here). Then, in
  pgAdmin : Login/Group Roles > appcore_erp_control > Properties >
  Definition > Password, and put the same password in the live
  ERP's appsettings.json (ConnectionStrings:Control).

  It can only READ three tables : Tenants, TenantDomains,
  DatabaseServers (web address -> company -> database). It cannot
  change anything, and it has no rights in any client database.
  No passwords are stored in these tables.
  ASCII only.
===============================================================*/

DO $$
BEGIN
    IF current_database() <> 'AppCore_Control' THEN
        RAISE EXCEPTION 'Wrong database (%). Run this on AppCore_Control.', current_database();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'appcore_erp_control') THEN
        CREATE ROLE appcore_erp_control LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOINHERIT;
    END IF;
END $$;

GRANT CONNECT ON DATABASE "AppCore_Control" TO appcore_erp_control;
GRANT USAGE ON SCHEMA public TO appcore_erp_control;

-- nothing else : take back anything given earlier, then the three tables
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM appcore_erp_control;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM appcore_erp_control;

GRANT SELECT ON public."Tenants", public."TenantDomains", public."DatabaseServers" TO appcore_erp_control;

-- Check : must show exactly the three tables, SELECT only
SELECT table_name AS "Table", string_agg(privilege_type, ', ') AS "Rights"
FROM information_schema.role_table_grants
WHERE grantee = 'appcore_erp_control'
GROUP BY table_name
ORDER BY table_name;
