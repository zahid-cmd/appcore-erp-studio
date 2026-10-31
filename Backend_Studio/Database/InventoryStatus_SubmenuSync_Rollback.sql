-- =====================================================================
-- InventoryStatus_SubmenuSync_Rollback.sql
-- ---------------------------------------------------------------------
-- Undo the Submenu / Code Synchronization records of the three
-- Inventory Status pages (Motor Bike Stock, Spare Parts & Lubricants
-- Stock, Accessories Stock). They are hand-built report pages: no
-- CRUD baseline, no table.
--
-- KEPT : the three submenus in Navigation (the sidebar items and
--        their permissions) and the Inventory Status MENU sync.
-- REMOVED : their rows in INF_SubmenuSynchronization and
--           CodeSynchronizations, and any baseline table the sync made.
--
-- Same way as Procurement_Sync_Reset.sql. Safe to run again.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Preview : the three submenus and their sync rows
-- ---------------------------------------------------------------------

SELECT s."Id", s."Code", s."Name", s."Route"
FROM   "NavigationSubmenus" s
WHERE  s."Route" ILIKE '/inventory-management/inventory-status/%';

SELECT 'INF_SubmenuSynchronization' AS "Table", x."Id", x."SubmenuId"
FROM   "INF_SubmenuSynchronization" x
WHERE  x."SubmenuId" IN (SELECT "Id" FROM "NavigationSubmenus"
                         WHERE "Route" ILIKE '/inventory-management/inventory-status/%')
UNION ALL
SELECT 'CodeSynchronizations', x."Id", x."SubmenuId"
FROM   "CodeSynchronizations" x
WHERE  x."SubmenuId" IN (SELECT "Id" FROM "NavigationSubmenus"
                         WHERE "Route" ILIKE '/inventory-management/inventory-status/%');


-- ---------------------------------------------------------------------
-- 2. Rollback
-- ---------------------------------------------------------------------

DO $$
DECLARE
    removed bigint;
BEGIN
    DELETE FROM "CodeSynchronizations"
    WHERE  "SubmenuId" IN (SELECT "Id" FROM "NavigationSubmenus"
                           WHERE "Route" ILIKE '/inventory-management/inventory-status/%');
    GET DIAGNOSTICS removed = ROW_COUNT;
    RAISE NOTICE 'CodeSynchronizations : % row(s) removed', removed;

    DELETE FROM "INF_SubmenuSynchronization"
    WHERE  "SubmenuId" IN (SELECT "Id" FROM "NavigationSubmenus"
                           WHERE "Route" ILIKE '/inventory-management/inventory-status/%');
    GET DIAGNOSTICS removed = ROW_COUNT;
    RAISE NOTICE 'INF_SubmenuSynchronization : % row(s) removed', removed;

    -- Baseline tables, only if a Code Sync created them (and empty)
    IF to_regclass('public."MotorBikeStock"') IS NOT NULL THEN
        EXECUTE 'DROP TABLE public."MotorBikeStock"';
        RAISE NOTICE 'Table MotorBikeStock dropped';
    END IF;

    IF to_regclass('public."SparePartsLubricantsStock"') IS NOT NULL THEN
        EXECUTE 'DROP TABLE public."SparePartsLubricantsStock"';
        RAISE NOTICE 'Table SparePartsLubricantsStock dropped';
    END IF;

    IF to_regclass('public."AccessoriesStock"') IS NOT NULL THEN
        EXECUTE 'DROP TABLE public."AccessoriesStock"';
        RAISE NOTICE 'Table AccessoriesStock dropped';
    END IF;
END
$$;


-- ---------------------------------------------------------------------
-- 3. Check : the submenus are still there; the sync rows are gone
-- ---------------------------------------------------------------------

SELECT s."Code", s."Name", s."Route", s."IsActive"
FROM   "NavigationSubmenus" s
WHERE  s."Route" ILIKE '/inventory-management/inventory-status/%';

SELECT COUNT(*) AS "SyncRowsLeft"
FROM   (
           SELECT "Id" FROM "INF_SubmenuSynchronization"
           WHERE  "SubmenuId" IN (SELECT "Id" FROM "NavigationSubmenus"
                                  WHERE "Route" ILIKE '/inventory-management/inventory-status/%')
           UNION ALL
           SELECT "Id" FROM "CodeSynchronizations"
           WHERE  "SubmenuId" IN (SELECT "Id" FROM "NavigationSubmenus"
                                  WHERE "Route" ILIKE '/inventory-management/inventory-status/%')
       ) t;
