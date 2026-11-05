-- ============================================================
-- Reset : operational data (fresh start for testing)
-- (owner request 2026-11-04)
--
-- CLEARS (all rows, ids restart at 1) :
--   Products      : Spare Parts / Lubricants, Accessories, Motor
--                   Bikes, their saved locations, and each
--                   product's own ledgers (inventory, WIP, COGS,
--                   sales) in General Ledgers
--   Opening stock, Product Receiving (SP / AC / MB)
--   Procurement   : purchase orders, purchases, returns,
--                   adjustments (SP / AC / MB), motor bike units
--   Sales         : sales invoices (+ lines, payments), returns
--   Stock engine  : batches, movements, allocations, VAT register,
--                   product price index
--   Stock movement: product transfers, mass storing
--   Pricing       : product pricing, price adjustments, barcode
--                   print runs
--   Vouchers      : receipt, payment, journal, fund transfer
--   Reconciliation: check / MFS / POS / EMI (+ vouchers, history,
--                   auto settlement runs, check deposit slips)
--   Accounting    : voucher entries (every ledger balance -> 0),
--                   voucher sequences (numbers restart at 00001)
--   Enquiries     : sales / service enquiries, enquiry contacts,
--                   follow-ups, service vehicles and schedules
--   Membership    : fees collected, membership status, service
--                   windows
--   Logs          : activity history, posting setup history,
--                   system configuration requests
--   Walk-in customers (IsWalkIn) and their own receivable ledger
--
-- KEEPS : company, branches, warehouses, financial years,
-- locations, wings; account classes / groups / sub groups and
-- every other ledger; cash / bank / MFS / POS / EMI accounts,
-- card setup, posting setup; product categories, sub categories,
-- brands, colours, racks, zones, shelves / bins; customers (not
-- walk-in), suppliers; switches, VAT setup, enquiry setups,
-- membership cards / policies, service settings, navigation,
-- users, roles, permissions.
--
-- SAFETY : one statement (all or nothing). It stops, changing
-- nothing, when a kept table still points at a table being
-- cleared (foreign key) or still holds rows with a product id.
-- Tables are found by name (any upper / lower case); a table
-- that does not exist is skipped.
--
-- TAKE A BACKUP FIRST (pg_dump). Run the whole script (F5).
-- ASCII only.
-- ============================================================

DO $$
DECLARE
    v_names text[] := ARRAY
    [
        -- Products
        'spareparts', 'accessories', 'motorbikes',
        'sparepartlocations', 'accessorylocations',
        -- Opening stock / receiving
        'openingstock', 'openingstocklines',
        'sparepartslubricantsreceiving', 'sparepartslubricantsreceivinglines',
        'accessoriesreceiving', 'accessoriesreceivinglines',
        'motorbikereceiving', 'motorbikereceivinglines',
        'motorbikeunits',
        -- Stock engine
        'stockbatches', 'stockmovements', 'stockallocations',
        'vatregister', 'productpriceindex',
        -- Stock movement
        'producttransfers', 'producttransferlines',
        'producttransferbatches', 'producttransferunits',
        'massstorings', 'massstoringlines',
        -- Pricing
        'productpricing', 'productpricinglines',
        'priceadjustments', 'priceadjustmentlines', 'priceadjustmentproducts',
        'priceadjustmentreleases', 'priceadjustmentsuppliers',
        'barcodeprintruns', 'barcodeprintrunlines',
        -- Vouchers
        'receiptvoucher', 'receiptvoucherlines', 'receiptvoucherpayments',
        'paymentvoucher', 'paymentvoucherlines', 'paymentvoucherpayments',
        'journalvoucher', 'journalvoucherlines',
        'fundtransfer', 'fundtransferlines',
        -- Reconciliation
        'checkreconciliations', 'checkreconciliationvouchers',
        'checkreconciliationvoucherlines', 'checkreconciliationhistory',
        'checkdepositslips',
        'mfsreconciliations', 'mfsreconciliationvouchers',
        'mfsreconciliationvoucherlines', 'mfsreconciliationhistory',
        'mfsautosettlementruns',
        'posreconciliations', 'posreconciliationvouchers',
        'posreconciliationvoucherlines', 'posreconciliationhistory',
        'posautosettlementruns',
        'emireconciliations',
        -- Accounting
        'voucherentries', 'vouchersequences',
        -- Enquiries
        'salesenquiries', 'serviceenquiries', 'serviceenquirylines',
        'enquirycontacts', 'salesfollowups', 'servicefollowups',
        'servicevehicles', 'servicevehicleschedules',
        -- Membership operations
        'membershipfeescollection', 'membershipfeescollections',
        'membershipstatus', 'membershipstatuses',
        'membershipservicewindows',
        -- Logs
        'activityhistory', 'activityhistories',
        'postingsetuphistory', 'postingsetuphistories',
        'systemconfigurationrequests'
    ];

    -- Procurement / sales tables of the three types (SP / AC / MB),
    -- with their lines and payments
    v_pattern text :=
        '^(purchaseorders|purchases|purchasereturns|purchaseadjustments|salesinvoices|salesreturns|salesquotations|bookings)(sp|ac|mb)';

    r          record;
    n          bigint;
    v_list     text;
    v_problems text;
BEGIN
    -- ---------- 1. Tables to clear ----------
    CREATE TEMP TABLE tmp_reset_tables
    (
        oid      oid,
        tbl      text,
        rows_was bigint
    ) ON COMMIT DROP;

    INSERT INTO tmp_reset_tables (oid, tbl)
    SELECT c.oid, c.relname
    FROM   pg_class c
    JOIN   pg_namespace s ON s.oid = c.relnamespace
    WHERE  s.nspname = 'public'
    AND    c.relkind IN ('r', 'p')
    AND    (lower(c.relname) = ANY (v_names) OR lower(c.relname) ~ v_pattern);

    IF NOT EXISTS (SELECT 1 FROM tmp_reset_tables) THEN
        RAISE EXCEPTION 'No operational table found in schema public - nothing changed.';
    END IF;

    -- ---------- 2. Guard : kept tables pointing at cleared ones ----------
    SELECT string_agg(DISTINCT format('%s -> %s', src.relname, dst.relname), ', ')
    INTO   v_problems
    FROM   pg_constraint k
    JOIN   pg_class src ON src.oid = k.conrelid
    JOIN   pg_class dst ON dst.oid = k.confrelid
    WHERE  k.contype = 'f'
    AND    k.confrelid IN (SELECT oid FROM tmp_reset_tables)
    AND    k.conrelid NOT IN (SELECT oid FROM tmp_reset_tables);

    IF v_problems IS NOT NULL THEN
        RAISE EXCEPTION 'Kept tables still point at tables being cleared (foreign keys) : % - nothing changed.', v_problems;
    END IF;

    -- ---------- 3. Guard : kept tables holding product ids ----------
    v_problems := NULL;

    FOR r IN
        SELECT c.relname AS tbl, a.attname AS col
        FROM   pg_attribute a
        JOIN   pg_class c ON c.oid = a.attrelid
        JOIN   pg_namespace s ON s.oid = c.relnamespace
        WHERE  s.nspname = 'public'
        AND    c.relkind IN ('r', 'p')
        AND    a.attnum > 0
        AND    NOT a.attisdropped
        AND    lower(a.attname) IN ('sparepartid', 'sparepartsid', 'accessoryid', 'accessoriesid',
                                    'motorbikeid', 'motorbikesid', 'productid')
        AND    c.oid NOT IN (SELECT oid FROM tmp_reset_tables)
    LOOP
        EXECUTE format('SELECT count(*) FROM public.%I WHERE %I IS NOT NULL', r.tbl, r.col) INTO n;

        IF n > 0 THEN
            v_problems := concat_ws(', ', v_problems, format('%s.%s (%s rows)', r.tbl, r.col, n));
        END IF;
    END LOOP;

    IF v_problems IS NOT NULL THEN
        RAISE EXCEPTION 'Kept tables still hold product ids : % - nothing changed.', v_problems;
    END IF;

    -- ---------- 4. Rows before ----------
    FOR r IN SELECT tbl FROM tmp_reset_tables LOOP
        EXECUTE format('SELECT count(*) FROM public.%I', r.tbl) INTO n;
        UPDATE tmp_reset_tables SET rows_was = n WHERE tbl = r.tbl;
    END LOOP;

    -- ---------- 5. Product ledger codes (before the products go) ----------
    CREATE TEMP TABLE tmp_reset_ledgers
    (
        code text
    ) ON COMMIT DROP;

    FOR r IN
        SELECT c.relname AS tbl, a.attname AS col
        FROM   pg_attribute a
        JOIN   pg_class c ON c.oid = a.attrelid
        WHERE  c.oid IN (SELECT oid FROM tmp_reset_tables)
        AND    lower(c.relname) IN ('spareparts', 'accessories', 'motorbikes')
        AND    a.attname IN ('InventoryLedgerCode', 'WipLedgerCode', 'CogsLedgerCode', 'SalesLedgerCode')
        AND    NOT a.attisdropped
    LOOP
        EXECUTE format
        (
            'INSERT INTO tmp_reset_ledgers (code) SELECT DISTINCT %I FROM public.%I WHERE coalesce(trim(%I), '''') <> ''''',
            r.col, r.tbl, r.col
        );
    END LOOP;

    -- ---------- 6. Clear (one TRUNCATE, ids restart) ----------
    SELECT string_agg(format('public.%I', tbl), ', ' ORDER BY tbl)
    INTO   v_list
    FROM   tmp_reset_tables;

    EXECUTE 'TRUNCATE TABLE ' || v_list || ' RESTART IDENTITY';

    FOR r IN SELECT tbl, rows_was FROM tmp_reset_tables ORDER BY tbl LOOP
        RAISE NOTICE 'Cleared %  (% rows)', rpad(r.tbl, 40), r.rows_was;
    END LOOP;

    RAISE NOTICE 'Tables cleared : %', (SELECT count(*) FROM tmp_reset_tables);

    -- ---------- 7. Product ledgers (inventory, WIP, COGS, sales) ----------
    DELETE FROM public."GeneralLedgers" g
    WHERE  g."LedgerCode" IN (SELECT code FROM tmp_reset_ledgers)
    OR     g."Remarks" LIKE 'System generated from Spare Part %'
    OR     g."Remarks" LIKE 'System generated from Accessory %'
    OR     g."Remarks" LIKE 'System generated from Motor Bike %';

    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE 'Product ledgers deleted : %', n;

    -- ---------- 8. Walk-in customers and their own ledger ----------
    IF EXISTS
       (
           SELECT 1 FROM information_schema.columns
           WHERE  table_schema = 'public'
           AND    table_name   = 'CustomerProfiles'
           AND    column_name  = 'IsWalkIn'
       )
    THEN
        CREATE TEMP TABLE tmp_reset_walkin ON COMMIT DROP AS
        SELECT DISTINCT trim(c."ReceivableLedgerCode") AS code
        FROM   public."CustomerProfiles" c
        WHERE  c."IsWalkIn"
        AND    coalesce(trim(c."ReceivableLedgerCode"), '') <> '';

        DELETE FROM public."CustomerProfiles" WHERE "IsWalkIn";

        GET DIAGNOSTICS n = ROW_COUNT;
        RAISE NOTICE 'Walk-in customers deleted : %', n;

        -- Only a ledger no remaining customer uses
        DELETE FROM public."GeneralLedgers" g
        WHERE  g."LedgerCode" IN (SELECT code FROM tmp_reset_walkin)
        AND    NOT EXISTS
               (
                   SELECT 1 FROM public."CustomerProfiles" c
                   WHERE  trim(c."ReceivableLedgerCode") = g."LedgerCode"
               );

        GET DIAGNOSTICS n = ROW_COUNT;
        RAISE NOTICE 'Walk-in customer ledgers deleted : %', n;
    ELSE
        RAISE NOTICE 'CustomerProfiles has no IsWalkIn column - no customer deleted.';
    END IF;

    RAISE NOTICE 'Reset done.';
END $$;

-- ---------- Check : every count below should be 0 ----------
SELECT 'SpareParts' AS "Table", count(*) AS "Rows" FROM public."SpareParts"
UNION ALL SELECT 'Accessories', count(*) FROM public."Accessories"
UNION ALL SELECT 'MotorBikes', count(*) FROM public."MotorBikes"
UNION ALL SELECT 'StockBatches', count(*) FROM public."StockBatches"
UNION ALL SELECT 'VoucherEntries', count(*) FROM public."VoucherEntries"
UNION ALL SELECT 'VoucherSequences', count(*) FROM public."VoucherSequences"
UNION ALL SELECT 'Product ledgers left', count(*) FROM public."GeneralLedgers"
          WHERE "Remarks" LIKE 'System generated from Spare Part %'
          OR    "Remarks" LIKE 'System generated from Accessory %'
          OR    "Remarks" LIKE 'System generated from Motor Bike %';
