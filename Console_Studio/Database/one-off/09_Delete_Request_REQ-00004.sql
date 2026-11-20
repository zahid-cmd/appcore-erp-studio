/*===============================================================
  AppCore Console : delete website request REQ-00004 (2026-11-20,
  owner : "wrongly created the 004 delete it first").

  Run in pgAdmin on "AppCore_Control" (Query Tool on that
  database), the whole file (F5). Saves at once.

  Removes :
    - the request REQ-00004;
    - the customer it was converted to, with that customer's
      contacts and tenants (web addresses, modules, status
      history), ONLY if no other request points to that customer
      and none of its tenants has a database yet.
  If a tenant already has a database, it stops and changes
  nothing (say so to Claude : the database must go first).
  Ids continue from the highest one left. ASCII only.
===============================================================*/

DO $$
DECLARE
    v_req      bigint;
    v_customer bigint;
    v_code     text;
    v_name     text;
    v_tenants  int;
BEGIN
    IF current_database() <> 'AppCore_Control' THEN
        RAISE EXCEPTION 'Wrong database (%). Run this on AppCore_Control.', current_database();
    END IF;

    SELECT "SiteRequestId", "CustomerId" INTO v_req, v_customer
    FROM   public."SiteRequests"
    WHERE  "RequestNo" = 'REQ-00004';

    IF v_req IS NULL THEN
        RAISE EXCEPTION 'REQ-00004 not found : nothing changed.';
    END IF;

    IF v_customer IS NOT NULL THEN
        SELECT "CustomerCode", "DisplayName" INTO v_code, v_name
        FROM   public."Customers" WHERE "CustomerId" = v_customer;

        IF EXISTS (SELECT 1 FROM public."SiteRequests"
                   WHERE "CustomerId" = v_customer AND "SiteRequestId" <> v_req) THEN
            -- another request uses this customer : keep the customer
            RAISE NOTICE 'Customer % % is also linked to another request : kept.', v_code, v_name;
            v_customer := NULL;
        ELSIF EXISTS (SELECT 1 FROM public."Tenants"
                      WHERE "CustomerId" = v_customer AND "DatabaseName" IS NOT NULL) THEN
            RAISE EXCEPTION 'Customer % % has a tenant with a database already : stopped, nothing changed.', v_code, v_name;
        END IF;
    END IF;

    DELETE FROM public."SiteRequests" WHERE "SiteRequestId" = v_req;
    RAISE NOTICE 'Request REQ-00004 deleted.';

    IF v_customer IS NOT NULL THEN
        DELETE FROM public."Tenants" WHERE "CustomerId" = v_customer;
        GET DIAGNOSTICS v_tenants = ROW_COUNT;

        DELETE FROM public."Customers" WHERE "CustomerId" = v_customer;
        RAISE NOTICE 'Customer % % deleted, with % tenant(s).', v_code, v_name, v_tenants;
    END IF;

    -- ids continue from the highest one left
    PERFORM setval(pg_get_serial_sequence('public."SiteRequests"', 'SiteRequestId'),
                   COALESCE((SELECT max("SiteRequestId") FROM public."SiteRequests"), 0) + 1, false);
    PERFORM setval(pg_get_serial_sequence('public."Customers"', 'CustomerId'),
                   COALESCE((SELECT max("CustomerId") FROM public."Customers"), 0) + 1, false);
    PERFORM setval(pg_get_serial_sequence('public."CustomerContacts"', 'CustomerContactId'),
                   COALESCE((SELECT max("CustomerContactId") FROM public."CustomerContacts"), 0) + 1, false);
    PERFORM setval(pg_get_serial_sequence('public."Tenants"', 'TenantId'),
                   COALESCE((SELECT max("TenantId") FROM public."Tenants"), 0) + 1, false);
    PERFORM setval(pg_get_serial_sequence('public."TenantDomains"', 'TenantDomainId'),
                   COALESCE((SELECT max("TenantDomainId") FROM public."TenantDomains"), 0) + 1, false);
    PERFORM setval(pg_get_serial_sequence('public."TenantStatusHistory"', 'TenantStatusHistoryId'),
                   COALESCE((SELECT max("TenantStatusHistoryId") FROM public."TenantStatusHistory"), 0) + 1, false);
END $$;

-- What is left
SELECT "RequestNo", "DisplayName", "Status" FROM public."SiteRequests" ORDER BY "RequestNo";
SELECT "CustomerCode", "DisplayName" FROM public."Customers" ORDER BY "CustomerCode";
