-- =====================================================================
-- PurchasesSP_MoveBranch_MB_to_SC.sql
--
-- Moves posted Purchases - SP (and the purchase orders they came
-- from) from one branch to another, with everything they posted :
--
--   PurchasesSp / PurchaseOrdersSp : branch, warehouse (target
--                                    branch's default warehouse)
--   StockBatches / StockMovements  : branch (+ warehouse)
--   ProductPricingLines            : branch of the batches
--   VatRegister / VoucherEntries   : branch
--
-- and renumbers them for the target branch (PISP-010101-... becomes
-- PISP-010201-...; POSP the same), taking the next numbers from the
-- target branch's VoucherSequences. The old numbers are replaced in
-- every text column of the database (narrations, references,
-- SourceNo, OrderNo, ...).
--
-- Branches are found by the digits of their BranchCode (the same
-- digits the voucher numbers carry).
--
-- Safe : one transaction. It stops (nothing changed) when :
--   - a purchase is missing, deleted, or not in the source branch
--   - the target branch / its default warehouse is not exactly one
--   - a linked purchase order is also used by a purchase that stays
--   - the stock was used after the purchase (any other movement,
--     allocation or quantity out)
--
-- Edit only the CONFIG block, then run the whole file.
-- =====================================================================

BEGIN;

-- =========================== CONFIG ==================================

CREATE TEMP TABLE _cfg ON COMMIT DROP AS
SELECT
    '010101'::text AS old_digits,   -- source branch (MB)
    '010201'::text AS new_digits;   -- target branch (SC)

CREATE TEMP TABLE _pick
(
    purchase_no text PRIMARY KEY
)
ON COMMIT DROP;

INSERT INTO _pick (purchase_no) VALUES
    ('PISP-010101-2627-10-00001'),
    ('PISP-010101-2627-10-00002'),
    ('PISP-010101-2627-10-00003');

-- =====================================================================

CREATE TEMP TABLE _map
(
    kind     text NOT NULL,   -- PURCHASE / ORDER
    id       bigint NOT NULL,
    old_no   text NOT NULL,
    new_no   text NOT NULL
)
ON COMMIT DROP;

CREATE TEMP TABLE _batches
(
    batch_id bigint PRIMARY KEY
)
ON COMMIT DROP;


DO $$
DECLARE
    v_old_digits   text;
    v_new_digits   text;

    v_branch_id    bigint;
    v_branch_code  text;
    v_branch_name  text;
    v_count        int;

    v_wh_id        bigint;
    v_wh_name      text;

    r              record;
    v_prefix       text;
    v_fy           text;
    v_month        int;
    v_next         int;
    v_new_no       text;

    v_bad          text;
    col            record;
    m              record;
    v_rows         bigint;
BEGIN
    SELECT old_digits, new_digits
      INTO v_old_digits, v_new_digits
      FROM _cfg;

    -- -----------------------------------------------------------------
    -- Target branch and its default warehouse
    -- -----------------------------------------------------------------

    SELECT count(*)
      INTO v_count
      FROM public."Branches" b
     WHERE NOT b."IsDeleted"
       AND regexp_replace(coalesce(b."BranchCode", ''), '\D', '', 'g') = v_new_digits;

    IF v_count <> 1 THEN
        RAISE EXCEPTION 'Target branch with code digits % : found % (need exactly 1).', v_new_digits, v_count;
    END IF;

    SELECT b."BranchId", b."BranchCode", b."BranchName"
      INTO v_branch_id, v_branch_code, v_branch_name
      FROM public."Branches" b
     WHERE NOT b."IsDeleted"
       AND regexp_replace(coalesce(b."BranchCode", ''), '\D', '', 'g') = v_new_digits;

    SELECT count(*)
      INTO v_count
      FROM public."Warehouses" w
     WHERE w."BranchId" = v_branch_id
       AND w."IsDefault"
       AND w."IsActive"
       AND NOT w."IsDeleted";

    IF v_count <> 1 THEN
        RAISE EXCEPTION 'Default active warehouse of % : found % (need exactly 1).', v_branch_name, v_count;
    END IF;

    SELECT w."WarehouseId", w."WarehouseName"
      INTO v_wh_id, v_wh_name
      FROM public."Warehouses" w
     WHERE w."BranchId" = v_branch_id
       AND w."IsDefault"
       AND w."IsActive"
       AND NOT w."IsDeleted";

    -- -----------------------------------------------------------------
    -- The purchases : all found, not deleted, in the source branch
    -- -----------------------------------------------------------------

    SELECT string_agg(k.purchase_no, ', ')
      INTO v_bad
      FROM _pick k
     WHERE NOT EXISTS
           (
               SELECT 1
                 FROM public."PurchasesSp" p
                WHERE p."PurchaseNo" = k.purchase_no
                  AND NOT p."IsDeleted"
                  AND regexp_replace(coalesce(p."BranchCode", ''), '\D', '', 'g') = v_old_digits
           );

    IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'Not found / deleted / not in branch %: %', v_old_digits, v_bad;
    END IF;

    -- -----------------------------------------------------------------
    -- Linked purchase orders must not serve a purchase that stays
    -- -----------------------------------------------------------------

    SELECT string_agg(DISTINCT o."OrderNo" || ' (used by ' || p2."PurchaseNo" || ')', ', ')
      INTO v_bad
      FROM public."PurchasesSp" p
      JOIN _pick k ON k.purchase_no = p."PurchaseNo"
      JOIN public."PurchaseOrdersSp" o ON o."PurchaseOrderId" = p."PurchaseOrderId"
      JOIN public."PurchasesSp" p2 ON p2."PurchaseOrderId" = o."PurchaseOrderId"
     WHERE NOT p2."IsDeleted"
       AND p2."PurchaseNo" NOT IN (SELECT purchase_no FROM _pick);

    IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'Purchase order also used by a purchase that stays: %', v_bad;
    END IF;

    -- -----------------------------------------------------------------
    -- Stock batches of the purchases; the stock must be unused
    -- -----------------------------------------------------------------

    INSERT INTO _batches (batch_id)
    SELECT b."StockBatchId"
      FROM public."StockBatches" b
     WHERE b."SourceNo" IN (SELECT purchase_no FROM _pick);

    SELECT string_agg(DISTINCT coalesce(sm."DocumentType", '') || ' ' || coalesce(sm."DocumentNo", ''), ', ')
      INTO v_bad
      FROM public."StockMovements" sm
     WHERE sm."StockBatchId" IN (SELECT batch_id FROM _batches)
       AND coalesce(sm."DocumentNo", '') NOT IN (SELECT purchase_no FROM _pick);

    IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'The stock of these purchases was already moved / used by: %', v_bad;
    END IF;

    SELECT string_agg(DISTINCT a."DocumentType" || ' #' || a."DocumentId", ', ')
      INTO v_bad
      FROM public."StockAllocations" a
     WHERE a."StockBatchId" IN (SELECT batch_id FROM _batches)
       AND NOT a."IsReversed";

    IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'The stock of these purchases is allocated to: %', v_bad;
    END IF;

    SELECT string_agg(b."BatchNo", ', ')
      INTO v_bad
      FROM public."StockBatches" b
     WHERE b."StockBatchId" IN (SELECT batch_id FROM _batches)
       AND b."QuantityOut" <> 0;

    IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'Stock already issued from batches: %', v_bad;
    END IF;

    -- Any other table holding these batches (bins, transfers, sales,
    -- labels ...) : the stock is tied to the source branch there
    FOR col IN
        SELECT c.table_name
          FROM information_schema.columns c
          JOIN information_schema.tables t
            ON t.table_schema = c.table_schema
           AND t.table_name   = c.table_name
           AND t.table_type   = 'BASE TABLE'
         WHERE c.table_schema = 'public'
           AND c.column_name  = 'StockBatchId'
           AND c.table_name NOT IN
               ('StockBatches', 'StockMovements', 'StockAllocations', 'ProductPricingLines')
    LOOP
        EXECUTE format(
            'SELECT count(*) FROM public.%I WHERE "StockBatchId" IN (SELECT batch_id FROM _batches)',
            col.table_name)
        INTO v_rows;

        IF v_rows > 0 THEN
            RAISE EXCEPTION 'The stock of these purchases is used in % (% row(s)). Undo that first.',
                col.table_name, v_rows;
        END IF;
    END LOOP;

    -- -----------------------------------------------------------------
    -- New numbers from the target branch's sequences
    -- (PREFIX-DIGITS-FY-MM-NNNNN)
    -- -----------------------------------------------------------------

    FOR r IN
        SELECT 'PURCHASE' AS kind, p."PurchaseId" AS id, p."PurchaseNo" AS no
          FROM public."PurchasesSp" p
         WHERE p."PurchaseNo" IN (SELECT purchase_no FROM _pick)
        UNION ALL
        SELECT DISTINCT 'ORDER', o."PurchaseOrderId", o."OrderNo"
          FROM public."PurchasesSp" p
          JOIN public."PurchaseOrdersSp" o ON o."PurchaseOrderId" = p."PurchaseOrderId"
         WHERE p."PurchaseNo" IN (SELECT purchase_no FROM _pick)
        ORDER BY 1, 3
    LOOP
        v_prefix := split_part(r.no, '-', 1);
        v_fy     := split_part(r.no, '-', 3);
        v_month  := split_part(r.no, '-', 4)::int;

        IF split_part(r.no, '-', 2) <> v_old_digits THEN
            RAISE EXCEPTION 'Number % does not carry branch digits %.', r.no, v_old_digits;
        END IF;

        INSERT INTO public."VoucherSequences"
            ("Prefix", "BranchDigits", "FinancialYearCode", "PeriodMonth", "LastNumber", "ModifiedDate")
        VALUES
            (v_prefix, v_new_digits, v_fy, v_month, 1, now())
        ON CONFLICT ("Prefix", "BranchDigits", "FinancialYearCode", "PeriodMonth")
        DO UPDATE SET
            "LastNumber"   = public."VoucherSequences"."LastNumber" + 1,
            "ModifiedDate" = now()
        RETURNING "LastNumber" INTO v_next;

        v_new_no :=
            v_prefix || '-' || v_new_digits || '-' || v_fy || '-'
            || lpad(v_month::text, 2, '0') || '-' || lpad(v_next::text, 5, '0');

        IF EXISTS (SELECT 1 FROM public."PurchasesSp" WHERE "PurchaseNo" = v_new_no)
           OR EXISTS (SELECT 1 FROM public."PurchaseOrdersSp" WHERE "OrderNo" = v_new_no) THEN
            RAISE EXCEPTION 'New number % is already used.', v_new_no;
        END IF;

        INSERT INTO _map (kind, id, old_no, new_no)
        VALUES (r.kind, r.id, r.no, v_new_no);
    END LOOP;

    -- -----------------------------------------------------------------
    -- Branch / warehouse moves
    -- -----------------------------------------------------------------

    UPDATE public."PurchasesSp" p
       SET "BranchId"      = v_branch_id,
           "BranchCode"    = v_branch_code,
           "BranchName"    = v_branch_name,
           "WarehouseId"   = CASE WHEN p."WarehouseId" IS NULL THEN NULL ELSE v_wh_id END,
           "WarehouseName" = CASE WHEN p."WarehouseId" IS NULL THEN p."WarehouseName" ELSE v_wh_name END,
           "ModifiedDate"  = now()
     WHERE p."PurchaseId" IN (SELECT id FROM _map WHERE kind = 'PURCHASE');

    UPDATE public."PurchaseOrdersSp" o
       SET "BranchId"     = v_branch_id,
           "BranchCode"   = v_branch_code,
           "BranchName"   = v_branch_name,
           "ModifiedDate" = now()
     WHERE o."PurchaseOrderId" IN (SELECT id FROM _map WHERE kind = 'ORDER');

    UPDATE public."StockBatches"
       SET "BranchId"     = v_branch_id,
           "ModifiedDate" = now()
     WHERE "StockBatchId" IN (SELECT batch_id FROM _batches);

    UPDATE public."StockMovements"
       SET "BranchId"    = v_branch_id,
           "WarehouseId" = CASE WHEN "WarehouseId" IS NULL THEN NULL ELSE v_wh_id END
     WHERE "StockBatchId" IN (SELECT batch_id FROM _batches);

    UPDATE public."ProductPricingLines"
       SET "BranchId"   = v_branch_id,
           "BranchName" = v_branch_name
     WHERE "StockBatchId" IN (SELECT batch_id FROM _batches);

    UPDATE public."VatRegister"
       SET "BranchId" = v_branch_id
     WHERE "DocumentNo" IN (SELECT purchase_no FROM _pick);

    UPDATE public."VoucherEntries"
       SET "BranchId"   = v_branch_id,
           "BranchCode" = v_branch_code
     WHERE "VoucherNo" IN (SELECT purchase_no FROM _pick);

    -- -----------------------------------------------------------------
    -- Renumber : old -> new in every text column of the database
    -- -----------------------------------------------------------------

    FOR col IN
        SELECT c.table_name, c.column_name
          FROM information_schema.columns c
          JOIN information_schema.tables t
            ON t.table_schema = c.table_schema
           AND t.table_name   = c.table_name
           AND t.table_type   = 'BASE TABLE'
         WHERE c.table_schema = 'public'
           AND c.data_type IN ('text', 'character varying')
    LOOP
        FOR m IN SELECT old_no, new_no FROM _map LOOP
            EXECUTE format(
                'UPDATE public.%I SET %I = replace(%I, $1, $2) WHERE %I LIKE $3',
                col.table_name, col.column_name, col.column_name, col.column_name)
            USING m.old_no, m.new_no, '%' || m.old_no || '%';

            GET DIAGNOSTICS v_rows = ROW_COUNT;

            IF v_rows > 0 THEN
                RAISE NOTICE '%.% : % row(s) % -> %',
                    col.table_name, col.column_name, v_rows, m.old_no, m.new_no;
            END IF;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Moved to % (%), warehouse %.', v_branch_name, v_branch_code, v_wh_name;
END $$;


-- =========================== RESULT ==================================

SELECT kind AS "Document", old_no AS "Old No", new_no AS "New No"
  FROM _map
 ORDER BY kind DESC, new_no;

SELECT p."PurchaseNo", p."OrderNo", p."BranchName", p."WarehouseName", p."Status"
  FROM public."PurchasesSp" p
 WHERE p."PurchaseNo" IN (SELECT new_no FROM _map);

COMMIT;
