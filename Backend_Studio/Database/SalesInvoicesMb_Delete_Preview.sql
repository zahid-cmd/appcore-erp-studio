/*===============================================================
  PREVIEW ONLY (changes nothing) : Sales Invoices - MB and every
  record that refers to them.  (owner request 2026-11-11)

  Run the whole file (F5) and send Claude the Messages tab text
  (every hit is listed there too) or the Data Output grid.

  Looks for, in every table of the database :
    - the MB invoice numbers (SIMB-...) and anything starting with
      them (customer files SIMB-.../1, ...)
    - their Receipt Voucher numbers and registration reversal
      Journal Voucher numbers
    - the chassis numbers sold on them
  ASCII only.
===============================================================*/

DROP TABLE IF EXISTS tmp_si_hits;

CREATE TEMP TABLE tmp_si_hits
(
    kind        text,
    table_name  text,
    column_name text,
    rows_found  bigint
);

DO $$
DECLARE
    v_nos     text[];
    v_rvs     text[];
    v_jvs     text[];
    v_docs    text[];
    v_like    text[];
    v_chassis text[];
    v_col     record;
    v_hits    bigint;
    v_row     record;
BEGIN
    IF to_regclass('public."SalesInvoicesMb"') IS NULL THEN
        RAISE EXCEPTION 'Table SalesInvoicesMb not found.';
    END IF;

    FOR v_row IN
        SELECT h."InvoiceNo", h."InvoiceDate", h."Status", h."CustomerName",
               COALESCE(h."ReceiptVoucherNo", '') AS rv
        FROM   public."SalesInvoicesMb" h
        ORDER  BY h."SalesInvoiceId"
    LOOP
        RAISE NOTICE 'Invoice % | % | % | % | RV %',
            v_row."InvoiceNo", v_row."InvoiceDate", v_row."Status", v_row."CustomerName", v_row.rv;
    END LOOP;

    SELECT array_agg(h."InvoiceNo") FILTER (WHERE COALESCE(h."InvoiceNo", '') <> ''),
           array_agg(h."ReceiptVoucherNo") FILTER (WHERE COALESCE(h."ReceiptVoucherNo", '') <> ''),
           array_agg(h."RegistrationReversalNo") FILTER (WHERE COALESCE(h."RegistrationReversalNo", '') <> '')
    INTO   v_nos, v_rvs, v_jvs
    FROM   public."SalesInvoicesMb" h;

    v_nos  := COALESCE(v_nos, ARRAY[]::text[]);
    v_rvs  := COALESCE(v_rvs, ARRAY[]::text[]);
    v_jvs  := COALESCE(v_jvs, ARRAY[]::text[]);
    v_docs := v_nos || v_rvs || v_jvs;

    SELECT array_agg(n || '/%') INTO v_like FROM unnest(v_nos) n;
    v_like := COALESCE(v_like, ARRAY[]::text[]);

    SELECT array_agg(DISTINCT upper(l."ChassisNo"))
    INTO   v_chassis
    FROM   public."SalesInvoicesMbLines" l
    WHERE  COALESCE(l."ChassisNo", '') <> '';

    v_chassis := COALESCE(v_chassis, ARRAY[]::text[]);

    RAISE NOTICE 'Invoices % | receipt vouchers % | reversal JVs % | chassis %',
        cardinality(v_nos), cardinality(v_rvs), cardinality(v_jvs), cardinality(v_chassis);

    IF cardinality(v_docs) = 0 THEN
        RETURN;
    END IF;

    FOR v_col IN
        SELECT c.table_name, c.column_name
        FROM   information_schema.columns c
        JOIN   information_schema.tables t
               ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
        WHERE  c.table_schema = 'public'
        AND    c.data_type IN ('character varying', 'text', 'character')
        ORDER  BY c.table_name, c.column_name
    LOOP
        EXECUTE format('SELECT count(*) FROM public.%I WHERE %I = ANY ($1) OR %I LIKE ANY ($2)',
                       v_col.table_name, v_col.column_name, v_col.column_name)
        INTO v_hits USING v_docs, v_like;

        IF v_hits > 0 THEN
            INSERT INTO tmp_si_hits VALUES ('document no', v_col.table_name, v_col.column_name, v_hits);
            RAISE NOTICE 'DOC     %.% : %', v_col.table_name, v_col.column_name, v_hits;
        END IF;

        IF cardinality(v_chassis) > 0 AND v_col.column_name ILIKE '%chassis%' THEN
            EXECUTE format('SELECT count(*) FROM public.%I WHERE upper(%I) = ANY ($1)',
                           v_col.table_name, v_col.column_name)
            INTO v_hits USING v_chassis;

            IF v_hits > 0 THEN
                INSERT INTO tmp_si_hits VALUES ('chassis', v_col.table_name, v_col.column_name, v_hits);
                RAISE NOTICE 'CHASSIS %.% : %', v_col.table_name, v_col.column_name, v_hits;
            END IF;
        END IF;
    END LOOP;
END $$;

SELECT kind, table_name, column_name, rows_found
FROM   tmp_si_hits
ORDER  BY kind DESC, table_name, column_name;
