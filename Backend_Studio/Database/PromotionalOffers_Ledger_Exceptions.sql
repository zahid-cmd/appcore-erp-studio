-- ============================================================
-- Business Promotions : offer ledger + coverage exceptions
-- (2026-11-13; run after PromotionalOffers_Engine.sql)
--
-- 1. PromotionalOffers.LedgerCode / LedgerName : every offer gets
--    its own General Ledger, created automatically on save :
--      Company funded     : in the sub group of the page's
--                           Campaign Discount ledger (Posting
--                           Setup CAMPAIGN-DISCOUNT-MB / SP / AC)
--      Distributor funded : in SUB-002-002-008 Offer Adjustment
--                           Account (the brand's claim sub group)
--    Invoices post the offer's discount to it.
--
-- 2. PromotionalOfferTargets.IsExcluded : exceptions ("All Motor
--    Bikes except ..."); an excluded row carries no discount.
--
-- Safe to run again. ASCII only.
-- ============================================================

ROLLBACK;


ALTER TABLE public."PromotionalOffers"
    ADD COLUMN IF NOT EXISTS "LedgerCode" character varying(30)  NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "LedgerName" character varying(200) NOT NULL DEFAULT '';

ALTER TABLE public."PromotionalOfferTargets"
    ADD COLUMN IF NOT EXISTS "IsExcluded" boolean NOT NULL DEFAULT false;


SELECT 'New offer columns (3)' AS "Item",
       (SELECT count(*) FROM information_schema.columns
         WHERE table_schema = 'public'
           AND ((table_name = 'PromotionalOffers' AND column_name IN ('LedgerCode', 'LedgerName'))
             OR (table_name = 'PromotionalOfferTargets' AND column_name = 'IsExcluded')))::text AS "Value";
