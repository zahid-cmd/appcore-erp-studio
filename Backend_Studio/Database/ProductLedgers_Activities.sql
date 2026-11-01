-- ============================================================
-- Product Ledgers pages : page actions (2026-11-01)
--
-- Pages (found by route '/inventory-management/product-ledgers/…') :
--   Motor Bikes Ledger · Spare Parts & Lubricants Ledger ·
--   Accessories Ledger
--
-- View Cost (made by InventoryStatus_Activities.sql) is linked
-- to the three pages : with it the pages show unit cost and
-- values (the "Show value" switch); without it quantities only
-- (the server sends no value).
-- Common activities (View, Print …) show on every page already.
--
-- After running : tick View / Print / View Cost for the roles in
-- Security & Permission > Activity Assignment (or per user in
-- Special Assignment), then log in again.
--
-- Safe to run more than once. Run the whole script (F5); then
-- run the SELECT at the bottom on its own.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. View Cost (only when it is not there yet)
-- ------------------------------------------------------------

INSERT INTO "MasterActivities"
    ("SequenceNo", "Code", "Name", "DisplayOrder", "Remarks",
     "ActivityScope", "LinkToSwitchPages",
     "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
SELECT
    m.max_seq + 1,
    'ACT-' || lpad((m.max_seq + 1)::text, 4, '0'),
    'View Cost',
    m.max_order + 1,
    'See unit cost, average cost and stock value on the stock pages.',
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
    AND    lower(trim(a."Name")) = 'view cost'
);

-- ------------------------------------------------------------
-- 2. Links : the three Product Ledgers pages
-- ------------------------------------------------------------

INSERT INTO "MasterActivityPages" ("MasterActivityCode", "NavigationSubmenuCode", "CreatedBy")
SELECT a."Code", s."Code", 1
FROM   "MasterActivities" a
JOIN   "NavigationSubmenus" s
       ON s."Route" ILIKE '/inventory-management/product-ledgers/%'
      AND s."IsDeleted" = false
WHERE  a."IsDeleted" = false
AND    a."ActivityScope" = 'Page'
AND    a."Name" IN ('View Cost')
ON CONFLICT ("MasterActivityCode", "NavigationSubmenuCode") DO NOTHING;

COMMIT;


-- ------------------------------------------------------------
-- Check (run on its own) : the pages, their routes and actions.
-- The routes must end with motor-bikes-ledger /
-- spare-parts-lubricants-ledger / accessories-ledger (the API
-- checks View Cost by route).
-- ------------------------------------------------------------

SELECT s."Code"  AS "Submenu",
       s."Name"  AS "Page",
       s."Route",
       COALESCE(string_agg(a."Name", ', ' ORDER BY a."DisplayOrder"), '') AS "Page Actions"
FROM   "NavigationSubmenus" s
LEFT   JOIN "MasterActivityPages" p ON p."NavigationSubmenuCode" = s."Code"
LEFT   JOIN "MasterActivities" a    ON a."Code" = p."MasterActivityCode" AND a."IsDeleted" = false
WHERE  s."Route" ILIKE '/inventory-management/product-ledgers/%'
AND    s."IsDeleted" = false
GROUP  BY s."Code", s."Name", s."Route"
ORDER  BY s."Code";
