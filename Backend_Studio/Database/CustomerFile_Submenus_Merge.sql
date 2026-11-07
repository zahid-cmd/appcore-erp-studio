-- =====================================================================
-- CustomerFile_Submenus_Merge.sql   (2026-11-08)
-- ---------------------------------------------------------------------
-- Registration Management > Customer File : one submenu "Customer
-- Files" with three tabs (File Register, Name Transfer, Fees
-- Collection) replaces the separate submenus. This script removes
-- for good the submenus of the menu Customer File named :
--     Name Transfers
--     Name Transfer Fees Collection
-- and every row that points to them (activity / special
-- assignments, code / submenu sync, page activities, system
-- configurations).
--
-- KEPT : Customer File Dashboard, Customer Files, Customer File
--        Configuration (display order set to 1, 2, 3).
--
-- Hard delete; rows of other tables that point to them by a foreign
-- key (e.g. ActivityAssignmentPermissions) are deleted first. Missing
-- tables / columns are skipped. Run the whole
-- script (F5). Safe to run again. ASCII only.
-- =====================================================================


-- Clears a transaction left open by an earlier failed run in the
-- same pgAdmin tab (a harmless warning when there is none).
ROLLBACK;


-- 1. Preview : the submenus of the menu Customer File

SELECT s."Id", s."Code", s."Name", s."Route", s."DisplayOrder", s."IsActive"
FROM   "NavigationSubmenus" s
WHERE  lower(s."Route") LIKE '/registration-management/customer-file/%'
ORDER  BY s."DisplayOrder";


-- 2. Delete the two submenus
--    pg_temp.delete_rows deletes the rows of a table that match a
--    condition, after first deleting (the same way) every row of
--    any table that points to them by a foreign key, e.g.
--    ActivityAssignmentPermissions -> ActivityAssignmentDetails.

CREATE OR REPLACE FUNCTION pg_temp.delete_rows
(
    p_table text,
    p_where text,
    p_depth int DEFAULT 0
)
RETURNS bigint
LANGUAGE plpgsql
AS $f$
DECLARE
    fk  record;
    n   bigint;
BEGIN
    IF p_depth > 8 THEN
        RAISE EXCEPTION 'Foreign keys nested too deep under %', p_table;
    END IF;

    -- Children first (single-column foreign keys)
    FOR fk IN
        SELECT ch.relname  AS child_table,
               chc.attname AS child_col,
               pac.attname AS parent_col
        FROM   pg_constraint c
        JOIN   pg_class      ch  ON ch.oid  = c.conrelid
        JOIN   pg_class      pa  ON pa.oid  = c.confrelid
        JOIN   pg_namespace  ns  ON ns.oid  = pa.relnamespace
        JOIN   pg_attribute  chc ON chc.attrelid = c.conrelid  AND chc.attnum = c.conkey[1]
        JOIN   pg_attribute  pac ON pac.attrelid = c.confrelid AND pac.attnum = c.confkey[1]
        WHERE  c.contype = 'f'
          AND  ns.nspname = 'public'
          AND  pa.relname = p_table
          AND  array_length(c.conkey, 1) = 1
          AND  ch.relname <> p_table
    LOOP
        n := pg_temp.delete_rows(
                 fk.child_table,
                 format('%I IN (SELECT %I FROM public.%I WHERE %s)',
                        fk.child_col, fk.parent_col, p_table, p_where),
                 p_depth + 1);

        IF n > 0 THEN
            RAISE NOTICE '%  % : % row(s) removed', repeat('  ', p_depth + 1), fk.child_table, n;
        END IF;
    END LOOP;

    EXECUTE format('DELETE FROM public.%I WHERE %s', p_table, p_where);

    GET DIAGNOSTICS n = ROW_COUNT;

    RETURN n;
END
$f$;


DO $$
DECLARE
    x record;
    r record;
    n bigint;
BEGIN
    FOR x IN
        SELECT "Id", "Code", "Name"
        FROM   "NavigationSubmenus"
        WHERE  lower("Route") LIKE '/registration-management/customer-file/%'
          AND  lower(trim("Name")) IN ('name transfers', 'name transfer fees collection')
    LOOP
        RAISE NOTICE '--- Submenu % % (Id %) ---', x."Code", x."Name", x."Id";

        FOR r IN
            SELECT * FROM (VALUES
                ('ActivityAssignmentDetails',  'SubMenuId',             'id'),
                ('SpecialAssignmentDetails',   'SubMenuId',             'id'),
                ('CodeSynchronizations',       'SubmenuId',             'id'),
                ('INF_SubmenuSynchronization', 'SubmenuId',             'id'),
                ('MasterActivityPages',        'NavigationSubmenuCode', 'code'),
                ('SystemConfigurations',       'NavigationSubmenuCode', 'code')
            ) AS t (tbl, col, kind)
        LOOP
            IF to_regclass(format('public.%I', r.tbl)) IS NULL
               OR NOT EXISTS (SELECT 1 FROM information_schema.columns
                              WHERE table_schema = 'public'
                              AND   table_name   = r.tbl
                              AND   column_name  = r.col) THEN
                RAISE NOTICE '%.% not found, skipped', r.tbl, r.col;
                CONTINUE;
            END IF;

            IF r.kind = 'id' THEN
                n := pg_temp.delete_rows(r.tbl, format('%I = %s', r.col, x."Id"));
            ELSE
                n := pg_temp.delete_rows(r.tbl, format('%I = %L', r.col, x."Code"));
            END IF;

            RAISE NOTICE '% : % row(s) removed', r.tbl, n;
        END LOOP;

        n := pg_temp.delete_rows('NavigationSubmenus', format('"Id" = %s', x."Id"));
        RAISE NOTICE 'NavigationSubmenus : % row(s) removed', n;
    END LOOP;
END
$$;


-- 3. Order : Dashboard 1, Customer Files 2, Configuration 3

UPDATE "NavigationSubmenus"
SET    "DisplayOrder" = CASE lower(split_part("Route", '/', 4))
                            WHEN 'customer-file-dashboard'     THEN 1
                            WHEN 'customer-files'              THEN 2
                            WHEN 'customer-file-configuration' THEN 3
                            ELSE "DisplayOrder"
                        END
WHERE  lower("Route") LIKE '/registration-management/customer-file/%';


-- 4. Check : three submenus left

SELECT s."Code", s."Name", s."Route", s."DisplayOrder", s."IsActive"
FROM   "NavigationSubmenus" s
WHERE  lower(s."Route") LIKE '/registration-management/customer-file/%'
ORDER  BY s."DisplayOrder";
