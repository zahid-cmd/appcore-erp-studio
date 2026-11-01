-- ============================================================
-- Opening Stock : RESET (2026-11-01) — start over.
--
-- Removes EVERY opening stock and what it made, then drops the
-- two tables :
--   journals         VoucherEntries of types OPMB / OPSP / OPAC
--   stock            StockMovements of those documents and the
--                    Opening batches (StockBatches SourceType
--                    'Opening')
--   bikes            MotorBikeUnits made by opening stock
--   history          ActivityHistories of OpeningStockMB/SP/AC
--   tables           OpeningStockLines, OpeningStock
-- Kept : the switch, page actions, journal sources, the new
-- columns on MotorBikeUnits / StockBatches, default shelves.
--
-- Then run OpeningStock_Engine.sql again : it recreates the tables.
-- Development data only — this cannot be undone.
-- Run the whole script (F5). All or nothing (one transaction).
-- ============================================================

BEGIN;

-- Journals of opening stock (posted and reversals)
DELETE FROM public."VoucherEntries"
WHERE  "VoucherType" IN ('OPMB', 'OPSP', 'OPAC');

-- Stock movements of opening stock (posting and cancel)
DELETE FROM public."StockMovements"
WHERE  "DocumentType" IN ('OPMB', 'OPSP', 'OPAC')
OR     "StockBatchId" IN (SELECT "StockBatchId" FROM public."StockBatches" WHERE "SourceType" = 'Opening');

-- Opening batches
DELETE FROM public."StockBatches"
WHERE  "SourceType" = 'Opening';

-- Bikes made by opening stock (draft, posted or cancelled)
DO $$
BEGIN
    IF EXISTS
    (
        SELECT 1 FROM information_schema.columns
        WHERE  table_schema = 'public' AND table_name = 'MotorBikeUnits' AND column_name = 'OpeningStockId'
    )
    THEN
        DELETE FROM public."MotorBikeUnits" WHERE "OpeningStockId" IS NOT NULL;
    END IF;
END $$;

-- History
DELETE FROM public."ActivityHistories"
WHERE  "EntityName" IN ('OpeningStockMB', 'OpeningStockSP', 'OpeningStockAC');

-- Tables (lines first)
DROP TABLE IF EXISTS public."OpeningStockLines" CASCADE;

DROP TABLE IF EXISTS public."OpeningStock" CASCADE;

COMMIT;


-- ------------------------------------------------------------
-- Check (run on its own) : all zero, tables gone
-- ------------------------------------------------------------

/*  Select the lines below (without the comment marks) and run them
    on their own : pgAdmin cannot show a result at the end of a
    long script ("Cursor could not be found for the async
    connection").

SELECT
    (SELECT count(*) FROM public."VoucherEntries" WHERE "VoucherType" IN ('OPMB', 'OPSP', 'OPAC'))    AS "Journals",
    (SELECT count(*) FROM public."StockBatches"   WHERE "SourceType" = 'Opening')                      AS "Batches",
    (SELECT count(*) FROM public."StockMovements" WHERE "DocumentType" IN ('OPMB', 'OPSP', 'OPAC'))    AS "Movements",
    (SELECT count(*) FROM information_schema.tables
     WHERE  table_schema = 'public' AND table_name IN ('OpeningStock', 'OpeningStockLines'))           AS "Tables Left";
*/
