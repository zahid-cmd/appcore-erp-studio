-- ============================================================
-- Purchases - MB / SP / AC : switches and tables (Stage 1)
--
-- 1. Switches (Procurement MOD-007), one set per Purchases page;
--    the pages and the server read them BY CODE :
--
--      MB    SP    AC
--      0041  0051  0058  Back Dated Purchase Entry   days, empty = any
--      0042  0052  0059  Post Dated Purchase Entry   days, empty = any
--      0043  0053  0060  Max Lines per Purchase      lines
--      0044  0054  0061  Mushak 6.3 Required
--      0045  0055  0062  Products Received on Purchase (critical)
--      0046  0056  0063  Post On Approval            (critical)
--      0047  0057  0064  Print On Approval
--      0048              Units Required              (MB only)
--      0049              Unique Key No               (MB only)
--      0050              Unique Battery No           (MB only)
--      0065  0070  0075  Supplier Invoice No Required
--      0066  0071  0076  DO Reference Required
--      0067  0072  0077  Gate Pass No Required
--      0068  0073  0078  Price Above PO              Value = tolerance %
--      0069  0074  0079  VAT as per 6.3 (editable)
--
--    A switch made by an earlier run is renamed / reworded here
--    (0045 / 0055 / 0062 and 0048), its ON / OFF kept except
--    0045 / 0055 / 0062, which start OFF (nothing uses them yet).
--
--    Reused (already exist, Purchase Orders pages) :
--      PO Required   0001 / 0010 / 0019
--      Carry Balance 0002 / 0011 / 0020
--
-- 2. Tables
--      PurchasesMb / PurchasesSp / PurchasesAc           header
--      PurchasesMbLines / PurchasesSpLines / PurchasesAcLines
--      MotorBikeUnits : one row per bike (Chassis, Engine, Key,
--        Battery). Chassis No and Engine No are unique among
--        live rows.
--    The empty baseline tables (Code / Name / SampleField) made
--    by the page generator are replaced. A table that already
--    has the real columns is left as it is.
--
-- A switch that already exists is left as it is (its ON / OFF
-- and value are not reset). Safe to run more than once.
-- Run the whole script (F5).
-- ============================================================


-- ------------------------------------------------------------
-- 1. Switches
-- ------------------------------------------------------------

DO $$
DECLARE
    v_module_id   bigint;
    v_module_code text;
    v_menu_code   text;
    v_page_code   text;
    v_page        record;
    n             integer;
BEGIN
    SELECT m."Id", m."Code"
    INTO   v_module_id, v_module_code
    FROM   "NavigationModules" m
    WHERE  lower(trim(m."Name")) = 'procurement'
    AND    NOT m."IsDeleted"
    LIMIT  1;

    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Procurement module not found - nothing changed.';
    END IF;

    IF upper(trim(v_module_code)) <> 'MOD-007' THEN
        RAISE EXCEPTION 'Procurement module code is % (expected MOD-007) - nothing changed. Tell Claude the code.', v_module_code;
    END IF;

    -- A code taken by some other switch stops the script
    IF EXISTS
    (
        SELECT 1
        FROM   "SystemConfigurations" c
        WHERE  c."ConfigurationCode" BETWEEN 'CFG-MOD-007-0041' AND 'CFG-MOD-007-0079'
        AND    c."ConfigurationName" NOT IN
               (
                   'Back Dated Purchase Entry', 'Post Dated Purchase Entry',
                   'Max Lines per Purchase', 'Mushak 6.3 Required',
                   'Stock In On Approval', 'Products Received on Purchase',
                   'Post On Approval', 'Print On Approval',
                   'Units Required To Approve', 'Units Required',
                   'Unique Key No', 'Unique Battery No',
                   'Supplier Invoice No Required', 'DO Reference Required',
                   'Gate Pass No Required', 'Price Above PO', 'VAT as per 6.3'
               )
    )
    THEN
        RAISE EXCEPTION 'Some of CFG-MOD-007-0041 .. 0079 are already used by other switches - nothing changed. Tell Claude.';
    END IF;

    FOR v_page IN
        SELECT *
        FROM
        (
            VALUES
            ('MB', 'purchases-mb', 'Motor Bike', 41, 65),
            ('SP', 'purchases-sp', 'Spare Parts & Lubricant', 51, 70),
            ('AC', 'purchases-ac', 'Accessories', 58, 75)
        ) AS p (page_type, route, goods, first_no, more_no)
    LOOP
        v_page_code := NULL;
        v_menu_code := NULL;

        SELECT s."Code", mn."Code"
        INTO   v_page_code, v_menu_code
        FROM   "NavigationSubmenus" s
        JOIN   "NavigationMenus" mn ON mn."Id" = s."NavigationMenuId"
        WHERE  s."Route" ILIKE '/procurement/%/' || v_page.route
        AND    NOT s."IsDeleted"
        LIMIT  1;

        IF v_page_code IS NULL THEN
            RAISE EXCEPTION 'Purchases - % page not found by route (/procurement/.../%) - nothing changed.', v_page.page_type, v_page.route;
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
            'CFG-MOD-007-' || lpad((v_page.first_no + v.offs)::text, 4, '0'),
            v.name, v.on_text, v.off_text,
            v.def_on, v.def_value,
            v.value_type, v.unit, v.vmin, v.vmax, v.empty_text,
            v.def_on, v.def_value, NULL,
            v.critical, true, 10 + v.offs, v.remarks,
            false, 1, now()
        FROM
        (
            VALUES
            (0, 'Back Dated Purchase Entry',
             'The purchase date may be earlier than today (Value = most days back; empty = any day of the open year).',
             'The purchase date cannot be before today.',
             true, '7', 'Number', 'days', 1::int, 365::int, 'Any day', false,
             '', false),

            (1, 'Post Dated Purchase Entry',
             'The purchase date may be later than today (Value = most days ahead; empty = any day).',
             'The purchase date cannot be after today.',
             false, '', 'Number', 'days', 1, 365, 'Any day', false,
             '', false),

            (2, 'Max Lines per Purchase',
             'A purchase can have at most this many lines.',
             'No limit on the number of lines.',
             false, '30', 'Number', 'lines', 1, 500, '', false,
             '', false),

            (3, 'Mushak 6.3 Required',
             'Mushak 6.3 No and date must be entered to approve a purchase that charges VAT.',
             'Mushak 6.3 No and date are optional.',
             true, '', 'None', '', NULL, NULL, '', false,
             '', false),

            (4, 'Products Received on Purchase',
             'The purchase also receives the goods : they come into stock (on hand) in the warehouse chosen on the purchase; bike numbers are entered on the purchase.',
             'The goods are in transit after the purchase; Product Receiving (Store Management) brings them on hand.',
             false, '', 'None', '', NULL, NULL, '', true,
             'Critical : changing it needs a reason / approval. The inventory ledger is debited at the purchase either way.', false),

            (5, 'Post On Approval',
             'Approve also posts the purchase to the accounts (supplier payable, purchase, input VAT).',
             'Approve and Post are separate steps.',
             true, '', 'None', '', NULL, NULL, '', true,
             'Critical : changing it needs a reason / approval.', false),

            (6, 'Print On Approval',
             'The print opens on its own after a purchase is approved.',
             'Print only when asked.',
             false, '', 'None', '', NULL, NULL, '', false,
             '', false),

            (7, 'Units Required',
             'Every bike needs Chassis, Engine, Key and Battery No before it comes into stock (purchase approval when Products Received on Purchase is ON, otherwise Receiving).',
             'Bikes can come into stock with numbers still missing.',
             true, '', 'None', '', NULL, NULL, '', false,
             'Chassis No and Engine No are always unique.', true),

            (8, 'Unique Key No',
             'The same Key No cannot be on two bikes in stock.',
             'Key No may repeat.',
             false, '', 'None', '', NULL, NULL, '', false,
             '', true),

            (9, 'Unique Battery No',
             'The same Battery No cannot be on two bikes in stock.',
             'Battery No may repeat.',
             false, '', 'None', '', NULL, NULL, '', false,
             '', true)
        ) AS v (offs, name, on_text, off_text, def_on, def_value, value_type, unit, vmin, vmax, empty_text, critical, remarks, mb_only)
        WHERE (NOT v.mb_only OR v_page.page_type = 'MB')
        AND   NOT EXISTS
        (
            SELECT 1
            FROM   "SystemConfigurations" c
            WHERE  c."ConfigurationCode" = 'CFG-MOD-007-' || lpad((v_page.first_no + v.offs)::text, 4, '0')
        );

        GET DIAGNOSTICS n = ROW_COUNT;
        RAISE NOTICE 'Purchases - % : % switches added (page %, menu %)', v_page.page_type, n, v_page_code, v_menu_code;

        -- The 6.3 entry switches (codes from more_no)
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
            'CFG-MOD-007-' || lpad((v_page.more_no + v.offs)::text, 4, '0'),
            v.name, v.on_text, v.off_text,
            v.def_on, v.def_value,
            v.value_type, v.unit, v.vmin, v.vmax, v.empty_text,
            v.def_on, v.def_value, NULL,
            false, true, 30 + v.offs, v.remarks,
            false, 1, now()
        FROM
        (
            VALUES
            (0, 'Supplier Invoice No Required',
             'The supplier''s Invoice No and date must be entered to approve a purchase.',
             'Invoice No and date are optional.',
             true, '', 'None', '', NULL::int, NULL::int, '',
             'An Invoice No is always unique per supplier.'),

            (1, 'DO Reference Required',
             'The Delivery Order (DO) reference must be entered to approve a purchase.',
             'DO reference is optional.',
             false, '', 'None', '', NULL, NULL, '',
             ''),

            (2, 'Gate Pass No Required',
             'The gate pass number must be entered to approve a purchase.',
             'Gate pass number is optional.',
             false, '', 'None', '', NULL, NULL, '',
             ''),

            (3, 'Price Above PO',
             'A line''s price may be above its PO price by at most Value % (a notice shows it).',
             'A line''s price cannot be above its PO price (lower is always allowed).',
             false, '5', 'Number', '%', 1, 100, '',
             'PO-driven lines only.'),

            (4, 'VAT as per 6.3',
             'VAT per line can be typed to match the Mushak 6.3 (a notice shows when it differs from the rule''s rate).',
             'VAT is always the Purchase VAT rule''s rate.',
             true, '', 'None', '', NULL, NULL, '',
             '')
        ) AS v (offs, name, on_text, off_text, def_on, def_value, value_type, unit, vmin, vmax, empty_text, remarks)
        WHERE NOT EXISTS
        (
            SELECT 1
            FROM   "SystemConfigurations" c
            WHERE  c."ConfigurationCode" = 'CFG-MOD-007-' || lpad((v_page.more_no + v.offs)::text, 4, '0')
        );

        GET DIAGNOSTICS n = ROW_COUNT;
        RAISE NOTICE 'Purchases - % : % 6.3 entry switches added', v_page.page_type, n;

        -- Made by an earlier run : renamed / reworded
        UPDATE "SystemConfigurations"
        SET    "ConfigurationName" = 'Products Received on Purchase',
               "OnDescription"     = 'The purchase also receives the goods : they come into stock (on hand) in the warehouse chosen on the purchase; bike numbers are entered on the purchase.',
               "OffDescription"    = 'The goods are in transit after the purchase; Product Receiving (Store Management) brings them on hand.',
               "IsEnabled"         = false,
               "DefaultEnabled"    = false,
               "Remarks"           = 'Critical : changing it needs a reason / approval. The inventory ledger is debited at the purchase either way.'
        WHERE  "ConfigurationCode" = 'CFG-MOD-007-' || lpad((v_page.first_no + 4)::text, 4, '0')
        AND    "ConfigurationName" = 'Stock In On Approval';

        UPDATE "SystemConfigurations"
        SET    "ConfigurationName" = 'Units Required',
               "OnDescription"     = 'Every bike needs Chassis, Engine, Key and Battery No before it comes into stock (purchase approval when Products Received on Purchase is ON, otherwise Receiving).',
               "OffDescription"    = 'Bikes can come into stock with numbers still missing.'
        WHERE  v_page.page_type = 'MB'
        AND    "ConfigurationCode" = 'CFG-MOD-007-0048'
        AND    "ConfigurationName" = 'Units Required To Approve';
    END LOOP;
END $$;


-- ------------------------------------------------------------
-- 2. Baseline tables out (only the generator's empty ones)
-- ------------------------------------------------------------

DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['PurchasesMb', 'PurchasesSp', 'PurchasesAc']
    LOOP
        IF EXISTS
        (
            SELECT 1 FROM information_schema.tables
            WHERE  table_schema = 'public' AND table_name = t
        )
        AND NOT EXISTS
        (
            SELECT 1 FROM information_schema.columns
            WHERE  table_schema = 'public' AND table_name = t AND column_name = 'PurchaseNo'
        )
        THEN
            EXECUTE format('DROP TABLE public.%I CASCADE', t);
            RAISE NOTICE '% : baseline table replaced', t;
        END IF;
    END LOOP;
END $$;


-- ------------------------------------------------------------
-- 3. Header and lines (same columns on the three pages)
-- ------------------------------------------------------------

DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['PurchasesMb', 'PurchasesSp', 'PurchasesAc']
    LOOP
        EXECUTE format($f$
            CREATE TABLE IF NOT EXISTS public.%1$I
            (
                "PurchaseId"               bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                "PageType"                 character varying(5)   NOT NULL,
                "PurchaseNo"               character varying(30)  NOT NULL,
                "PurchaseDate"             date                   NOT NULL,
                "BranchId"                 bigint                 NOT NULL,
                "BranchCode"               character varying(30)  NOT NULL DEFAULT '',
                "BranchName"               character varying(150) NOT NULL DEFAULT '',
                "FinancialYearId"          bigint                 NOT NULL,

                "SupplierCode"             character varying(30)  NOT NULL,
                "SupplierName"             character varying(200) NOT NULL DEFAULT '',
                "PurchaseOrderId"          bigint                 NULL,
                "OrderNo"                  character varying(30)  NOT NULL DEFAULT '',
                "SupplierInvoiceNo"        character varying(50)  NOT NULL DEFAULT '',
                "SupplierInvoiceDate"      date                   NULL,
                "MushakNo"                 character varying(50)  NOT NULL DEFAULT '',
                "MushakDate"               date                   NULL,
                "DoReference"              character varying(50)  NOT NULL DEFAULT '',
                "GatePassNo"               character varying(50)  NOT NULL DEFAULT '',

                "PriceIncludesVat"         boolean                NOT NULL DEFAULT true,
                "InvoicePriceBasis"        character varying(5)   NOT NULL DEFAULT 'DP',
                "ProfitBasis"              character varying(5)   NOT NULL DEFAULT 'MRP',
                "DefaultProfitPercent"     numeric(7,2)           NOT NULL DEFAULT 0,
                "AdditionalDiscountType"   character varying(10)  NOT NULL DEFAULT 'None',
                "AdditionalDiscountValue"  numeric(18,2)          NOT NULL DEFAULT 0,
                "AdditionalDiscountAmount" numeric(18,2)          NOT NULL DEFAULT 0,
                "RoundingMethod"           character varying(10)  NOT NULL DEFAULT 'None',
                "WholeTakaLines"           boolean                NOT NULL DEFAULT false,
                "RoundingAdjustment"       numeric(18,2)          NOT NULL DEFAULT 0,
                "PurchaseVatApplicable"    boolean                NOT NULL DEFAULT true,
                "SalesVatApplicable"       boolean                NOT NULL DEFAULT true,
                "NoVatInvoice"             boolean                NOT NULL DEFAULT false,
                "VatCharged"               boolean                NOT NULL DEFAULT true,

                "TotalQuantity"            numeric(18,2)          NOT NULL DEFAULT 0,
                "TotalFreeQuantity"        numeric(18,2)          NOT NULL DEFAULT 0,
                "TotalMrp"                 numeric(18,2)          NOT NULL DEFAULT 0,
                "TotalProfit"              numeric(18,2)          NOT NULL DEFAULT 0,
                "TotalDp"                  numeric(18,2)          NOT NULL DEFAULT 0,
                "TotalAmount"              numeric(18,2)          NOT NULL DEFAULT 0,
                "TotalVat"                 numeric(18,2)          NOT NULL DEFAULT 0,
                "TotalVatClaimable"        numeric(18,2)          NOT NULL DEFAULT 0,
                "TotalPayable"             numeric(18,2)          NOT NULL DEFAULT 0,

                "Narration"                character varying(1000) NOT NULL DEFAULT '',

                "Status"                   character varying(20)  NOT NULL DEFAULT 'Draft',
                "StockedIn"                boolean                NOT NULL DEFAULT false,
                "StockedInDate"            timestamp with time zone NULL,
                "VoucherNo"                character varying(30)  NOT NULL DEFAULT '',
                "CancelReason"             character varying(500) NOT NULL DEFAULT '',
                "ApprovedBy"               bigint                 NULL,
                "ApprovedDate"             timestamp with time zone NULL,
                "PostedBy"                 bigint                 NULL,
                "PostedDate"               timestamp with time zone NULL,
                "CancelledBy"              bigint                 NULL,
                "CancelledDate"            timestamp with time zone NULL,

                "IsDeleted"                boolean                NOT NULL DEFAULT false,
                "DeletedBy"                bigint                 NULL,
                "DeletedDate"              timestamp with time zone NULL,
                "CreatedBy"                bigint                 NOT NULL,
                "CreatedDate"              timestamp with time zone NOT NULL DEFAULT now(),
                "ModifiedBy"               bigint                 NULL,
                "ModifiedDate"             timestamp with time zone NULL,

                CONSTRAINT %2$I CHECK ("Status" IN ('Draft', 'Approved', 'Posted', 'Cancelled'))
            )$f$,
            t, 'CK_' || t || '_Status');

        -- Tables made by an earlier run
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS "DoReference" character varying(50) NOT NULL DEFAULT %L', t, '');
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS "GatePassNo" character varying(50) NOT NULL DEFAULT %L', t, '');

        EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I ("PurchaseNo") WHERE "IsDeleted" = false',
                       'IX_' || t || '_PurchaseNo', t);

        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I ("SupplierCode", "PurchaseDate")',
                       'IX_' || t || '_Supplier', t);

        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I ("PurchaseOrderId")',
                       'IX_' || t || '_PurchaseOrderId', t);

        -- Supplier's invoice No : once per supplier (live rows)
        EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I ("SupplierCode", upper("SupplierInvoiceNo")) WHERE "IsDeleted" = false AND "Status" <> %L AND "SupplierInvoiceNo" <> %L',
                       'IX_' || t || '_SupplierInvoiceNo', t, 'Cancelled', '');

        EXECUTE format($f$
            CREATE TABLE IF NOT EXISTS public.%1$I
            (
                "PurchaseLineId"      bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                "PurchaseId"          bigint                 NOT NULL REFERENCES public.%2$I ("PurchaseId") ON DELETE CASCADE,
                "LineNo"              integer                NOT NULL,
                "PurchaseOrderLineId" bigint                 NULL,
                "ProductType"         character varying(50)  NOT NULL DEFAULT '',
                "ProductId"           bigint                 NOT NULL,
                "ProductCode"         character varying(30)  NOT NULL,
                "ProductName"         character varying(200) NOT NULL DEFAULT '',
                "Unit"                character varying(30)  NOT NULL DEFAULT '',
                "Quantity"            numeric(18,2)          NOT NULL,
                "FreeQuantity"        numeric(18,2)          NOT NULL DEFAULT 0,
                "Mrp"                 numeric(18,2)          NOT NULL DEFAULT 0,
                "ProfitPercent"       numeric(7,2)           NOT NULL DEFAULT 0,
                "UnitPrice"           numeric(18,4)          NOT NULL,
                "IsAdjusted"          boolean                NOT NULL DEFAULT false,
                "IsTotalTyped"        boolean                NOT NULL DEFAULT false,
                "GrossMrp"            numeric(18,2)          NOT NULL DEFAULT 0,
                "DpAmount"            numeric(18,2)          NOT NULL DEFAULT 0,
                "ProfitAmount"        numeric(18,2)          NOT NULL DEFAULT 0,
                "DiscountShare"       numeric(18,2)          NOT NULL DEFAULT 0,
                "NetAmount"           numeric(18,2)          NOT NULL DEFAULT 0,
                "VatRate"             numeric(7,2)           NOT NULL DEFAULT 0,
                "VatClaimable"        boolean                NOT NULL DEFAULT true,
                "Amount"              numeric(18,2)          NOT NULL DEFAULT 0,
                "VatAmount"           numeric(18,2)          NOT NULL DEFAULT 0,
                "LineTotal"           numeric(18,2)          NOT NULL DEFAULT 0,
                "RoundingShare"       numeric(18,2)          NOT NULL DEFAULT 0,
                "NetUnitCost"         numeric(18,4)          NOT NULL DEFAULT 0,
                "ReturnedQuantity"    numeric(18,2)          NOT NULL DEFAULT 0,
                "ShortNotes"          character varying(200) NOT NULL DEFAULT ''
            )$f$,
            t || 'Lines', t);

        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I ("PurchaseId")',
                       'IX_' || t || 'Lines_PurchaseId', t || 'Lines');

        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I ("ProductId")',
                       'IX_' || t || 'Lines_ProductId', t || 'Lines');

        RAISE NOTICE '% / %Lines : ready', t, t;
    END LOOP;
END $$;


-- ------------------------------------------------------------
-- 4. Motor bike units : one row per bike
--    Status : Pending (on a draft purchase) -> InStock (approved)
--             -> Sold / Returned / Transferred (later pages)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public."MotorBikeUnits"
(
    "MotorBikeUnitId"   bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    "ProductId"         bigint                 NOT NULL,
    "ProductCode"       character varying(30)  NOT NULL,
    "ProductName"       character varying(200) NOT NULL DEFAULT '',
    "ChassisNo"         character varying(50)  NOT NULL,
    "EngineNo"          character varying(50)  NOT NULL,
    "KeyNo"             character varying(50)  NOT NULL DEFAULT '',
    "BatteryNo"         character varying(50)  NOT NULL DEFAULT '',
    "BranchId"          bigint                 NOT NULL,
    "PurchaseId"        bigint                 NOT NULL REFERENCES public."PurchasesMb" ("PurchaseId") ON DELETE CASCADE,
    "PurchaseLineId"    bigint                 NOT NULL REFERENCES public."PurchasesMbLines" ("PurchaseLineId") ON DELETE CASCADE,
    "PurchaseNo"        character varying(30)  NOT NULL DEFAULT '',
    "SupplierCode"      character varying(30)  NOT NULL DEFAULT '',
    "UnitCost"          numeric(18,4)          NOT NULL DEFAULT 0,
    "Status"            character varying(20)  NOT NULL DEFAULT 'Pending',
    "StockInDate"       date                   NULL,
    "IsDeleted"         boolean                NOT NULL DEFAULT false,
    "DeletedBy"         bigint                 NULL,
    "DeletedDate"       timestamp with time zone NULL,
    "CreatedBy"         bigint                 NOT NULL,
    "CreatedDate"       timestamp with time zone NOT NULL DEFAULT now(),
    "ModifiedBy"        bigint                 NULL,
    "ModifiedDate"      timestamp with time zone NULL,

    CONSTRAINT "CK_MotorBikeUnits_Status"
        CHECK ("Status" IN ('Pending', 'InStock', 'Sold', 'Returned', 'Transferred'))
);

-- Chassis and Engine : unique among live bikes (any letter case)
CREATE UNIQUE INDEX IF NOT EXISTS "IX_MotorBikeUnits_ChassisNo"
    ON public."MotorBikeUnits" (upper("ChassisNo"))
    WHERE "IsDeleted" = false;

CREATE UNIQUE INDEX IF NOT EXISTS "IX_MotorBikeUnits_EngineNo"
    ON public."MotorBikeUnits" (upper("EngineNo"))
    WHERE "IsDeleted" = false;

-- Key / Battery : unique only when their switch is ON (server check)
CREATE INDEX IF NOT EXISTS "IX_MotorBikeUnits_KeyNo"
    ON public."MotorBikeUnits" (upper("KeyNo"))
    WHERE "IsDeleted" = false;

CREATE INDEX IF NOT EXISTS "IX_MotorBikeUnits_BatteryNo"
    ON public."MotorBikeUnits" (upper("BatteryNo"))
    WHERE "IsDeleted" = false;

CREATE INDEX IF NOT EXISTS "IX_MotorBikeUnits_PurchaseLineId"
    ON public."MotorBikeUnits" ("PurchaseLineId");

CREATE INDEX IF NOT EXISTS "IX_MotorBikeUnits_Product"
    ON public."MotorBikeUnits" ("ProductId", "Status");


-- ------------------------------------------------------------
-- 5. Check
-- ------------------------------------------------------------

SELECT "ConfigurationCode", "ConfigurationName", "IsEnabled", "Value", "IsCritical", "NavigationSubmenuCode"
FROM   "SystemConfigurations"
WHERE  "ConfigurationCode" BETWEEN 'CFG-MOD-007-0041' AND 'CFG-MOD-007-0079'
AND    NOT "IsDeleted"
ORDER  BY "ConfigurationCode";
