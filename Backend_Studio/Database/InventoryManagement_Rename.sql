-- =====================================================================
-- InventoryManagement_Rename.sql
-- ---------------------------------------------------------------------
-- Module MOD-012 : "Store Management" -> "Inventory Management"
--
-- Rewrites every text column of the application tables (navigation,
-- synchronization records, activity pages, permissions, system
-- configurations, ...) :
--
--     Store Management  -> Inventory Management
--     STORE MANAGEMENT  -> INVENTORY MANAGEMENT
--     store-management  -> inventory-management   (routes, file paths)
--     StoreManagement   -> InventoryManagement    (namespaces, folders)
--     storeManagement   -> inventoryManagement    (route export names)
--     store_management / storemanagement -> inventory_management / ...
--
-- History / audit tables are left as they were.
-- One DO block = one transaction. Safe to run again (finds nothing).
-- Menu names (Store Setup ...) are NOT changed.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Preview (optional) : the navigation rows that will change
-- ---------------------------------------------------------------------

SELECT 'Module' AS "Level", "Code", "Name", "RouteKey" AS "Route"
FROM   "NavigationModules"
WHERE  "Name" ~* 'store[ _-]?management' OR "RouteKey" ~* 'store[ _-]?management'
UNION ALL
SELECT 'Menu', "Code", "Name", "Route"
FROM   "NavigationMenus"
WHERE  "Route" ~* 'store[ _-]?management' OR "RouteKey" ~* 'store[ _-]?management'
UNION ALL
SELECT 'Submenu', "Code", "Name", "Route"
FROM   "NavigationSubmenus"
WHERE  "Route" ~* 'store[ _-]?management' OR "RouteKey" ~* 'store[ _-]?management';


-- ---------------------------------------------------------------------
-- 2. Rename
-- ---------------------------------------------------------------------

DO $$
DECLARE
    c        record;
    affected bigint;
    total    bigint := 0;
BEGIN
    FOR c IN
        SELECT col.table_name,
               col.column_name
        FROM   information_schema.columns col
        JOIN   information_schema.tables  tab
               ON  tab.table_schema = col.table_schema
               AND tab.table_name   = col.table_name
        WHERE  col.table_schema = 'public'
        AND    tab.table_type   = 'BASE TABLE'
        AND    col.data_type IN ('text', 'character varying', 'character')
        AND    col.table_name NOT ILIKE '%histor%'          -- audit trail stays
        AND    col.table_name NOT ILIKE 'backup\_%'
        AND    col.table_name <> '__EFMigrationsHistory'
        ORDER  BY col.table_name, col.column_name
    LOOP
        EXECUTE format(
            'UPDATE %I
                SET %I = replace(replace(replace(replace(replace(replace(replace(replace(%I,
                         ''Store Management'', ''Inventory Management''),
                         ''STORE MANAGEMENT'', ''INVENTORY MANAGEMENT''),
                         ''store-management'', ''inventory-management''),
                         ''store_management'', ''inventory_management''),
                         ''StoreManagement'',  ''InventoryManagement''),
                         ''storeManagement'',  ''inventoryManagement''),
                         ''storemanagement'',  ''inventorymanagement''),
                         ''STOREMANAGEMENT'',  ''INVENTORYMANAGEMENT'')
              WHERE %I ~* ''store[ _-]?management''',
            c.table_name, c.column_name, c.column_name, c.column_name);

        GET DIAGNOSTICS affected = ROW_COUNT;

        IF affected > 0 THEN
            RAISE NOTICE '%.% : % row(s)', c.table_name, c.column_name, affected;
            total := total + affected;
        END IF;
    END LOOP;

    RAISE NOTICE 'Store Management -> Inventory Management : % value(s) changed.', total;
END
$$;


-- ---------------------------------------------------------------------
-- 3. Check : should return no rows
-- ---------------------------------------------------------------------

SELECT 'Module' AS "Level", "Code", "Name", "RouteKey" AS "Route"
FROM   "NavigationModules"
WHERE  "Name" ~* 'store[ _-]?management' OR "RouteKey" ~* 'store[ _-]?management'
UNION ALL
SELECT 'Menu', "Code", "Name", "Route"
FROM   "NavigationMenus"
WHERE  "Route" ~* 'store[ _-]?management' OR "RouteKey" ~* 'store[ _-]?management'
UNION ALL
SELECT 'Submenu', "Code", "Name", "Route"
FROM   "NavigationSubmenus"
WHERE  "Route" ~* 'store[ _-]?management' OR "RouteKey" ~* 'store[ _-]?management';
