/*===============================================================
  Brand_Pack_Map.sql   (2026-11-20) : READ ONLY, changes nothing.

  Maps which tables hold brand data in AppCoreERP_Studio, for the
  brand-pack install (phase 2). Query Tool on AppCoreERP_Studio,
  the whole file (F5). Then in Data Output : click the top-left
  corner cell (selects all), Ctrl+C, paste into Notepad, save as
  Brand_Pack_Map.txt in F:\AppCore_ERP_Studio\Backend_Studio\Database
  and tell Claude. ASCII only.
===============================================================*/

WITH RECURSIVE
-- tables that point (by foreign key) to the brand, its models, its
-- policies ... and the tables those point to, 4 levels deep
fk AS (
    SELECT c.conrelid::regclass::text  AS child,
           c.confrelid::regclass::text AS parent,
           (SELECT string_agg(a.attname, ',') FROM unnest(c.conkey) k
              JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k) AS child_cols
    FROM   pg_constraint c
    WHERE  c.contype = 'f' AND c.connamespace = 'public'::regnamespace
),
seed AS (
    SELECT unnest(ARRAY['"BrandManagements"','"BikeModels"','"MotorBikes"','"ServicePolicies"',
                        '"ColorManagements"','"MotorBikeSpecifications"','"WarrantyPolicies"',
                        '"LaborCharts"','"ScheduledServices"','"PdiTemplates"']) AS t
),
tree(t, lvl) AS (
    SELECT t, 0 FROM seed
    UNION
    SELECT fk.child, tree.lvl + 1 FROM fk JOIN tree ON fk.parent = tree.t WHERE tree.lvl < 4
),
-- also tables with a brand / model / policy column but no foreign key
named AS (
    SELECT DISTINCT format('%I', table_name) AS t
    FROM   information_schema.columns
    WHERE  table_schema = 'public'
    AND    column_name IN ('BrandManagementId','BrandId','BikeModelId','MotorBikeId','ServicePolicyId',
                           'ColorManagementId','WarrantyPolicyId','ServiceCategoryId','ServiceSubCategoryId',
                           'MotorBikeSpecificationId','PdiTemplateId','LaborChartId')
),
tables AS (
    SELECT t FROM tree UNION SELECT t FROM named
)
SELECT tb.t AS "Table",
       (SELECT count(*) FROM pg_class x WHERE x.oid = tb.t::regclass) AS "_",
       (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %s', tb.t), false, true, '')))[1]::text::int AS "Rows",
       (SELECT string_agg(format('%s %s%s', a.attname, format_type(a.atttypid, a.atttypmod),
                                 CASE WHEN a.attnotnull THEN ' NN' ELSE '' END), ', ' ORDER BY a.attnum)
        FROM pg_attribute a WHERE a.attrelid = tb.t::regclass AND a.attnum > 0 AND NOT a.attisdropped) AS "Columns",
       (SELECT string_agg(fk.child_cols || ' -> ' || fk.parent, '; ') FROM fk WHERE fk.child = tb.t) AS "Points to",
       (SELECT string_agg(i.indexrelid::regclass::text || CASE WHEN i.indisunique THEN ' UNIQUE(' ELSE ' (' END
                          || pg_get_indexdef(i.indexrelid) || ')', '; ')
        FROM pg_index i WHERE i.indrelid = tb.t::regclass AND NOT i.indisprimary) AS "Indexes"
FROM   tables tb
WHERE  to_regclass(tb.t) IS NOT NULL
ORDER  BY 1;
