/*===============================================================
  One-off : delete EVERY Sales Invoice - MB (owner 2026-11-11, to
  test the new sale journal) with everything the invoices made,
  and put the bikes and stock back as before the sale.

  Found by the preview (2 invoices) :
    SIMB-010101-2627-11-00001 (RV-010101-2627-11-00001)
    SIMB-010101-2627-11-00002 (RV-010101-2627-11-00002)

  DELETES (rows of these invoices only) :
    VoucherEntries        invoice journals + receipt voucher journals
    ReceiptVoucher (+ ReceiptVoucherLines, ReceiptVoucherPayments)
    StockMovements / StockAllocations of the sale
    VatRegister           sale VAT rows
    BikeDeliveries (+ answers), SalesWarrantyRecords (+ parts)
    CustomerFiles         the files made by the invoices
    ActivityHistories     of the invoices and their files
    SalesInvoicesMb (+ Lines, Payments)
  PUTS BACK :
    StockBatches          quantity on hand, quantity out and value
                          of the batches the bikes came from
                          (Closed -> OnHand)
    MotorBikeUnits        Sold -> InStock

  STOPS, CHANGING NOTHING, when :
    - a customer file has a name transfer, a fee or a registration
    - a receipt payment is on a cheque / MFS / POS reconciliation
    - a Price Adjustment was released by an invoice
    - anything else still refers to an invoice / receipt number
      after the delete

  Invoice / receipt numbers are NOT reused (next sale takes the
  next number). Customers are kept.

  One transaction : any error and nothing changes.
  TAKE A BACKUP FIRST (pg_dump). Run the whole script (F5).
  ASCII only.
===============================================================*/

ROLLBACK;

BEGIN;

DO $$
DECLARE
    v_ids      bigint[];
    v_line_ids bigint[];
    v_unit_ids bigint[];
    v_nos      text[];
    v_rvs      text[];
    v_rv_ids   bigint[];
    v_docs     text[];
    v_like     text[];
    v_file_ids bigint[];
    v_bad      text;
    v_hits     bigint;
    v_col      record;
    n          integer;
BEGIN
    -- ---------- The invoices ----------
    SELECT array_agg(h."SalesInvoiceId"),
           array_agg(h."InvoiceNo") FILTER (WHERE COALESCE(h."InvoiceNo", '') <> ''),
           array_agg(h."ReceiptVoucherNo") FILTER (WHERE COALESCE(h."ReceiptVoucherNo", '') <> '')
    INTO   v_ids, v_nos, v_rvs
    FROM   public."SalesInvoicesMb" h;

    IF v_ids IS NULL THEN
        RAISE NOTICE 'No MB sales invoices - nothing to do.';
        RETURN;
    END IF;

    v_nos  := COALESCE(v_nos, ARRAY[]::text[]);
    v_rvs  := COALESCE(v_rvs, ARRAY[]::text[]);
    v_docs := v_nos || v_rvs;

    SELECT array_agg(x || '/%') INTO v_like FROM unnest(v_nos) x;
    v_like := COALESCE(v_like, ARRAY[]::text[]);

    RAISE NOTICE 'Invoices to delete (%): %', cardinality(v_nos), array_to_string(v_nos, ', ');
    RAISE NOTICE 'Receipt vouchers to delete (%): %', cardinality(v_rvs), array_to_string(v_rvs, ', ');

    SELECT array_agg(l."SalesInvoiceLineId"), array_agg(l."MotorBikeUnitId") FILTER (WHERE l."MotorBikeUnitId" IS NOT NULL)
    INTO   v_line_ids, v_unit_ids
    FROM   public."SalesInvoicesMbLines" l
    WHERE  l."SalesInvoiceId" = ANY (v_ids);

    v_line_ids := COALESCE(v_line_ids, ARRAY[]::bigint[]);
    v_unit_ids := COALESCE(v_unit_ids, ARRAY[]::bigint[]);

    SELECT array_agg(r."ReceiptVoucherId")
    INTO   v_rv_ids
    FROM   public."ReceiptVoucher" r
    WHERE  r."VoucherNo" = ANY (v_rvs);

    v_rv_ids := COALESCE(v_rv_ids, ARRAY[]::bigint[]);

    IF to_regclass('public."CustomerFiles"') IS NOT NULL THEN
        SELECT array_agg(f."CustomerFileId")
        INTO   v_file_ids
        FROM   public."CustomerFiles" f
        WHERE  f."SalesInvoiceNo" = ANY (v_nos) OR f."CustomerFileNo" LIKE ANY (v_like);
    END IF;

    v_file_ids := COALESCE(v_file_ids, ARRAY[]::bigint[]);

    -- ---------- Guards ----------

    IF cardinality(v_file_ids) > 0 THEN
        IF to_regclass('public."CustomerFileNameTransfers"') IS NOT NULL
           AND EXISTS (SELECT 1 FROM public."CustomerFileNameTransfers" WHERE "CustomerFileId" = ANY (v_file_ids)) THEN
            RAISE EXCEPTION 'A customer file of these invoices has a name transfer - nothing changed.';
        END IF;

        IF to_regclass('public."CustomerFileFees"') IS NOT NULL
           AND EXISTS (SELECT 1 FROM public."CustomerFileFees" WHERE "CustomerFileId" = ANY (v_file_ids)) THEN
            RAISE EXCEPTION 'A customer file of these invoices has a fee collected - nothing changed.';
        END IF;
    END IF;

    -- Any table (other than the ones cleaned here) pointing at the
    -- files or receipt payments by id
    FOR v_col IN
        SELECT c.table_name, c.column_name
        FROM   information_schema.columns c
        JOIN   information_schema.tables t
               ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
        WHERE  c.table_schema = 'public'
        AND    c.column_name IN ('CustomerFileId', 'ReceiptVoucherId', 'ReceiptVoucherPaymentId')
        AND    c.table_name NOT IN ('CustomerFiles', 'ReceiptVoucher', 'ReceiptVoucherPayments', 'ReceiptVoucherLines', 'SalesInvoicesMb')
    LOOP
        IF v_col.column_name = 'CustomerFileId' THEN
            EXECUTE format('SELECT count(*) FROM public.%I WHERE %I = ANY ($1)', v_col.table_name, v_col.column_name)
            INTO v_hits USING v_file_ids;
        ELSIF v_col.column_name = 'ReceiptVoucherId' THEN
            EXECUTE format('SELECT count(*) FROM public.%I WHERE %I = ANY ($1)', v_col.table_name, v_col.column_name)
            INTO v_hits USING v_rv_ids;
        ELSE
            EXECUTE format('SELECT count(*) FROM public.%I WHERE %I IN (SELECT "ReceiptVoucherPaymentId" FROM public."ReceiptVoucherPayments" WHERE "ReceiptVoucherId" = ANY ($1))',
                           v_col.table_name, v_col.column_name)
            INTO v_hits USING v_rv_ids;
        END IF;

        IF v_hits > 0 THEN
            RAISE EXCEPTION '% row(s) of %.% still use these customer files / receipts - nothing changed. Tell Claude.',
                v_hits, v_col.table_name, v_col.column_name;
        END IF;
    END LOOP;

    IF to_regclass('public."PriceAdjustmentReleases"') IS NOT NULL
       AND EXISTS (SELECT 1 FROM public."PriceAdjustmentReleases" WHERE "SourceNo" = ANY (v_nos)) THEN
        RAISE EXCEPTION 'An invoice released a Price Adjustment - nothing changed. Tell Claude.';
    END IF;

    -- ---------- Stock back to the batches ----------

    CREATE TEMP TABLE tmp_si_back ON COMMIT DROP AS
    SELECT m."StockBatchId" AS batch_id,
           sum(m."QuantityOut" - m."QuantityIn") AS qty,
           sum(CASE WHEN m."QuantityOut" > 0 THEN m."Value" ELSE -m."Value" END) AS val
    FROM   public."StockMovements" m
    WHERE  m."DocumentNo" = ANY (v_nos)
    GROUP  BY m."StockBatchId";

    UPDATE public."StockBatches" b
    SET    "QuantityOnHand" = b."QuantityOnHand" + t.qty,
           "QuantityOut"    = b."QuantityOut" - t.qty,
           "RemainingValue" = b."RemainingValue" + t.val,
           "Status"         = CASE WHEN b."Status" = 'Closed' AND b."QuantityOnHand" + t.qty > 0 THEN 'OnHand' ELSE b."Status" END,
           "ModifiedDate"   = now()
    FROM   tmp_si_back t
    WHERE  b."StockBatchId" = t.batch_id
    AND    t.qty <> 0;
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'StockBatches given back : %', n;

    DELETE FROM public."StockMovements" WHERE "DocumentNo" = ANY (v_nos);
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'StockMovements : %', n;

    IF to_regclass('public."StockAllocations"') IS NOT NULL THEN
        DELETE FROM public."StockAllocations"
        WHERE  "DocumentId" = ANY (v_ids) AND "DocumentLineId" = ANY (v_line_ids);
        GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'StockAllocations : %', n;
    END IF;

    -- ---------- Bikes back in stock ----------

    IF cardinality(v_unit_ids) > 0 THEN
        UPDATE public."MotorBikeUnits"
        SET    "Status" = 'InStock', "ModifiedDate" = now()
        WHERE  "MotorBikeUnitId" = ANY (v_unit_ids)
        AND    "Status" <> 'InStock';
        GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'MotorBikeUnits back in stock : %', n;
    END IF;

    -- ---------- Journals, VAT, receipts ----------

    DELETE FROM public."VoucherEntries" WHERE "VoucherNo" = ANY (v_docs);
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'VoucherEntries : %', n;

    DELETE FROM public."VatRegister" WHERE "DocumentNo" = ANY (v_nos);
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'VatRegister : %', n;

    IF cardinality(v_rv_ids) > 0 THEN
        DELETE FROM public."ReceiptVoucherPayments" WHERE "ReceiptVoucherId" = ANY (v_rv_ids);
        GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'ReceiptVoucherPayments : %', n;

        IF to_regclass('public."ReceiptVoucherLines"') IS NOT NULL THEN
            DELETE FROM public."ReceiptVoucherLines" WHERE "ReceiptVoucherId" = ANY (v_rv_ids);
            GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'ReceiptVoucherLines : %', n;
        END IF;

        DELETE FROM public."ReceiptVoucher" WHERE "ReceiptVoucherId" = ANY (v_rv_ids);
        GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'ReceiptVoucher : %', n;
    END IF;

    -- ---------- Deliveries, warranty, customer files ----------

    IF to_regclass('public."SalesWarrantyRecords"') IS NOT NULL THEN
        IF to_regclass('public."SalesWarrantyRecordParts"') IS NOT NULL THEN
            DELETE FROM public."SalesWarrantyRecordParts" p
            USING  public."SalesWarrantyRecords" r
            WHERE  p."SalesWarrantyRecordId" = r."SalesWarrantyRecordId"
            AND    r."SalesInvoiceNo" = ANY (v_nos);
        END IF;

        DELETE FROM public."SalesWarrantyRecords" WHERE "SalesInvoiceNo" = ANY (v_nos);
        GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'SalesWarrantyRecords : %', n;
    END IF;

    IF to_regclass('public."BikeDeliveries"') IS NOT NULL THEN
        IF to_regclass('public."BikeDeliveryAnswers"') IS NOT NULL THEN
            DELETE FROM public."BikeDeliveryAnswers" a
            USING  public."BikeDeliveries" d
            WHERE  a."BikeDeliveryId" = d."BikeDeliveryId"
            AND    d."SalesInvoiceId" = ANY (v_ids);
        END IF;

        DELETE FROM public."BikeDeliveries" WHERE "SalesInvoiceId" = ANY (v_ids);
        GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'BikeDeliveries : %', n;
    END IF;

    IF cardinality(v_file_ids) > 0 THEN
        DELETE FROM public."CustomerFiles" WHERE "CustomerFileId" = ANY (v_file_ids);
        GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'CustomerFiles : %', n;
    END IF;

    -- ---------- History ----------

    DELETE FROM public."ActivityHistories"
    WHERE  ("EntityName" = 'SalesInvoicesMB' AND "EntityId" = ANY (v_ids))
    OR     ("EntityName" = 'CustomerFile' AND "EntityId" = ANY (v_file_ids))
    OR     "ActivityDescription" = ANY (v_docs)
    OR     "ActivityDescription" LIKE ANY (v_like);
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'ActivityHistories : %', n;

    -- ---------- The invoices ----------

    DELETE FROM public."SalesInvoicesMbPayments" WHERE "SalesInvoiceId" = ANY (v_ids);
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'SalesInvoicesMbPayments : %', n;

    DELETE FROM public."SalesInvoicesMbLines" WHERE "SalesInvoiceId" = ANY (v_ids);
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'SalesInvoicesMbLines : %', n;

    DELETE FROM public."SalesInvoicesMb" WHERE "SalesInvoiceId" = ANY (v_ids);
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'SalesInvoicesMb : %', n;

    -- ---------- Nothing may still refer to them ----------

    FOR v_col IN
        SELECT c.table_name, c.column_name
        FROM   information_schema.columns c
        JOIN   information_schema.tables t
               ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
        WHERE  c.table_schema = 'public'
        AND    c.data_type IN ('character varying', 'text', 'character')
    LOOP
        EXECUTE format('SELECT count(*) FROM public.%I WHERE %I = ANY ($1) OR %I LIKE ANY ($2)',
                       v_col.table_name, v_col.column_name, v_col.column_name)
        INTO v_hits USING v_docs, v_like;

        IF v_hits > 0 THEN
            RAISE EXCEPTION '% row(s) of %.% still refer to these invoices / receipts - nothing changed. Tell Claude.',
                v_hits, v_col.table_name, v_col.column_name;
        END IF;
    END LOOP;

    RAISE NOTICE 'Done : all MB sales invoices deleted, bikes and stock back.';
END $$;

-- Check : no MB invoice left; the bikes are back in stock
SELECT count(*) AS "MB invoices left" FROM public."SalesInvoicesMb";

COMMIT;
