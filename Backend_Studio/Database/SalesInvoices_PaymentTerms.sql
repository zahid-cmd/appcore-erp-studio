ROLLBACK;

-- ============================================================
-- Sales Invoices (MB / SP / AC) : payment term tabs (2026-11-10)
--
-- 1. Columns on SalesInvoicesMb / SalesInvoicesSp /
--    SalesInvoicesAc :
--      PaymentTerm     Cash / Credit / EMI ('' = saved before)
--      EmiAccountCode  EMI : the EMI account the balance is
--      EmiAccountName        collected through
-- 2. Page actions "Credit Sale" and "EMI Sale", linked to the
--    three Sales Invoices pages (route .../sales-invoices-...).
--
-- After running : tick Credit Sale / EMI Sale for the roles in
-- Security & Permission > Activity Assignment (or per user in
-- Special Assignment), then log in again. Without them the tabs
-- show greyed out.
--
-- Safe to run more than once. Run the whole script (F5).
-- ASCII only.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Columns
-- ------------------------------------------------------------

DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['SalesInvoicesMb', 'SalesInvoicesSp', 'SalesInvoicesAc']
    LOOP
        IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS "PaymentTerm"    character varying(10)  NOT NULL DEFAULT ''''', t);
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS "EmiAccountCode" character varying(30)  NOT NULL DEFAULT ''''', t);
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS "EmiAccountName" character varying(250) NOT NULL DEFAULT ''''', t);
            RAISE NOTICE '% : payment term columns ready', t;
        ELSE
            RAISE NOTICE '% : table not found (skipped)', t;
        END IF;
    END LOOP;
END $$;

-- ------------------------------------------------------------
-- 2. Page actions (only when not there yet)
-- ------------------------------------------------------------

INSERT INTO "MasterActivities"
    ("SequenceNo", "Code", "Name", "DisplayOrder", "Remarks",
     "ActivityScope", "LinkToSwitchPages",
     "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
SELECT
    m.max_seq + 1,
    'ACT-' || lpad((m.max_seq + 1)::text, 4, '0'),
    'Credit Sale',
    m.max_order + 1,
    'Sales Invoices : choose the Credit payment term (the balance goes to the customer receivable).',
    'Page',
    false,
    true,
    false,
    1,
    now()
FROM
(
    SELECT COALESCE(MAX("SequenceNo"), 0)   AS max_seq,
           COALESCE(MAX("DisplayOrder"), 0) AS max_order
    FROM   "MasterActivities"
) AS m
WHERE NOT EXISTS
(
    SELECT 1
    FROM   "MasterActivities" a
    WHERE  a."IsDeleted" = false
    AND    lower(trim(a."Name")) = 'credit sale'
);

INSERT INTO "MasterActivities"
    ("SequenceNo", "Code", "Name", "DisplayOrder", "Remarks",
     "ActivityScope", "LinkToSwitchPages",
     "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
SELECT
    m.max_seq + 1,
    'ACT-' || lpad((m.max_seq + 1)::text, 4, '0'),
    'EMI Sale',
    m.max_order + 1,
    'Sales Invoices - MB : choose the EMI payment term (the balance is collected through an EMI account).',
    'Page',
    false,
    true,
    false,
    1,
    now()
FROM
(
    SELECT COALESCE(MAX("SequenceNo"), 0)   AS max_seq,
           COALESCE(MAX("DisplayOrder"), 0) AS max_order
    FROM   "MasterActivities"
) AS m
WHERE NOT EXISTS
(
    SELECT 1
    FROM   "MasterActivities" a
    WHERE  a."IsDeleted" = false
    AND    lower(trim(a."Name")) = 'emi sale'
);

-- Links : Credit Sale on the three Sales Invoices pages; EMI Sale
-- on Sales Invoices - MB only
INSERT INTO "MasterActivityPages" ("MasterActivityCode", "NavigationSubmenuCode", "CreatedBy")
SELECT a."Code", s."Code", 1
FROM   "MasterActivities" a
JOIN   "NavigationSubmenus" s
       ON s."IsDeleted" = false
      AND (
              (lower(a."Name") = 'credit sale' AND s."Route" ILIKE '/sales-operations/%/sales-invoices-%')
           OR (lower(a."Name") = 'emi sale'    AND s."Route" ILIKE '/sales-operations/%/sales-invoices-mb')
          )
WHERE  a."IsDeleted" = false
AND    a."ActivityScope" = 'Page'
AND    lower(a."Name") IN ('credit sale', 'emi sale')
ON CONFLICT ("MasterActivityCode", "NavigationSubmenuCode") DO NOTHING;

COMMIT;

-- ------------------------------------------------------------
-- Check : the pages and their actions
-- ------------------------------------------------------------

SELECT s."Name"  AS "Page",
       s."Route",
       COALESCE(string_agg(a."Name", ', ' ORDER BY a."DisplayOrder"), '') AS "Page Actions"
FROM   "NavigationSubmenus" s
LEFT   JOIN "MasterActivityPages" p ON p."NavigationSubmenuCode" = s."Code"
LEFT   JOIN "MasterActivities" a    ON a."Code" = p."MasterActivityCode" AND a."IsDeleted" = false
WHERE  s."Route" ILIKE '/sales-operations/%/sales-invoices-%'
AND    s."IsDeleted" = false
GROUP  BY s."Name", s."Route"
ORDER  BY s."Route";
