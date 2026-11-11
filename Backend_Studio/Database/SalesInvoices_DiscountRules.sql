ROLLBACK;

-- ============================================================
-- Sales Invoices (SP / AC / MB) : price and discount switches
-- (owner 2026-11-11)
--
-- Nine page switches, renamed (codes unchanged) :
--                         MB                SP     AC
--   Special Discount - X  CFG-MOD-008-0005  0025   0045
--     line % or invoice % / Tk (+ activity "Give Special
--     Discount"); Value = at most %
--   Edit Price - X        0004              0024   0044
--     ONLY RAISES the price above the MRP, per line, this
--     invoice only; the raised price is the sale. Value = at
--     most % above the MRP. A reduction = Special Discount.
--   Fractional Discount - X 0018            0033   0053
--     Tk typed on the invoice Summary; Value = at most Tk (set
--     to 99 when no number is set; empty = no limit)
-- One method per invoice : price raise OR special OR fractional.
-- Line special discount : % OR Tk per line : column
-- "SpecialDiscountTk" on the three line tables.
-- The short-lived "ApplyFractional" column is dropped.
--
-- Safe to run more than once. ASCII only.
-- ============================================================

BEGIN;

-- Special Discount - MB / SP / AC
UPDATE "SystemConfigurations" c
SET    "ConfigurationName" = 'Special Discount - ' || v.page,
       "OnDescription"     = 'A special discount can be given : per line % or on the whole invoice (% or Tk), with the "Give Special Discount" activity. Value = at most %. Not together with a price raise or a fractional discount.',
       "OffDescription"    = 'No special discount on the invoice.'
FROM  (VALUES ('CFG-MOD-008-0005', 'MB'), ('CFG-MOD-008-0025', 'SP'), ('CFG-MOD-008-0045', 'AC')) AS v (code, page)
WHERE  c."ConfigurationCode" = v.code;

-- Edit Price - MB / SP / AC : raise only
UPDATE "SystemConfigurations" c
SET    "ConfigurationName" = 'Edit Price - ' || v.page,
       "OnDescription"     = 'The price of a line can be RAISED above the MRP on this invoice (never reduced : give a Special Discount instead). Value = at most % above the MRP. Not together with a special or fractional discount.',
       "OffDescription"    = 'Lines are sold at the MRP.'
FROM  (VALUES ('CFG-MOD-008-0004', 'MB'), ('CFG-MOD-008-0024', 'SP'), ('CFG-MOD-008-0044', 'AC')) AS v (code, page)
WHERE  c."ConfigurationCode" = v.code;

-- Fractional Discount - MB / SP / AC : typed Tk, at most the Value
UPDATE "SystemConfigurations" c
SET    "ConfigurationName" = 'Fractional Discount - ' || v.page,
       "OnDescription"     = 'A fractional discount (Tk) can be typed on the invoice Summary, at most the Value. Not together with a special discount or a price raise.',
       "OffDescription"    = 'No fractional discount on the invoice.',
       "ValueType"         = 'Number',
       "ValueUnit"         = 'Tk',
       "ValueMin"          = 0,
       "ValueMax"          = 100000,
       "ValueEmptyText"    = 'No limit',
       "Value"             = CASE WHEN trim(coalesce(c."Value", '')) ~ '^[0-9]+(\.[0-9]+)?$' THEN trim(c."Value") ELSE '99' END,
       "DefaultValue"      = '99'
FROM  (VALUES ('CFG-MOD-008-0018', 'MB'), ('CFG-MOD-008-0033', 'SP'), ('CFG-MOD-008-0053', 'AC')) AS v (code, page)
WHERE  c."ConfigurationCode" = v.code;

COMMIT;

DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['SalesInvoicesSp', 'SalesInvoicesAc', 'SalesInvoicesMb']
    LOOP
        IF to_regclass('public."' || t || '"') IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.%I DROP COLUMN IF EXISTS "ApplyFractional"', t);
        END IF;
    END LOOP;

    FOREACH t IN ARRAY ARRAY['SalesInvoicesSpLines', 'SalesInvoicesAcLines', 'SalesInvoicesMbLines']
    LOOP
        IF to_regclass('public."' || t || '"') IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS "SpecialDiscountTk" numeric(18,2) NOT NULL DEFAULT 0', t);
        END IF;
    END LOOP;
END $$;

SELECT "ConfigurationCode", "ConfigurationName", "IsEnabled", "Value", "ValueType", "ValueUnit"
FROM   "SystemConfigurations"
WHERE  "ConfigurationCode" IN ('CFG-MOD-008-0004', 'CFG-MOD-008-0005', 'CFG-MOD-008-0018',
                               'CFG-MOD-008-0024', 'CFG-MOD-008-0025', 'CFG-MOD-008-0033',
                               'CFG-MOD-008-0044', 'CFG-MOD-008-0045', 'CFG-MOD-008-0053')
ORDER  BY "ConfigurationCode";
