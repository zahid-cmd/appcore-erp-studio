/*===============================================================
  One-off : delete the MB purchase orders created by user 5
  (Zahid, Md. Zahidul Hoque) - POMB-010201-2526-12-00001 .. 00004
  (owner request 2026-11-10). Orders created by other users are
  not touched.

  DELETES : PurchaseOrdersMb + PurchaseOrdersMbLines of those
  orders, and their ActivityHistories rows.

  STOPS, CHANGING NOTHING, when a purchase (any status) still
  points at one of them, or another table still holds their
  order number.

  One transaction. If it stops, run ROLLBACK; before trying again.
  Run the whole script (F5). ASCII only.
===============================================================*/

BEGIN;

DO $$
DECLARE
    v_ids     bigint[];
    v_nos     text[];
    v_bad     text;
    v_col     record;
    v_hits    bigint;
    n         integer;
BEGIN
    SELECT array_agg("PurchaseOrderId" ORDER BY "PurchaseOrderId"),
           array_agg("OrderNo" ORDER BY "PurchaseOrderId")
    INTO   v_ids, v_nos
    FROM   public."PurchaseOrdersMb"
    WHERE  "CreatedBy" = 5;

    IF v_ids IS NULL THEN
        RAISE NOTICE 'No MB purchase orders created by user 5 - nothing to do.';
        RETURN;
    END IF;

    RAISE NOTICE 'Orders to delete (%): %', cardinality(v_nos), array_to_string(v_nos, ', ');

    -- A purchase still billed against one of them
    SELECT string_agg(p."PurchaseNo", ', ')
    INTO   v_bad
    FROM   public."PurchasesMb" p
    WHERE  p."PurchaseOrderId" = ANY (v_ids);

    IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'Purchases % still point at these orders - nothing changed.', v_bad;
    END IF;

    -- Any other table holding one of the order numbers
    FOR v_col IN
        SELECT c.table_name, c.column_name
        FROM   information_schema.columns c
        JOIN   information_schema.tables t
               ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
        WHERE  c.table_schema = 'public'
        AND    c.data_type IN ('character varying', 'text', 'character')
        AND    c.column_name IN ('OrderNo', 'PurchaseOrderNo', 'SourceNo', 'DocumentNo', 'ReferenceNo', 'VoucherNo')
        AND    lower(c.table_name) NOT IN ('purchaseordersmb', 'activityhistories')
    LOOP
        EXECUTE format('SELECT count(*) FROM public.%I WHERE %I = ANY ($1)', v_col.table_name, v_col.column_name)
        INTO v_hits USING v_nos;

        IF v_hits > 0 THEN
            RAISE EXCEPTION '% row(s) of %.% still refer to these orders - nothing changed. Tell Claude.',
                v_hits, v_col.table_name, v_col.column_name;
        END IF;
    END LOOP;

    -- Delete
    DELETE FROM public."PurchaseOrdersMbLines" WHERE "PurchaseOrderId" = ANY (v_ids);
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'PurchaseOrdersMbLines : %', n;

    DELETE FROM public."PurchaseOrdersMb" WHERE "PurchaseOrderId" = ANY (v_ids);
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'PurchaseOrdersMb : %', n;

    DELETE FROM public."ActivityHistories"
    WHERE  "EntityName" = 'PurchaseOrderMB' AND "EntityId" = ANY (v_ids);
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'ActivityHistories : %', n;
END $$;

-- Check : what is left, by creator
SELECT o."CreatedBy", count(*) AS "Orders", min(o."OrderNo") AS "First", max(o."OrderNo") AS "Last"
FROM   public."PurchaseOrdersMb" o
GROUP  BY o."CreatedBy"
ORDER  BY o."CreatedBy";

COMMIT;
