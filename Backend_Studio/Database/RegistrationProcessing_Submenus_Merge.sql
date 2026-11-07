-- =====================================================================
-- RegistrationProcessing_Submenus_Merge.sql   (2026-11-08)
-- ---------------------------------------------------------------------
-- Registration Management > Registration Processing :
--
--   Registration Fees Collection  ->  renamed  "Registration Fees"
--   Registration Fees Refunds     ->  removed  (now a part of
--                                     Registration Fees)
--   BRTA Payments                 ->  renamed  "Registration Payments"
--   Registration Files, Delivery Acknowledgements : unchanged
--
-- A rename changes Name, RouteKey and Route (no page is built yet).
-- The removed submenu goes for good with every row that points to
-- it (activity / special assignments and their permissions, sync
-- rows, page activities, system configurations).
-- Order after : Registration Fees 1, Registration Files 2,
-- Registration Payments 3, Delivery Acknowledgements 4.
--
-- Run the whole script (F5). Safe to run again. ASCII only.
-- =====================================================================

-- Clears a transaction left open by an earlier failed run in the
-- same pgAdmin tab (a harmless warning when there is none).
ROLLBACK;


-- 1. Preview

SELECT s."Id", s."Code", s."Name", s."RouteKey", s."Route", s."DisplayOrder"
FROM   "NavigationSubmenus" s
WHERE  lower(s."Route") LIKE '/registration-management/registration-processing/%'
ORDER  BY s."DisplayOrder";


-- 2. Remove "Registration Fees Refunds"
--    pg_temp.delete_rows deletes the matching rows after first
--    deleting every row that points to them by a foreign key.

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
        WHERE  lower("Route") LIKE '/registration-management/registration-processing/%'
          AND  lower(trim("Name")) IN ('registration fees refunds', 'registration fees refund')
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


-- 3. Renames (Name, RouteKey, Route)

DO $$
DECLARE
    v record;
    n bigint;
BEGIN
    FOR v IN
        SELECT * FROM (VALUES
            ('registration fees collection', 'Registration Fees',     'registration-fees'),
            ('brta payments',                'Registration Payments', 'registration-payments')
        ) AS t (old_name, new_name, new_key)
    LOOP
        -- Another submenu already on the new route : stop
        IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
                   WHERE lower("Route") = '/registration-management/registration-processing/' || v.new_key
                     AND lower(trim("Name")) <> lower(v.new_name)) THEN
            RAISE EXCEPTION 'Another submenu already uses the route key %. Stopped.', v.new_key;
        END IF;

        UPDATE "NavigationSubmenus"
        SET    "Name"     = v.new_name,
               "RouteKey" = v.new_key,
               "Route"    = '/registration-management/registration-processing/' || v.new_key
        WHERE  lower("Route") LIKE '/registration-management/registration-processing/%'
          AND  lower(trim("Name")) = v.old_name;

        GET DIAGNOSTICS n = ROW_COUNT;
        RAISE NOTICE '% -> % : % row(s)', v.old_name, v.new_name, n;
    END LOOP;
END
$$;


-- 4. Order

UPDATE "NavigationSubmenus"
SET    "DisplayOrder" = CASE lower("RouteKey")
                            WHEN 'registration-fees'         THEN 1
                            WHEN 'registration-files'        THEN 2
                            WHEN 'registration-payments'     THEN 3
                            WHEN 'delivery-acknowledgements' THEN 4
                            ELSE "DisplayOrder"
                        END
WHERE  lower("Route") LIKE '/registration-management/registration-processing/%';


-- 5. Check : four submenus

SELECT s."Code", s."Name", s."RouteKey", s."Route", s."DisplayOrder", s."IsActive"
FROM   "NavigationSubmenus" s
WHERE  lower(s."Route") LIKE '/registration-management/registration-processing/%'
ORDER  BY s."DisplayOrder";
