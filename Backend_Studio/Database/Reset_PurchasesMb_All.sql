/*===============================================================
  One-off reset : delete EVERY Motor Bike purchase (Purchases - MB,
  any status, any branch) with everything it made, and put their
  Purchase Orders back as they were before billing.
  (owner request 2026-11-10)

  DELETES (rows of the MB purchases only) :
    PurchasesMb, PurchasesMbLines
    MotorBikeReceiving (+ Lines)  (the receivings of these
                                   purchases, RCMB-...)
    BarcodePrintRuns (+ Lines)    (labels printed from these
                                   documents / for these bikes)
    MotorBikeUnits                (bikes entered on the Unit Desk)
    StockBatches, StockMovements  (the purchase's bike stock, and
                                   the free accessories received
                                   on the purchase)
    VatRegister                   (purchase VAT lines)
    ProductPriceIndex             (MRP entries from the purchases)
    VoucherEntries                (the purchase journals, PIMB-...)
    PurchaseAccessoryDues / Receipts / Takes (free accessories)
    ActivityHistories             (the purchases' history)

  PURCHASE ORDERS - MB : every PO line's Billed Quantity -> 0 (no
  MB purchase is left), and an order closed by billing (Completed,
  or Closed Short "Balance not carried") goes back to Placed (or
  Approved when it was never placed). Cancelled / closed by hand
  orders are not touched.

  STOPS, CHANGING NOTHING, when :
    - a bike of these purchases is Sold / Returned / Transferred,
      or its chassis no is used anywhere else (sales, CKD, ...)
    - any of the stock went out, is allocated, or has a movement
      from another document (transfer, sale ...); the purchases'
      own Motor Bike Receivings are deleted with them
    - free accessories were received on a separate Accessories
      Receiving that is not cancelled
    - another document still refers to a purchase number
    - a supplier's payable would go below zero (payments were
      made against these purchases)

  Purchase numbers are NOT reused : the next MB purchase takes the
  next number of its branch counter.

  One transaction : any error and nothing changes.
  TAKE A BACKUP FIRST (pg_dump). Run the whole script (F5).
  ASCII only.
===============================================================*/

BEGIN;

DO $$
DECLARE
    v_ids        bigint[];
    v_nos        text[];
    v_recv_ids   bigint[];
    v_recv_nos   text[];
    v_docs       text[];
    v_batches    bigint[];
    v_chassis    text[];
    v_bad        text;
    v_col        record;
    v_hits       bigint;
    n            integer;
    v_cleaned    text[] := ARRAY
    [
        'purchasesmb', 'purchasesmblines', 'motorbikeunits',
        'stockbatches', 'stockmovements', 'vatregister',
        'productpriceindex', 'voucherentries',
        'purchaseaccessorydues', 'purchaseaccessoryreceipts',
        'purchaseaccessorytakes', 'activityhistories',
        'motorbikereceiving', 'motorbikereceivinglines',
        'barcodeprintrunlines', 'barcodeprintruns'
    ];
BEGIN
    -- ---------- Tables needed ----------
    IF to_regclass('public."PurchasesMb"') IS NULL
       OR to_regclass('public."PurchasesMbLines"') IS NULL
       OR to_regclass('public."PurchaseOrdersMb"') IS NULL
       OR to_regclass('public."PurchaseOrdersMbLines"') IS NULL
       OR to_regclass('public."StockBatches"') IS NULL
       OR to_regclass('public."StockMovements"') IS NULL
       OR to_regclass('public."VoucherEntries"') IS NULL
    THEN
        RAISE EXCEPTION 'A purchase / PO / stock / voucher table was not found - nothing changed. Tell Claude.';
    END IF;

    -- ---------- The purchases ----------
    SELECT array_agg("PurchaseId"), array_agg("PurchaseNo")
    INTO   v_ids, v_nos
    FROM   public."PurchasesMb";

    IF v_ids IS NULL THEN
        RAISE NOTICE 'No MB purchases - nothing to do.';
        RETURN;
    END IF;

    RAISE NOTICE 'MB purchases to delete (%): %', cardinality(v_nos), array_to_string(v_nos, ', ');

    -- Their Motor Bike Receivings (any status)
    IF to_regclass('public."MotorBikeReceiving"') IS NOT NULL THEN
        SELECT array_agg(r."ReceivingId"), array_agg(r."ReceivingNo")
        INTO   v_recv_ids, v_recv_nos
        FROM   public."MotorBikeReceiving" r
        WHERE  r."PurchaseId" = ANY (v_ids);
    END IF;

    v_recv_ids := COALESCE(v_recv_ids, ARRAY[]::bigint[]);
    v_recv_nos := COALESCE(v_recv_nos, ARRAY[]::text[]);
    v_docs     := v_nos || v_recv_nos;

    RAISE NOTICE 'Motor bike receivings to delete (%): %', cardinality(v_recv_nos), array_to_string(v_recv_nos, ', ');

    -- Their stock : bike batches + free accessory batches received
    -- on the purchase
    SELECT array_agg(b."StockBatchId")
    INTO   v_batches
    FROM   public."StockBatches" b
    WHERE  (b."SourceType" = 'Purchase' AND b."ProductType" = 'MB' AND b."SourceId" = ANY (v_ids))
    OR     (b."SourceType" = 'AccessoryScheme' AND b."SourceNo" = ANY (v_docs));

    v_batches := COALESCE(v_batches, ARRAY[]::bigint[]);

    -- ---------- Guards ----------

    -- Bikes sold / returned / transferred
    IF to_regclass('public."MotorBikeUnits"') IS NOT NULL THEN
        SELECT string_agg(u."ChassisNo" || ' (' || u."Status" || ')', ', ')
        INTO   v_bad
        FROM   public."MotorBikeUnits" u
        WHERE  u."PurchaseId" = ANY (v_ids)
        AND    NOT u."IsDeleted"
        AND    u."Status" NOT IN ('Pending', 'InStock');

        IF v_bad IS NOT NULL THEN
            RAISE EXCEPTION 'Bikes of these purchases are no longer in stock: % - nothing changed.', v_bad;
        END IF;

        SELECT array_agg(upper(u."ChassisNo"))
        INTO   v_chassis
        FROM   public."MotorBikeUnits" u
        WHERE  u."PurchaseId" = ANY (v_ids);
    END IF;

    v_chassis := COALESCE(v_chassis, ARRAY[]::text[]);

    -- Stock out / allocated / moved by another document
    SELECT string_agg(DISTINCT b."BatchNo", ', ')
    INTO   v_bad
    FROM   public."StockBatches" b
    WHERE  b."StockBatchId" = ANY (v_batches)
    AND    b."QuantityOut" > 0;

    IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'Stock of these purchases already went out (batches %) - nothing changed.', v_bad;
    END IF;

    SELECT string_agg(DISTINCT m."DocumentNo" || ' ' || m."MovementType", ', ')
    INTO   v_bad
    FROM   public."StockMovements" m
    WHERE  m."StockBatchId" = ANY (v_batches)
    AND    NOT (m."DocumentNo" = ANY (v_docs));

    IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'Other documents moved the stock of these purchases (%) - cancel them first - nothing changed.', v_bad;
    END IF;

    IF to_regclass('public."StockAllocations"') IS NOT NULL THEN
        SELECT count(*) INTO v_hits
        FROM   public."StockAllocations" a
        WHERE  a."StockBatchId" = ANY (v_batches);

        IF v_hits > 0 THEN
            RAISE EXCEPTION 'Stock of these purchases is allocated to % document line(s) - nothing changed.', v_hits;
        END IF;
    END IF;

    -- Free accessories received on a separate receiving
    IF to_regclass('public."PurchaseAccessoryReceipts"') IS NOT NULL THEN
        SELECT string_agg(DISTINCT r."ReceivingNo", ', ')
        INTO   v_bad
        FROM   public."PurchaseAccessoryReceipts" r
        WHERE  r."PurchaseId" = ANY (v_ids)
        AND    r."ReceivedOn" <> 'Purchase'
        AND    NOT r."IsCancelled"
        AND    NOT (r."ReceivingNo" = ANY (v_recv_nos));

        IF v_bad IS NOT NULL THEN
            RAISE EXCEPTION 'Free accessories of these purchases were received on % - cancel that receiving first - nothing changed.', v_bad;
        END IF;
    END IF;

    -- Another voucher refers to a purchase number (ReferenceNo)
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'VoucherEntries' AND column_name = 'ReferenceNo')
    THEN
        SELECT string_agg(DISTINCT e."VoucherNo", ', ')
        INTO   v_bad
        FROM   public."VoucherEntries" e
        WHERE  e."ReferenceNo" = ANY (v_docs)
        AND    NOT (e."VoucherNo" = ANY (v_docs));

        IF v_bad IS NOT NULL THEN
            RAISE EXCEPTION 'Vouchers % refer to these purchases - reverse them first - nothing changed.', v_bad;
        END IF;
    END IF;

    -- Any other table holding a purchase number or a chassis no
    FOR v_col IN
        SELECT c.table_name, c.column_name
        FROM   information_schema.columns c
        JOIN   information_schema.tables t
               ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
        WHERE  c.table_schema = 'public'
        AND    c.data_type IN ('character varying', 'text', 'character')
        AND    c.column_name IN ('PurchaseNo', 'SourceNo', 'DocumentNo', 'ReferenceNo', 'VoucherNo', 'BillNo', 'ChassisNo')
        AND    NOT (lower(c.table_name) = ANY (v_cleaned))
    LOOP
        IF v_col.column_name = 'ChassisNo' THEN
            IF cardinality(v_chassis) = 0 THEN
                CONTINUE;
            END IF;

            EXECUTE format('SELECT count(*) FROM public.%I WHERE upper(%I) = ANY ($1)', v_col.table_name, v_col.column_name)
            INTO v_hits USING v_chassis;
        ELSE
            EXECUTE format('SELECT count(*) FROM public.%I WHERE %I = ANY ($1)', v_col.table_name, v_col.column_name)
            INTO v_hits USING v_docs;
        END IF;

        IF v_hits > 0 THEN
            RAISE EXCEPTION '% row(s) of %.% still refer to these purchases / their bikes - nothing changed. Tell Claude.',
                v_hits, v_col.table_name, v_col.column_name;
        END IF;
    END LOOP;

    -- Supplier payable must not go below zero (payments made)
    SELECT string_agg(x."LedgerCode" || ' would be ' || to_char(x.after_bal, 'FM999,999,999,990.00'), ', ')
    INTO   v_bad
    FROM
    (
        SELECT l."LedgerCode",
               (SELECT COALESCE(sum(o."Credit" - o."Debit"), 0)
                FROM   public."VoucherEntries" o
                WHERE  o."LedgerCode" = l."LedgerCode"
                AND    NOT (o."VoucherNo" = ANY (v_nos))) AS after_bal
        FROM
        (
            SELECT DISTINCT e."LedgerCode"
            FROM   public."VoucherEntries" e
            WHERE  e."VoucherNo" = ANY (v_nos)
            AND    e."PartyType" = 'Supplier'
        ) l
    ) x
    WHERE  x.after_bal < 0;

    IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'Supplier payable would go below zero (%): payments were made against these purchases; reverse them first - nothing changed.', v_bad;
    END IF;

    -- ---------- Delete ----------

    -- Labels printed for these purchases / bikes (print history
    -- only) : runs made from these documents go whole; lines of
    -- these bikes / batches go from other runs; a run left empty
    -- goes too
    IF to_regclass('public."BarcodePrintRuns"') IS NOT NULL
       AND to_regclass('public."BarcodePrintRunLines"') IS NOT NULL
    THEN
        CREATE TEMP TABLE tmp_reset_runs ON COMMIT DROP AS
        SELECT DISTINCT l."BarcodePrintRunId" AS run_id
        FROM   public."BarcodePrintRunLines" l
        WHERE  upper(l."ChassisNo") = ANY (v_chassis)
        OR     l."StockBatchId" = ANY (v_batches);

        DELETE FROM public."BarcodePrintRuns" WHERE "SourceNo" = ANY (v_docs);
        GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'BarcodePrintRuns of these documents : %', n;

        DELETE FROM public."BarcodePrintRunLines"
        WHERE  upper("ChassisNo") = ANY (v_chassis)
        OR     "StockBatchId" = ANY (v_batches);
        GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'BarcodePrintRunLines of these bikes : %', n;

        DELETE FROM public."BarcodePrintRuns" r
        WHERE  r."BarcodePrintRunId" IN (SELECT run_id FROM tmp_reset_runs)
        AND    NOT EXISTS (SELECT 1 FROM public."BarcodePrintRunLines" l
                           WHERE l."BarcodePrintRunId" = r."BarcodePrintRunId");
        GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'BarcodePrintRuns left empty : %', n;
    END IF;

    DELETE FROM public."VoucherEntries" WHERE "VoucherNo" = ANY (v_docs);
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'VoucherEntries : %', n;

    IF to_regclass('public."VatRegister"') IS NOT NULL THEN
        DELETE FROM public."VatRegister" WHERE "DocumentNo" = ANY (v_docs);
        GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'VatRegister : %', n;
    END IF;

    DELETE FROM public."StockMovements"
    WHERE  "StockBatchId" = ANY (v_batches) OR "DocumentNo" = ANY (v_docs);
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'StockMovements : %', n;

    IF to_regclass('public."PurchaseAccessoryReceipts"') IS NOT NULL THEN
        DELETE FROM public."PurchaseAccessoryReceipts" WHERE "PurchaseId" = ANY (v_ids);
        GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'PurchaseAccessoryReceipts : %', n;
    END IF;

    DELETE FROM public."StockBatches" WHERE "StockBatchId" = ANY (v_batches);
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'StockBatches : %', n;

    IF to_regclass('public."ProductPriceIndex"') IS NOT NULL THEN
        DELETE FROM public."ProductPriceIndex"
        WHERE  "SourceType" = 'Purchase' AND "ProductType" = 'MB' AND "SourceNo" = ANY (v_nos);
        GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'ProductPriceIndex : %', n;
    END IF;

    IF to_regclass('public."PurchaseAccessoryDues"') IS NOT NULL THEN
        DELETE FROM public."PurchaseAccessoryDues" WHERE "PurchaseId" = ANY (v_ids);
        GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'PurchaseAccessoryDues : %', n;
    END IF;

    IF to_regclass('public."PurchaseAccessoryTakes"') IS NOT NULL THEN
        DELETE FROM public."PurchaseAccessoryTakes" WHERE "PurchaseId" = ANY (v_ids);
        GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'PurchaseAccessoryTakes : %', n;
    END IF;

    IF to_regclass('public."MotorBikeUnits"') IS NOT NULL THEN
        DELETE FROM public."MotorBikeUnits" WHERE "PurchaseId" = ANY (v_ids);
        GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'MotorBikeUnits : %', n;
    END IF;

    IF cardinality(v_recv_ids) > 0 THEN
        IF to_regclass('public."MotorBikeReceivingLines"') IS NOT NULL THEN
            DELETE FROM public."MotorBikeReceivingLines" WHERE "ReceivingId" = ANY (v_recv_ids);
            GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'MotorBikeReceivingLines : %', n;
        END IF;

        DELETE FROM public."MotorBikeReceiving" WHERE "ReceivingId" = ANY (v_recv_ids);
        GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'MotorBikeReceiving : %', n;
    END IF;

    DELETE FROM public."PurchasesMbLines" WHERE "PurchaseId" = ANY (v_ids);
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'PurchasesMbLines : %', n;

    DELETE FROM public."PurchasesMb" WHERE "PurchaseId" = ANY (v_ids);
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'PurchasesMb : %', n;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'ActivityHistories' AND column_name = 'EntityName')
    THEN
        DELETE FROM public."ActivityHistories"
        WHERE  ("EntityName" = 'PurchaseMB' AND "EntityId" = ANY (v_ids))
        OR     ("EntityName" = 'ReceivingMB' AND "EntityId" = ANY (v_recv_ids));
        GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'ActivityHistories : %', n;
    END IF;

    -- ---------- Purchase Orders back to before billing ----------

    UPDATE public."PurchaseOrdersMbLines"
    SET    "BilledQuantity" = 0
    WHERE  "BilledQuantity" <> 0;
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'PO lines billed -> 0 : %', n;

    UPDATE public."PurchaseOrdersMb"
    SET    "Status"       = CASE WHEN "PlacedDate" IS NOT NULL THEN 'Placed' ELSE 'Approved' END,
           "CloseReason"  = '',
           "ClosedBy"     = NULL,
           "ClosedDate"   = NULL,
           "ModifiedDate" = now()
    WHERE  NOT "IsDeleted"
    AND    (
               "Status" = 'Completed'
            OR ("Status" = 'Closed Short' AND COALESCE("CloseReason", '') LIKE 'Balance not carried%')
           );
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'Purchase orders reopened : %', n;
END $$;

-- Check : no MB purchase left; the orders and their open quantity
SELECT count(*) AS "MB purchases left" FROM public."PurchasesMb";

SELECT o."OrderNo", o."Status",
       sum(l."Quantity" + l."FreeQuantity") AS "Ordered",
       sum(l."BilledQuantity")              AS "Billed"
FROM   public."PurchaseOrdersMb" o
JOIN   public."PurchaseOrdersMbLines" l ON l."PurchaseOrderId" = o."PurchaseOrderId"
WHERE  NOT o."IsDeleted"
GROUP  BY o."OrderNo", o."Status"
ORDER  BY o."OrderNo";

COMMIT;
