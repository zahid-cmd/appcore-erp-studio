-- ============================================================
-- Purchases engine (2026-10-30) : run after Purchases_Shared.sql
-- and PostingSetup_StockLedger.sql
--
-- 1. PurchasesMb / Sp / Ac : receiving warehouse (switch
--    "Products Received on Purchase" ON)
-- 2. Page actions on every Purchases page (found by route
--    '/procurement/.../purchases-mb|sp|ac') :
--      Approve, Return, Post, Cancel (all exist already)
--    Common activities (View, Add, Update, Delete, Restore,
--    Print) show on every page already.
--
-- After running : tick the actions for the roles in Security &
-- Permission > Activity Assignment, then log in again.
--
-- Safe to run more than once. Run the whole script (F5).
-- ============================================================

DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['PurchasesMb', 'PurchasesSp', 'PurchasesAc']
    LOOP
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS "WarehouseId" bigint NULL', t);
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS "WarehouseName" character varying(150) NOT NULL DEFAULT %L', t, '');
        RAISE NOTICE '% : warehouse columns ready', t;
    END LOOP;
END $$;


INSERT INTO "MasterActivityPages" ("MasterActivityCode", "NavigationSubmenuCode", "CreatedBy")
SELECT a."Code", s."Code", 1
FROM   "MasterActivities" a
JOIN   "NavigationSubmenus" s
       ON s."Route" ILIKE '/procurement/%/purchases-%'
      AND s."IsDeleted" = false
WHERE  a."IsDeleted" = false
AND    a."ActivityScope" = 'Page'
AND    a."Name" IN ('Approve', 'Return', 'Post', 'Cancel')
ON CONFLICT ("MasterActivityCode", "NavigationSubmenuCode") DO NOTHING;


-- Check : the Purchases pages and their page actions
SELECT s."Code"  AS "Submenu",
       s."Name"  AS "Page",
       s."Route",
       COALESCE(string_agg(a."Name", ', ' ORDER BY a."DisplayOrder"), '') AS "Page Actions"
FROM   "NavigationSubmenus" s
LEFT   JOIN "MasterActivityPages" p ON p."NavigationSubmenuCode" = s."Code"
LEFT   JOIN "MasterActivities" a    ON a."Code" = p."MasterActivityCode" AND a."IsDeleted" = false
WHERE  s."Route" ILIKE '/procurement/%/purchases-%'
AND    s."IsDeleted" = false
GROUP  BY s."Code", s."Name", s."Route"
ORDER  BY s."Code";
