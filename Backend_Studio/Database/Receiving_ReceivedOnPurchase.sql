/*===============================================================
  Product Receiving : receivings made by the purchase itself
  (owner request 2026-11-10)

  A purchase whose stock comes in with it (switch "Products
  Received on Purchase" ON) now also has its receiving on the
  Product Receiving page, read only (ReceivedOn = 'Purchase';
  cancelled only by cancelling the purchase).

  1. Adds "ReceivedOn" to MotorBikeReceiving,
     SparePartsLubricantsReceiving and AccessoriesReceiving
     (existing rows = 'Receiving').
  2. Back-fill : every posted purchase (MB / SP / AC) that is
     stocked in, has a warehouse and has NO receiving at all gets
     one now : dated on the purchase date, numbered from the
     receiving counter of its branch / year / month (RCMB-...,
     RCSP-..., RCAC-...), one line per stock batch, all received.
     MB : the purchase's bikes point at it.

  Run BEFORE starting the new API (the API reads the column).
  Safe to run more than once (a purchase with a receiving is
  skipped). One transaction. ASCII only. Run the whole script (F5).
===============================================================*/

BEGIN;

DO $$
DECLARE
    v_page     record;
    v_p        record;
    v_seq      integer;
    v_no       text;
    v_id       bigint;
    v_lines    integer;
    v_total    integer := 0;
BEGIN
    FOR v_page IN
        SELECT *
        FROM
        (
            VALUES
            ('MB', 'RCMB', 'PurchasesMb', 'PurchasesMbLines', 'MotorBikeReceiving',            'MotorBikeReceivingLines'),
            ('SP', 'RCSP', 'PurchasesSp', 'PurchasesSpLines', 'SparePartsLubricantsReceiving', 'SparePartsLubricantsReceivingLines'),
            ('AC', 'RCAC', 'PurchasesAc', 'PurchasesAcLines', 'AccessoriesReceiving',          'AccessoriesReceivingLines')
        ) AS t (page_type, prefix, purchases, purchase_lines, receiving, receiving_lines)
    LOOP
        IF to_regclass(format('public.%I', v_page.receiving)) IS NULL
           OR to_regclass(format('public.%I', v_page.purchases)) IS NULL
        THEN
            RAISE NOTICE '% : table not found - skipped.', v_page.receiving;
            CONTINUE;
        END IF;

        -- 1. The column
        EXECUTE format(
            'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS "ReceivedOn" character varying(20) NOT NULL DEFAULT %L',
            v_page.receiving, 'Receiving');

        -- 2. Back-fill
        FOR v_p IN
            EXECUTE format(
                'SELECT p.* FROM public.%I p
                 WHERE  p."Status" = ''Posted'' AND NOT p."IsDeleted" AND p."StockedIn"
                 AND    p."WarehouseId" IS NOT NULL
                 AND    NOT EXISTS (SELECT 1 FROM public.%I r WHERE r."PurchaseId" = p."PurchaseId")
                 ORDER  BY p."PurchaseDate", p."PurchaseId"',
                v_page.purchases, v_page.receiving)
        LOOP
            -- Number : same branch digits / year / month as the
            -- purchase (both dated on the purchase date)
            INSERT INTO public."VoucherSequences"
                ("Prefix", "BranchDigits", "FinancialYearCode", "PeriodMonth", "LastNumber", "ModifiedDate")
            VALUES
                (v_page.prefix, split_part(v_p."PurchaseNo", '-', 2), split_part(v_p."PurchaseNo", '-', 3),
                 split_part(v_p."PurchaseNo", '-', 4)::integer, 1, now())
            ON CONFLICT ("Prefix", "BranchDigits", "FinancialYearCode", "PeriodMonth")
            DO UPDATE SET "LastNumber" = public."VoucherSequences"."LastNumber" + 1, "ModifiedDate" = now()
            RETURNING "LastNumber" INTO v_seq;

            v_no := v_page.prefix || '-' || split_part(v_p."PurchaseNo", '-', 2) || '-' ||
                    split_part(v_p."PurchaseNo", '-', 3) || '-' || split_part(v_p."PurchaseNo", '-', 4) || '-' ||
                    lpad(v_seq::text, 5, '0');

            EXECUTE format(
                'INSERT INTO public.%I
                 ("PublicId", "PageType", "ReceivingNo", "ReceivingDate", "BranchId", "BranchCode", "BranchName",
                  "FinancialYearId", "WarehouseId", "WarehouseName", "PurchaseId", "PurchaseNo", "PurchaseDate",
                  "SupplierCode", "SupplierName", "SupplierInvoiceNo", "MushakNo", "DoReference", "GatePassNo",
                  "ReceivedBy", "Remarks", "ReceivedOn", "TotalQuantity", "Status", "CancelReason",
                  "IsDeleted", "CreatedBy", "CreatedDate")
                 SELECT gen_random_uuid(), $1, $2, p."PurchaseDate", p."BranchId", p."BranchCode", p."BranchName",
                        p."FinancialYearId", p."WarehouseId", left(p."WarehouseName", 150), p."PurchaseId", p."PurchaseNo", p."PurchaseDate",
                        p."SupplierCode", left(p."SupplierName", 200), p."SupplierInvoiceNo", p."MushakNo", p."DoReference", p."GatePassNo",
                        '''', left(''Received with purchase '' || p."PurchaseNo", 500), ''Purchase'',
                        COALESCE((SELECT sum(b."Quantity") FROM public."StockBatches" b
                                  WHERE b."SourceType" = ''Purchase'' AND b."ProductType" = $1 AND b."SourceId" = p."PurchaseId"), 0),
                        ''Posted'', '''',
                        false, COALESCE(p."PostedBy", p."CreatedBy"), COALESCE(p."PostedDate", now())
                 FROM   public.%I p
                 WHERE  p."PurchaseId" = $3
                 RETURNING "ReceivingId"',
                v_page.receiving, v_page.purchases)
            INTO v_id
            USING v_page.page_type, v_no, v_p."PurchaseId";

            EXECUTE format(
                'INSERT INTO public.%I
                 ("ReceivingId", "LineNo", "PurchaseLineId", "StockBatchId", "BatchNo", "ProductType", "ProductId",
                  "ProductCode", "ProductName", "Unit", "PurchasedQuantity", "ReceivedBefore", "Quantity", "UnitCost",
                  "RackManagementId", "RackCode", "ShelfNumber", "BinNumber", "ShortNotes")
                 SELECT $1, row_number() OVER (ORDER BY l."LineNo", b."StockBatchId"), l."PurchaseLineId", b."StockBatchId",
                        left(b."BatchNo", 50), $2, l."ProductId", l."ProductCode", left(l."ProductName", 200), left(l."Unit", 30),
                        b."Quantity", 0, b."Quantity", b."UnitCost",
                        NULL, '''', 0, 0, ''''
                 FROM   public."StockBatches" b
                 JOIN   public.%I l ON l."PurchaseLineId" = b."SourceLineId"
                 WHERE  b."SourceType" = ''Purchase'' AND b."ProductType" = $2 AND b."SourceId" = $3',
                v_page.receiving_lines, v_page.purchase_lines)
            USING v_id, v_page.page_type, v_p."PurchaseId";

            GET DIAGNOSTICS v_lines = ROW_COUNT;

            IF v_page.page_type = 'MB' THEN
                UPDATE public."MotorBikeUnits"
                SET    "ReceivingId" = v_id
                WHERE  "PurchaseId" = v_p."PurchaseId" AND NOT "IsDeleted" AND "ReceivingId" IS NULL;
            END IF;

            v_total := v_total + 1;

            RAISE NOTICE '% <- purchase % (% lines)', v_no, v_p."PurchaseNo", v_lines;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Receivings made for purchases received on purchase : %', v_total;
END $$;

-- Check
SELECT r."ReceivingNo", r."ReceivingDate", r."PurchaseNo", r."ReceivedOn", r."TotalQuantity", r."Status",
       (SELECT count(*) FROM public."MotorBikeReceivingLines" l WHERE l."ReceivingId" = r."ReceivingId") AS "Lines",
       (SELECT count(*) FROM public."MotorBikeUnits" u WHERE u."ReceivingId" = r."ReceivingId") AS "Bikes"
FROM   public."MotorBikeReceiving" r
ORDER  BY r."ReceivingNo";

COMMIT;
