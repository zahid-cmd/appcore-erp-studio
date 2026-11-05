-- ============================================================
-- Product Pricing : New Pricing per purchase invoice (2026-11-01).
-- Plain statements : run in a NEW pgAdmin Query Tool (F5).
-- Safe to run again. Run ProductPricing_Engine.sql and
-- ProductPriceIndex_Engine.sql first.
--
-- ProductPricing      + PricingKind (New / Reprice), the invoice
--                       (PurchaseId, PurchaseNo, supplier) and the
--                       basis / % applied to all.
-- ProductPricingLines + the invoice line, quantity received, the
--                       line's %, the MRP it gave, and IsRaised
--                       (older stock raised to the new MRP on post).
-- ============================================================

ALTER TABLE public."ProductPricing" ADD COLUMN IF NOT EXISTS "PricingKind"  character varying(10)  NOT NULL DEFAULT 'Reprice';

ALTER TABLE public."ProductPricing" ADD COLUMN IF NOT EXISTS "PurchaseId"   bigint                 NOT NULL DEFAULT 0;

ALTER TABLE public."ProductPricing" ADD COLUMN IF NOT EXISTS "PurchaseNo"   character varying(30)  NOT NULL DEFAULT '';

ALTER TABLE public."ProductPricing" ADD COLUMN IF NOT EXISTS "SupplierCode" character varying(40)  NOT NULL DEFAULT '';

ALTER TABLE public."ProductPricing" ADD COLUMN IF NOT EXISTS "SupplierName" character varying(200) NOT NULL DEFAULT '';

ALTER TABLE public."ProductPricing" ADD COLUMN IF NOT EXISTS "PricingBasis" character varying(10)  NOT NULL DEFAULT '';

ALTER TABLE public."ProductPricing" ADD COLUMN IF NOT EXISTS "BasisPercent" numeric(9,4)           NOT NULL DEFAULT 0;

ALTER TABLE public."ProductPricingLines" ADD COLUMN IF NOT EXISTS "PurchaseLineId"   bigint        NOT NULL DEFAULT 0;

ALTER TABLE public."ProductPricingLines" ADD COLUMN IF NOT EXISTS "ReceivedQuantity" numeric(18,2) NOT NULL DEFAULT 0;

ALTER TABLE public."ProductPricingLines" ADD COLUMN IF NOT EXISTS "ProfitPercent"    numeric(9,4)  NOT NULL DEFAULT 0;

ALTER TABLE public."ProductPricingLines" ADD COLUMN IF NOT EXISTS "SuggestedMrp"     numeric(18,2) NOT NULL DEFAULT 0;

ALTER TABLE public."ProductPricingLines" ADD COLUMN IF NOT EXISTS "IsRaised"         boolean       NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "IX_ProductPricing_Purchase"
    ON public."ProductPricing" ("PageType", "PurchaseId")
    WHERE "PurchaseId" > 0;


/*  Check (select and run on its own) : 7 and 5

SELECT table_name, count(*)
FROM   information_schema.columns
WHERE  table_schema = 'public'
AND    column_name IN ('PricingKind', 'PurchaseId', 'PurchaseNo', 'SupplierCode', 'SupplierName', 'PricingBasis', 'BasisPercent',
                       'PurchaseLineId', 'ReceivedQuantity', 'ProfitPercent', 'SuggestedMrp', 'IsRaised')
AND    table_name IN ('ProductPricing', 'ProductPricingLines')
GROUP  BY table_name;
*/
