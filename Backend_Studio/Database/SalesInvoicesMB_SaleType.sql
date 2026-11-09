ROLLBACK;

-- ============================================================
-- Sales Invoices - MB : Regular / Corporate sale (2026-11-09)
--
-- 1. Switches (Sales Invoices - MB page, Sales Operations
--    MOD-008), added only when missing :
--      CFG-MOD-008-0073 Allow Corporate Sale       critical, OFF
--      CFG-MOD-008-0074   Corporate Sale From      Date (child)
--      CFG-MOD-008-0075   Corporate Sale Until     Date (child)
--    The Corporate tab works while 0073 is ON and the invoice
--    date is inside From / Until (empty = open).
-- 2. SalesInvoicesMb."SaleType" : Regular (one chassis) /
--    Corporate (several chassis). Existing invoices = Regular.
-- 3. CustomerProfiles : "IsCorporate" (Corporate / Institution,
--    Inbound only), "TinNo", "BinNo" (optional).
--
-- Safe to run more than once. ASCII only. Run the whole script.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Switches
-- ------------------------------------------------------------

DO $$
DECLARE
    v_module_id   bigint;
    v_module_code text;
    v_page_code   text;
    v_menu_code   text;
    n             integer;
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

    SELECT s."Code", mn."Code"
    INTO   v_page_code, v_menu_code
    FROM   "NavigationSubmenus" s
    JOIN   "NavigationMenus" mn ON mn."Id" = s."NavigationMenuId"
    WHERE  s."Route" ILIKE '/sales-operations/%/sales-invoices-mb'
    AND    NOT s."IsDeleted"
    LIMIT  1;

    IF v_page_code IS NULL THEN
        RAISE EXCEPTION 'Sales Invoices - MB page not found by route - nothing changed.';
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
    SELECT v_module_id, 'Submenu', v_menu_code, v_page_code,
           t.code, t.name, t.on_text, t.off_text,
           false, '',
           t.value_type, '', NULL, NULL, t.empty_text,
           false, '', t.parent,
           t.critical, true, t.ord, t.remarks,
           false, 1, now()
    FROM
    (
        VALUES
        ('CFG-MOD-008-0073', 'Allow Corporate Sale',
         'The invoice offers the Corporate tab : several chassis on one invoice, for a Corporate / Institution customer (Customer Profiles), while the invoice date is inside Corporate Sale From / Until.',
         'Every invoice is a Regular sale : one chassis per invoice.',
         'None', '', NULL::text, true, 21,
         'Critical. Stage 3 : one customer file per chassis (invoice no /1, /2 ...); dues on the invoice block Ready for Delivery of all its files.'),
        ('CFG-MOD-008-0074', 'Corporate Sale From',
         'Corporate sales start on this date (Value).',
         'No start date : open from the past.',
         'Date', 'No start date', 'CFG-MOD-008-0073', false, 22,
         'Works only while Allow Corporate Sale is ON.'),
        ('CFG-MOD-008-0075', 'Corporate Sale Until',
         'Corporate sales end on this date (Value, the last day included).',
         'No end date : open until the switch is turned OFF.',
         'Date', 'No end date', 'CFG-MOD-008-0073', false, 23,
         'Works only while Allow Corporate Sale is ON.')
    ) AS t (code, name, on_text, off_text, value_type, empty_text, parent, critical, ord, remarks)
    WHERE NOT EXISTS
    (
        SELECT 1 FROM "SystemConfigurations" c WHERE c."ConfigurationCode" = t.code
    );

    GET DIAGNOSTICS n = ROW_COUNT;

    RAISE NOTICE 'Corporate sale switches added : %', n;
END $$;


-- ------------------------------------------------------------
-- 2. Sale Type of the MB invoice
-- ------------------------------------------------------------

ALTER TABLE public."SalesInvoicesMb" ADD COLUMN IF NOT EXISTS "SaleType" character varying(10) NOT NULL DEFAULT 'Regular';

ALTER TABLE public."SalesInvoicesMb" DROP CONSTRAINT IF EXISTS "CK_SalesInvoicesMb_SaleType";

ALTER TABLE public."SalesInvoicesMb"
    ADD CONSTRAINT "CK_SalesInvoicesMb_SaleType" CHECK ("SaleType" IN ('Regular', 'Corporate'));


-- ------------------------------------------------------------
-- 3. Customer Profiles : Corporate / Institution, TIN, BIN
-- ------------------------------------------------------------

ALTER TABLE public."CustomerProfiles" ADD COLUMN IF NOT EXISTS "IsCorporate" boolean NOT NULL DEFAULT false;

ALTER TABLE public."CustomerProfiles" ADD COLUMN IF NOT EXISTS "TinNo" character varying(20) NOT NULL DEFAULT '';

ALTER TABLE public."CustomerProfiles" ADD COLUMN IF NOT EXISTS "BinNo" character varying(20) NOT NULL DEFAULT '';

-- Only an Inbound customer can be Corporate
UPDATE public."CustomerProfiles"
SET    "IsCorporate" = false
WHERE  "IsCorporate" = true
AND    "CustomerType" <> 'Inbound';

ALTER TABLE public."CustomerProfiles" DROP CONSTRAINT IF EXISTS "CK_CustomerProfiles_Corporate";

ALTER TABLE public."CustomerProfiles"
    ADD CONSTRAINT "CK_CustomerProfiles_Corporate" CHECK (NOT "IsCorporate" OR "CustomerType" = 'Inbound');


/*  Check (select and run on its own)

SELECT "ConfigurationCode", "ConfigurationName", "IsEnabled", "Value", "ValueType", "ParentConfigurationCode"
FROM   "SystemConfigurations"
WHERE  "ConfigurationCode" IN ('CFG-MOD-008-0073', 'CFG-MOD-008-0074', 'CFG-MOD-008-0075');
*/
