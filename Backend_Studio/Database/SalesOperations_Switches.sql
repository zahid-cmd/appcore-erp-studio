-- ============================================================
-- System Configuration : Sales Operations switches
-- (blueprint agreed 2026-11-03)
--
-- Page switches (ScopeType Submenu) of Sales Operations (MOD-008).
-- People with "Change Configuration" on a page may change its
-- switches; critical ones need a reason / approval.
--
-- Sales Invoices - MB  (CFG-MOD-008-0001 .. 0020)
--   0001 Post on Approval                     critical
--   0002 Allow Credit Sale                    critical
--   0003   Enforce Credit Limit  (child)      critical
--   0004 Allow Price Edit        max %        critical
--   0005 Allow Discount          max %        critical
--   0006 Block Sale Below Cost                critical
--   0007 (reserved : Allow Sale Without Stock is SP / AC only)
--   0008 Back Dated Sales - MB                critical
--   0009 Allow Cancel of Posted Invoice days  critical
--   0010 Print After Posting
--   0011 Delivery on Sale
--   0012 Enquiry Required                     critical
--   0013 Registration Fees on Invoice
--   0014 Allow In-House EMI                   critical
--   0015 Allow Credit Card EMI
--   0016 Oldest Chassis First
--   0017 Sell at Batch MRP                    critical  (added 2026-11-03)
--   0018 Round Down to Whole Taka                       (added 2026-11-03)
--   0019 Print Payment Details on Customer Copy         (added 2026-11-04)
-- Sales Invoices - SP  (0021 .. 0040) and - AC (0041 .. 0060)
--   +0 Post on Approval , +1 Allow Credit Sale , +2 Enforce
--   Credit Limit (child) , +3 Allow Price Edit , +4 Allow Discount
--   , +5 Block Sale Below Cost , +6 Allow Sale Without Stock
--   , +7 Back Dated Sales - SP / - AC , +8 Allow Cancel of
--   Posted Invoice , +9 Print After Posting , +10 Allow Walk-in
--   Customers , +11 Sell at Batch MRP , +12 Round Down to Whole
--   Taka (both added 2026-11-03) , +13 Print Payment Details on
--   Customer Copy (added 2026-11-04)
-- Sales Returns - MB (0061 ..) / - SP (0065 ..) / - AC (0069 ..)
--   +0 Post on Approval , +1 Return Window (days) , +2 Allow Cash
--   Refund , +3 Restock Returned Items
--
-- Owner decisions used : discount / price limits per page; walk-in
-- customers are always cash only; "below cost" = FIFO batch cost
-- (+ open Price Adjustment share) after campaign, membership and
-- special discounts.
-- Added 2026-11-03 : Sell at Batch MRP (0017 / 0032 / 0052) and
-- Round Down to Whole Taka (0018 / 0033 / 0053).
-- Added 2026-11-04 : Print Payment Details on Customer Copy
-- (0019 / 0034 / 0054, default OFF). Run the script
-- again : only the missing switches are added, and the wording of
-- Block Sale Below Cost (0006 / 0026 / 0046) is corrected (text
-- only; ON / OFF and value stay as they are).
--
-- The codes are fixed (pages and server read them by code). The
-- script stops if Sales Operations' module code is not MOD-008 or a
-- page is missing. A switch that already exists is left as it is
-- (its ON / OFF and value are not reset). Safe to run more than
-- once. Run the whole script (F5).
-- ============================================================

DO $$
DECLARE
    v_module_id   bigint;
    v_module_code text;
    p             record;
    v_page_code   text;
    v_menu_code   text;
    n             integer;
    v_total       integer := 0;
BEGIN
    SELECT m."Id", m."Code"
    INTO   v_module_id, v_module_code
    FROM   "NavigationModules" m
    WHERE  lower(trim(m."RouteKey")) = 'sales-operations'
    AND    NOT m."IsDeleted"
    LIMIT  1;

    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Sales Operations module not found - nothing changed.';
    END IF;

    IF upper(trim(v_module_code)) <> 'MOD-008' THEN
        RAISE EXCEPTION 'Sales Operations module code is % (expected MOD-008) - nothing changed. Tell Claude the code.', v_module_code;
    END IF;

    -- ---------- All switches (page route key, ...) ----------
    CREATE TEMP TABLE tmp_sales_switches
    (
        page        text,
        code        text,
        name        text,
        on_text     text,
        off_text    text,
        def_on      boolean,
        def_value   text,
        value_type  text,
        unit        text,
        vmin        int,
        vmax        int,
        empty_text  text,
        parent      text,
        critical    boolean,
        ord         int,
        remarks     text
    ) ON COMMIT DROP;

    -- Invoice switches shared by the three invoice pages
    INSERT INTO tmp_sales_switches
    SELECT x.page,
           'CFG-MOD-008-' || lpad((x.base + s.off)::text, 4, '0'),
           replace(s.name, '{T}', x.t),
           replace(s.on_text, '{T}', x.t),
           replace(s.off_text, '{T}', x.t),
           s.def_on, s.def_value, s.value_type, s.unit, s.vmin, s.vmax, s.empty_text,
           CASE WHEN s.parent_off IS NULL THEN NULL
                ELSE 'CFG-MOD-008-' || lpad((x.base + s.parent_off)::text, 4, '0') END,
           s.critical, s.off + 1, s.remarks
    FROM
    (
        VALUES ('sales-invoices-mb', 'MB', 1),
               ('sales-invoices-sp', 'SP', 21),
               ('sales-invoices-ac', 'AC', 41)
    ) AS x (page, t, base)
    CROSS JOIN
    (
        VALUES
        (0, 'Post on Approval',
         'An invoice is saved as Draft, then approved, then posted (stock, ledgers and VAT move on posting).',
         'Saving an invoice posts it at once.',
         false, '', 'None', '', NULL::int, NULL::int, '', NULL::int, true,
         'Critical : changing it needs a reason / approval.'),

        (1, 'Allow Credit Sale',
         'An invoice may be saved with an unpaid balance; the balance goes to the customer''s receivable ledger. Walk-in customers are always cash only.',
         'An invoice must be fully paid through the Payment Desk.',
         false, '', 'None', '', NULL, NULL, '', NULL, true,
         'Critical.'),

        (2, 'Enforce Credit Limit',
         'A credit sale is refused when the customer''s receivable would go above the Credit Limit on the Customer Profile (0 = cash only).',
         'Above the Credit Limit the invoice only shows a warning.',
         true, '', 'None', '', NULL, NULL, '', 1, true,
         'Works only while Allow Credit Sale is ON.'),

        (3, 'Allow Price Edit',
         'The sale price from Product Pricing may be changed on the invoice (Value = most % below the listed price; empty = no limit).',
         'The sale price is locked to Product Pricing.',
         false, '', 'Number', '%', 1, 100, 'No limit', NULL, true,
         'Critical.'),

        (4, 'Allow Discount',
         'A discount may be given on lines or on the invoice (Value = most discount %; empty = no limit).',
         'No discount can be given on the invoice.',
         false, '', 'Number', '%', 1, 100, 'No limit', NULL, true,
         'Critical.'),

        (5, 'Block Sale Below Cost',
         'A line is refused when its net price (after campaign, membership and special discounts, excluding VAT) is below its cost : the FIFO batch cost of the units sold plus any open Price Adjustment share.',
         'A line below cost is allowed with a warning.',
         true, '', 'None', '', NULL, NULL, '', NULL, true,
         'Cost = exact FIFO batch cost (+ open Price Adjustment share). The fractional (whole-taka) discount is not counted.'),

        (7, 'Back Dated Sales - {T}',
         'The invoice date may be earlier than today (within the open financial year).',
         'The invoice date is always today.',
         false, '', 'None', '', NULL, NULL, '', NULL, true,
         'Critical.'),

        (8, 'Allow Cancel of Posted Invoice',
         'A posted invoice may be cancelled with a reason; stock, ledgers, VAT and receipts are reversed (Value = within days of the invoice; empty = any time).',
         'A posted invoice cannot be cancelled; use Sales Returns.',
         false, '', 'Number', 'days', 1, 365, 'Any time', NULL, true,
         'Critical.'),

        (9, 'Print After Posting',
         'The invoice print opens as soon as the invoice is posted.',
         'The invoice prints only on the Print command.',
         true, '', 'None', '', NULL, NULL, '', NULL, false,
         '')
    ) AS s (off, name, on_text, off_text, def_on, def_value, value_type, unit, vmin, vmax, empty_text, parent_off, critical, remarks);

    -- Allow Sale Without Stock : SP and AC only (bikes are sold by chassis)
    INSERT INTO tmp_sales_switches
    SELECT x.page, 'CFG-MOD-008-' || lpad((x.base + 6)::text, 4, '0'),
           'Allow Sale Without Stock',
           'An item may be sold even when its stock is short (stock goes negative until received).',
           'An item cannot be sold beyond its stock.',
           false, '', 'None', '', NULL, NULL, '', NULL, true, 7, 'Critical.'
    FROM (VALUES ('sales-invoices-sp', 21), ('sales-invoices-ac', 41)) AS x (page, base);

    -- Walk-in customers : SP and AC only
    INSERT INTO tmp_sales_switches
    SELECT x.page, 'CFG-MOD-008-' || lpad((x.base + 10)::text, 4, '0'),
           'Allow Walk-in Customers',
           'The page shows an Add Customer button : when the phone is not in the database, a quick Outside customer tagged Walk-in is created (never on invoice save). Walk-in customers are cash only.',
           'The customer must already exist in Customer Profiles.',
           true, '', 'None', '', NULL, NULL, '', NULL, false, 11, ''
    FROM (VALUES ('sales-invoices-sp', 21), ('sales-invoices-ac', 41)) AS x (page, base);

    -- Sell at Batch MRP : all three invoice pages (MB 0017, SP 0032, AC 0052)
    INSERT INTO tmp_sales_switches
    SELECT x.page, x.code,
           'Sell at Batch MRP',
           'Each stock batch sells at its own MRP (FIFO); when a line takes units from batches with different MRPs it shows each price (e.g. 6 @ 500 + 4 @ 550).',
           'One price per line : the lowest MRP among the batches being sold (never above any printed MRP).',
           true, '', 'None', '', NULL, NULL, '', NULL, true, x.ord, 'Critical. Matters only while a product has batches at different MRPs (Product Pricing switches 0012 / 0013 OFF).'
    FROM (VALUES ('sales-invoices-mb', 'CFG-MOD-008-0017', 17),
                 ('sales-invoices-sp', 'CFG-MOD-008-0032', 12),
                 ('sales-invoices-ac', 'CFG-MOD-008-0052', 12)) AS x (page, code, ord);

    -- Round Down to Whole Taka : all three invoice pages (MB 0018, SP 0033, AC 0053)
    INSERT INTO tmp_sales_switches
    SELECT x.page, x.code,
           'Round Down to Whole Taka',
           'The paisa of the invoice total are taken off as a fractional discount (always rounded down, never up).',
           'The invoice total is kept to the paisa.',
           true, '', 'None', '', NULL, NULL, '', NULL, false, x.ord, 'Posted to the Fractional Discount ledger (Posting Setup).'
    FROM (VALUES ('sales-invoices-mb', 'CFG-MOD-008-0018', 18),
                 ('sales-invoices-sp', 'CFG-MOD-008-0033', 13),
                 ('sales-invoices-ac', 'CFG-MOD-008-0053', 13)) AS x (page, code, ord);

    -- Print Payment Details on Customer Copy : all three invoice pages (MB 0019, SP 0034, AC 0054)
    INSERT INTO tmp_sales_switches
    SELECT x.page, x.code,
           'Print Payment Details on Customer Copy',
           'The customer copy of the invoice (A4 and thermal) lists each payment (mode, account, reference, amount).',
           'The customer copy shows only the amount paid and the due / balance.',
           false, '', 'None', '', NULL, NULL, '', NULL, false, x.ord, 'Charges the customer paid on top (MFS / POS) never print on the customer copy; the office copy always shows the full breakdown.'
    FROM (VALUES ('sales-invoices-mb', 'CFG-MOD-008-0019', 19),
                 ('sales-invoices-sp', 'CFG-MOD-008-0034', 14),
                 ('sales-invoices-ac', 'CFG-MOD-008-0054', 14)) AS x (page, code, ord);

    -- Motor bike invoice only
    INSERT INTO tmp_sales_switches VALUES
    ('sales-invoices-mb', 'CFG-MOD-008-0011', 'Delivery on Sale',
     'Posting the invoice also records the bike delivery (shown on Bike Deliveries).',
     'Delivery is a later step on Bike Deliveries.',
     false, '', 'None', '', NULL, NULL, '', NULL, false, 11, ''),

    ('sales-invoices-mb', 'CFG-MOD-008-0012', 'Enquiry Required',
     'No enquiry, no sale : every invoice must link a Sales Enquiry, which matures on posting.',
     'Linking a Sales Enquiry is optional.',
     true, '', 'None', '', NULL, NULL, '', NULL, true, 12, 'Critical.'),

    ('sales-invoices-mb', 'CFG-MOD-008-0013', 'Registration Fees on Invoice',
     'Registration fees can be collected on the invoice (Registration Management).',
     'Registration fees are collected only on the Registration Fees page.',
     true, '', 'None', '', NULL, NULL, '', NULL, false, 13, ''),

    ('sales-invoices-mb', 'CFG-MOD-008-0014', 'Allow In-House EMI',
     'The invoice offers the In-House EMI payment term (EMI Management).',
     'In-House EMI is not offered.',
     false, '', 'None', '', NULL, NULL, '', NULL, true, 14, 'Critical.'),

    ('sales-invoices-mb', 'CFG-MOD-008-0015', 'Allow Credit Card EMI',
     'The Payment Desk offers the Credit Card EMI mode.',
     'Credit Card EMI is not offered.',
     true, '', 'None', '', NULL, NULL, '', NULL, false, 15, ''),

    ('sales-invoices-mb', 'CFG-MOD-008-0016', 'Oldest Chassis First',
     'Picking a newer chassis while an older one of the same model and colour is in stock shows a warning.',
     'Any chassis may be picked without a warning.',
     false, '', 'None', '', NULL, NULL, '', NULL, false, 16, '');

    -- Sales returns (three pages)
    INSERT INTO tmp_sales_switches
    SELECT x.page,
           'CFG-MOD-008-' || lpad((x.base + s.off)::text, 4, '0'),
           s.name, s.on_text, s.off_text,
           s.def_on, s.def_value, s.value_type, s.unit, s.vmin, s.vmax, s.empty_text,
           NULL, s.critical, s.off + 1, s.remarks
    FROM
    (
        VALUES ('sales-returns-mb', 61),
               ('sales-returns-sp', 65),
               ('sales-returns-ac', 69)
    ) AS x (page, base)
    CROSS JOIN
    (
        VALUES
        (0, 'Post on Approval',
         'A return is saved as Draft, then approved, then posted.',
         'Saving a return posts it at once.',
         false, '', 'None', '', NULL::int, NULL::int, '', true,
         'Critical : changing it needs a reason / approval.'),

        (1, 'Return Window',
         'Goods can be returned only within this many days of the invoice.',
         'Goods can be returned at any time.',
         true, '7', 'Number', 'days', 1, 365, '', true,
         'Critical.'),

        (2, 'Allow Cash Refund',
         'The return amount may be refunded through the Payment Desk.',
         'The return amount is only credited to the customer''s ledger.',
         false, '', 'None', '', NULL, NULL, '', true,
         'Critical.'),

        (3, 'Restock Returned Items',
         'Returned items go back to sellable stock.',
         'Returned items are held as Returned (not sellable) until checked.',
         true, '', 'None', '', NULL, NULL, '', false,
         '')
    ) AS s (off, name, on_text, off_text, def_on, def_value, value_type, unit, vmin, vmax, empty_text, critical, remarks);

    -- ---------- Insert, page by page ----------
    FOR p IN SELECT DISTINCT page FROM tmp_sales_switches ORDER BY page
    LOOP
        v_page_code := NULL;

        SELECT s."Code", mn."Code"
        INTO   v_page_code, v_menu_code
        FROM   "NavigationSubmenus" s
        JOIN   "NavigationMenus" mn ON mn."Id" = s."NavigationMenuId"
        WHERE  s."Route" ILIKE '/sales-operations/%/' || p.page
        AND    NOT s."IsDeleted"
        LIMIT  1;

        IF v_page_code IS NULL THEN
            RAISE EXCEPTION 'Page % not found by route (run SalesOperations_Navigation.sql first) - nothing changed.', p.page;
        END IF;

        INSERT INTO "SystemConfigurations"
        (
            "NavigationModuleId", "ScopeType", "NavigationMenuCode", "NavigationSubmenuCode",
            "ConfigurationCode", "ConfigurationName", "OnDescription", "OffDescription",
            "IsEnabled", "Value",
            "ValueType", "ValueUnit", "ValueMin", "ValueMax", "ValueEmptyText",
            "DefaultEnabled", "DefaultValue", "ParentConfigurationCode",
            "IsCritical", "IsSystemDefined", "DisplayOrder", "Remarks",
            "IsDeleted", "CreatedBy", "CreatedDate"
        )
        SELECT
            v_module_id, 'Submenu', v_menu_code, v_page_code,
            t.code, t.name, t.on_text, t.off_text,
            t.def_on, t.def_value,
            t.value_type, t.unit, t.vmin, t.vmax, t.empty_text,
            t.def_on, t.def_value, t.parent,
            t.critical, true, t.ord, t.remarks,
            false, 1, now()
        FROM   tmp_sales_switches t
        WHERE  t.page = p.page
        AND    NOT EXISTS
               (
                   SELECT 1 FROM "SystemConfigurations" c WHERE c."ConfigurationCode" = t.code
               )
        ORDER  BY t.ord;

        GET DIAGNOSTICS n = ROW_COUNT;
        v_total := v_total + n;
        RAISE NOTICE '% (%) : % switch(es) added', p.page, v_page_code, n;
    END LOOP;

    RAISE NOTICE 'Sales Operations switches added : %', v_total;

    -- ---------- Wording fix : Block Sale Below Cost (text only) ----------
    UPDATE "SystemConfigurations"
    SET    "OnDescription"  = 'A line is refused when its net price (after campaign, membership and special discounts, excluding VAT) is below its cost : the FIFO batch cost of the units sold plus any open Price Adjustment share.',
           "OffDescription" = 'A line below cost is allowed with a warning.',
           "Remarks"        = 'Cost = exact FIFO batch cost (+ open Price Adjustment share). The fractional (whole-taka) discount is not counted.'
    WHERE  "ConfigurationCode" IN ('CFG-MOD-008-0006', 'CFG-MOD-008-0026', 'CFG-MOD-008-0046')
    AND    "OnDescription" IS DISTINCT FROM 'A line is refused when its net price (after campaign, membership and special discounts, excluding VAT) is below its cost : the FIFO batch cost of the units sold plus any open Price Adjustment share.';

    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE 'Block Sale Below Cost wording corrected : %', n;
END $$;

SELECT "NavigationSubmenuCode" AS "Page", "ConfigurationCode", "ConfigurationName",
       "IsEnabled", "Value", "ValueType", "IsCritical", "ParentConfigurationCode"
FROM   "SystemConfigurations"
WHERE  "ConfigurationCode" LIKE 'CFG-MOD-008-%'
ORDER  BY "ConfigurationCode";
