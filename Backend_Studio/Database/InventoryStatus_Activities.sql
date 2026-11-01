-- ============================================================
-- Inventory Status pages : page actions (2026-10-31)
--
-- Pages (found by route '/inventory-management/inventory-status/…') :
--   Motor Bike Stock · Spare Parts & Lubricants Stock ·
--   Accessories Stock
--
-- 1. New Page activity (added only when the name is not taken) :
--      View Cost   see unit cost, average cost and stock value
--                  (without it the pages show quantities only;
--                  the server sends no cost)
-- 2. View Cost linked to the three pages.
--    Common activities (View, Print …) show on every page
--    already : View opens the stock card, Print prints / exports.
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
-- 1. New page action
-- ------------------------------------------------------------

INSERT INTO "MasterActivities"
    ("SequenceNo", "Code", "Name", "DisplayOrder", "Remarks",
     "ActivityScope", "LinkToSwitchPages",
     "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
SELECT
    m.max_seq + n.rn,
    'ACT-' || lpad((m.max_seq + n.rn)::text, 4, '0'),
    n.name,
    m.max_order + n.rn,
    n.remarks,
    'Page',
    false,
    true,
    false,
    1,
    now()
FROM
(
    SELECT v.name, v.remarks, row_number() OVER (ORDER BY v.ord) AS rn
    FROM
    (
        VALUES
            (1, 'View Cost', 'See unit cost, average cost and stock value on the stock pages.')
    ) AS v (ord, name, remarks)
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM   "MasterActivities" a
        WHERE  a."IsDeleted" = false
        AND    lower(trim(a."Name")) = lower(v.name)
    )
) AS n
CROSS JOIN
(
    SELECT COALESCE(MAX("SequenceNo"), 0)   AS max_seq,
           COALESCE(MAX("DisplayOrder"), 0) AS max_order
    FROM   "MasterActivities"
) AS m;

-- ------------------------------------------------------------
-- 2. Links : the three Inventory Status pages
-- ------------------------------------------------------------

INSERT INTO "MasterActivityPages" ("MasterActivityCode", "NavigationSubmenuCode", "CreatedBy")
SELECT a."Code", s."Code", 1
FROM   "MasterActivities" a
JOIN   "NavigationSubmenus" s
       ON s."Route" ILIKE '/inventory-management/inventory-status/%'
      AND s."IsDeleted" = false
WHERE  a."IsDeleted" = false
AND    a."ActivityScope" = 'Page'
AND    a."Name" IN ('View Cost')
ON CONFLICT ("MasterActivityCode", "NavigationSubmenuCode") DO NOTHING;

COMMIT;


-- ------------------------------------------------------------
-- Check (run on its own) : the pages, their routes and actions.
-- The routes must end with motor-bike-stock /
-- spare-parts-lubricants-stock / accessories-stock (the API
-- checks View Cost by route).
-- ------------------------------------------------------------

SELECT s."Code"  AS "Submenu",
       s."Name"  AS "Page",
       s."Route",
       COALESCE(string_agg(a."Name", ', ' ORDER BY a."DisplayOrder"), '') AS "Page Actions"
FROM   "NavigationSubmenus" s
LEFT   JOIN "MasterActivityPages" p ON p."NavigationSubmenuCode" = s."Code"
LEFT   JOIN "MasterActivities" a    ON a."Code" = p."MasterActivityCode" AND a."IsDeleted" = false
WHERE  s."Route" ILIKE '/inventory-management/inventory-status/%'
AND    s."IsDeleted" = false
GROUP  BY s."Code", s."Name", s."Route"
ORDER  BY s."Code";
