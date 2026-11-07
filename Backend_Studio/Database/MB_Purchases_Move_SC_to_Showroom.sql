/*===============================================================
  One-off move : Motor Bike purchase documents made at
  Uttara Service Center (BRN-01-02-01) -> Uttara Showroom
  (BRN-01-01-01). Owner decision 2026-11-06.

  What moves (rows of the MB purchase documents of the Service
  Center only) :
    PurchaseOrdersMb       BranchId
    PurchasesMb            BranchId, WarehouseId (-> Showroom
                           warehouse) when set
    VoucherEntries         BranchId, BranchCode (their journals)
    StockBatches           BranchId (their stock)
    StockMovements         BranchId, WarehouseId when set
    VatRegister            BranchId
    MotorBikeUnits         BranchId, WarehouseId when the columns
                           exist

  Numbers keep their text (POMB-010201-..., PIMB-010201-...) :
  a used number is never renamed. Next numbers at the Showroom
  start from its own counter (POMB-010101-..., PIMB-010101-...).

  One transaction : any error and nothing changes. The check at
  the end lists what is now at the Showroom; COMMIT is at the end.
  Run the whole script (F5).
===============================================================*/

BEGIN;

DO $$
DECLARE
    v_from        bigint;
    v_to          bigint;
    v_to_code     text;
    v_to_wh       bigint;
    v_pos         text[];
    v_purchases   text[];
    v_all         text[];
    n             integer;

    -- table, number column (or '' = by branch + id list), set list
BEGIN
    SELECT "BranchId" INTO v_from FROM public."Branches"
    WHERE  "BranchCode" = 'BRN-01-02-01' AND NOT "IsDeleted";

    SELECT "BranchId", "BranchCode" INTO v_to, v_to_code FROM public."Branches"
    WHERE  "BranchCode" = 'BRN-01-01-01' AND NOT "IsDeleted";

    IF v_from IS NULL OR v_to IS NULL THEN
        RAISE EXCEPTION 'Branch BRN-01-02-01 or BRN-01-01-01 not found - nothing changed.';
    END IF;

    -- The Showroom warehouse : its default one when the column
    -- exists, else its first active one
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'Warehouses' AND column_name = 'IsDefault') THEN
        EXECUTE 'SELECT "WarehouseId" FROM public."Warehouses"
                 WHERE "BranchId" = $1 AND NOT "IsDeleted" AND "IsActive"
                 ORDER BY "IsDefault" DESC, "WarehouseId" LIMIT 1'
        INTO v_to_wh USING v_to;
    ELSE
        SELECT "WarehouseId" INTO v_to_wh FROM public."Warehouses"
        WHERE  "BranchId" = v_to AND NOT "IsDeleted" AND "IsActive"
        ORDER  BY "WarehouseId" LIMIT 1;
    END IF;

    IF v_to_wh IS NULL THEN
        RAISE EXCEPTION 'Uttara Showroom has no active warehouse - nothing changed.';
    END IF;

    SELECT array_agg("OrderNo") INTO v_pos
    FROM   public."PurchaseOrdersMb" WHERE "BranchId" = v_from;

    SELECT array_agg("PurchaseNo") INTO v_purchases
    FROM   public."PurchasesMb" WHERE "BranchId" = v_from;

    v_pos       := COALESCE(v_pos, ARRAY[]::text[]);
    v_purchases := COALESCE(v_purchases, ARRAY[]::text[]);
    v_all       := v_pos || v_purchases;

    RAISE NOTICE 'Moving % purchase orders and % purchases to %.', cardinality(v_pos), cardinality(v_purchases), v_to_code;

    UPDATE public."PurchaseOrdersMb" SET "BranchId" = v_to WHERE "BranchId" = v_from;
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'PurchaseOrdersMb : %', n;

    UPDATE public."PurchasesMb" SET "BranchId" = v_to WHERE "BranchId" = v_from;
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'PurchasesMb : %', n;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'PurchasesMb' AND column_name = 'WarehouseId') THEN
        EXECUTE 'UPDATE public."PurchasesMb" SET "WarehouseId" = $1
                 WHERE "PurchaseNo" = ANY($2) AND "WarehouseId" IS NOT NULL'
        USING v_to_wh, v_purchases;
    END IF;

    UPDATE public."VoucherEntries"
    SET    "BranchId" = v_to, "BranchCode" = v_to_code
    WHERE  "VoucherNo" = ANY(v_all) AND "BranchId" = v_from;
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'VoucherEntries : %', n;

    UPDATE public."StockBatches"
    SET    "BranchId" = v_to
    WHERE  "SourceNo" = ANY(v_purchases) AND "BranchId" = v_from;
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'StockBatches : %', n;

    UPDATE public."StockMovements"
    SET    "BranchId" = v_to,
           "WarehouseId" = CASE WHEN "WarehouseId" IS NULL THEN NULL ELSE v_to_wh END
    WHERE  "DocumentNo" = ANY(v_purchases) AND "BranchId" = v_from;
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'StockMovements : %', n;

    UPDATE public."VatRegister"
    SET    "BranchId" = v_to
    WHERE  "DocumentNo" = ANY(v_purchases) AND "BranchId" = v_from;
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'VatRegister : %', n;

    IF to_regclass('public."MotorBikeUnits"') IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'MotorBikeUnits' AND column_name = 'BranchId') THEN
            EXECUTE 'UPDATE public."MotorBikeUnits" SET "BranchId" = $1
                     WHERE "PurchaseNo" = ANY($2) AND "BranchId" = $3'
            USING v_to, v_purchases, v_from;
            GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'MotorBikeUnits : %', n;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'MotorBikeUnits' AND column_name = 'WarehouseId') THEN
            EXECUTE 'UPDATE public."MotorBikeUnits" SET "WarehouseId" = $1
                     WHERE "PurchaseNo" = ANY($2) AND "WarehouseId" IS NOT NULL'
            USING v_to_wh, v_purchases;
        END IF;
    END IF;
END $$;

-- Check before COMMIT : nothing MB should be left at the Service Center
SELECT 'PurchaseOrdersMb' AS "Table", b."BranchCode", count(*) AS "Rows"
FROM   public."PurchaseOrdersMb" t JOIN public."Branches" b ON b."BranchId" = t."BranchId"
GROUP  BY b."BranchCode"
UNION ALL
SELECT 'PurchasesMb', b."BranchCode", count(*)
FROM   public."PurchasesMb" t JOIN public."Branches" b ON b."BranchId" = t."BranchId"
GROUP  BY b."BranchCode"
UNION ALL
SELECT 'StockBatches MB', b."BranchCode", count(*)
FROM   public."StockBatches" t JOIN public."Branches" b ON b."BranchId" = t."BranchId"
WHERE  t."ProductType" = 'MB'
GROUP  BY b."BranchCode"
ORDER  BY 1, 2;

COMMIT;
