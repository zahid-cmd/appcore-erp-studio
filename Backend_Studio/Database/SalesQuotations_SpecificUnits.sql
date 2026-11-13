-- ============================================================
-- Sales Quotations - MB : Specific unit (chassis / engine)
-- (2026-11-13)
--
-- A Motor Bike quotation is by model + quantity (no chassis).
-- With "Specific unit" ON it names the exact bikes in stock :
-- each model line carries its chassis / engine (one bike per
-- quantity), printed on the quotation. Nothing is reserved :
-- a quotation still takes no stock.
--
-- 1. SalesQuotations."SpecificUnits"   boolean (false = models)
-- 2. SalesQuotationLines."UnitsJson"   text : the bikes of the
--    line, JSON [{"u":<MotorBikeUnitId>,"c":"<chassis>",
--    "e":"<engine>","k":"<colour>"}]; '' = none
--
-- Run after SalesQuotations_Engine.sql. Safe to run again.
-- ASCII only.
-- ============================================================

ROLLBACK;


ALTER TABLE public."SalesQuotations"
    ADD COLUMN IF NOT EXISTS "SpecificUnits" boolean NOT NULL DEFAULT false;

ALTER TABLE public."SalesQuotationLines"
    ADD COLUMN IF NOT EXISTS "UnitsJson" text NOT NULL DEFAULT '';


-- ------------------------------------------------------------
-- Check (2 = both columns there)
-- ------------------------------------------------------------

SELECT 'Specific unit columns (2)' AS "Item",
       (SELECT count(*)
          FROM information_schema.columns
         WHERE table_schema = 'public'
           AND ((table_name = 'SalesQuotations' AND column_name = 'SpecificUnits')
             OR (table_name = 'SalesQuotationLines' AND column_name = 'UnitsJson')))::text AS "Value";
