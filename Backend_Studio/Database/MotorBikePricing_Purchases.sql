ROLLBACK;

-- ============================================================
-- Motor Bike pricing : purchases (2026-11-10)
--
-- Product Pricing - Motor Bikes is the only source of the motor
-- bike DP and MRP. A Purchase Invoice - MB keeps the Mushak 6.3
-- (the legal cost) and takes the DP / MRP of the supplier's price
-- card :
--   allowance = 6.3 total - card DP x quantity
--               Dr Supplier / Cr Inventory (stock at card DP basis)
--   campaign discount per unit (optional)
--               Dr Supplier / Cr Campaign Discount - Motor Bikes
--
-- 1. Purchase lines : CardNo, CardDp, Allowance, CampaignDiscount
--    (all three purchase pages share the line shape; SP / AC keep 0)
-- 2. Purchase headers : TotalAllowance, TotalCampaignDiscount,
--    CampaignName
-- 3. Opening Stock - MB : SupplierCode / SupplierName on the
--    header, CardNo / CardDp / Allowance on the lines (entered like
--    a purchase : allowance = cost - card DP x quantity, Cr
--    Inventory)
-- 4. Posting Setup purpose CAMPAIGN-DISC-MB (choose an income or a
--    reserve ledger on Posting Setup)
-- Safe to run more than once.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Purchase lines
-- ------------------------------------------------------------

DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['PurchasesMbLines', 'PurchasesSpLines', 'PurchasesAcLines']
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS "CardNo" character varying(30) NOT NULL DEFAULT %L', t, '');
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS "CardDp" numeric(18,2) NOT NULL DEFAULT 0', t);
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS "Allowance" numeric(18,2) NOT NULL DEFAULT 0', t);
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS "CampaignDiscount" numeric(18,2) NOT NULL DEFAULT 0', t);
        ELSE
            RAISE NOTICE 'Table % not found : skipped.', t;
        END IF;
    END LOOP;
END $$;


-- ------------------------------------------------------------
-- 2. Purchase headers
-- ------------------------------------------------------------

DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['PurchasesMb', 'PurchasesSp', 'PurchasesAc']
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS "TotalAllowance" numeric(18,2) NOT NULL DEFAULT 0', t);
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS "TotalCampaignDiscount" numeric(18,2) NOT NULL DEFAULT 0', t);
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS "CampaignName" character varying(100) NOT NULL DEFAULT %L', t, '');
        ELSE
            RAISE NOTICE 'Table % not found : skipped.', t;
        END IF;
    END LOOP;
END $$;


-- ------------------------------------------------------------
-- 3. Opening Stock - MB
-- ------------------------------------------------------------

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'OpeningStock') THEN
        ALTER TABLE public."OpeningStock" ADD COLUMN IF NOT EXISTS "SupplierCode" character varying(40)  NOT NULL DEFAULT '';
        ALTER TABLE public."OpeningStock" ADD COLUMN IF NOT EXISTS "SupplierName" character varying(250) NOT NULL DEFAULT '';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'OpeningStockLines') THEN
        ALTER TABLE public."OpeningStockLines" ADD COLUMN IF NOT EXISTS "CardNo"    character varying(30) NOT NULL DEFAULT '';
        ALTER TABLE public."OpeningStockLines" ADD COLUMN IF NOT EXISTS "CardDp"    numeric(18,2)         NOT NULL DEFAULT 0;
        ALTER TABLE public."OpeningStockLines" ADD COLUMN IF NOT EXISTS "Allowance" numeric(18,2)         NOT NULL DEFAULT 0;
    END IF;
END $$;


-- ------------------------------------------------------------
-- 4. Posting Setup : Campaign Discount - Motor Bikes
-- ------------------------------------------------------------

INSERT INTO "PostingSetups"
(
    "PurposeCode", "PurposeName", "GroupName", "Description", "UsedBy",
    "AllowedSubGroupCodes", "LedgerCode", "IsRequired", "DisplayOrder"
)
VALUES
    ('CAMPAIGN-DISC-MB', 'Campaign Discount - Motor Bikes', 'Purchase Discounts',
     'Brand campaign discount on a Purchase Invoice - MB (per unit, per line) : Dr Supplier / Cr this ledger. A special income (or a reserve), not a reduction of the stock cost; the Mushak 6.3 and the VAT are not changed.',
     'Purchases - MB',
     '', '', false, 71)
ON CONFLICT ("PurposeCode") DO UPDATE
SET "PurposeName"          = EXCLUDED."PurposeName",
    "GroupName"            = EXCLUDED."GroupName",
    "Description"          = EXCLUDED."Description",
    "UsedBy"               = EXCLUDED."UsedBy",
    "AllowedSubGroupCodes" = EXCLUDED."AllowedSubGroupCodes",
    "IsRequired"           = EXCLUDED."IsRequired",
    "DisplayOrder"         = EXCLUDED."DisplayOrder";


/*  Check (select and run on its own)

SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('PurchasesMb', 'PurchasesMbLines')
  AND column_name IN ('CardNo', 'CardDp', 'Allowance', 'CampaignDiscount',
                      'TotalAllowance', 'TotalCampaignDiscount', 'CampaignName')
ORDER BY table_name, column_name;

SELECT "PurposeCode", "PurposeName", "LedgerCode"
FROM "PostingSetups" WHERE "PurposeCode" = 'CAMPAIGN-DISC-MB';
*/
