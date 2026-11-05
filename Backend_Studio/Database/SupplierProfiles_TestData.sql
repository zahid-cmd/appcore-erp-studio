-- ==============================================================
-- Supplier Profiles : TEST DATA (520 suppliers)
-- --------------------------------------------------------------
-- For testing server-side pagination, search, tabs and filters.
-- Mix : 30% Brand Distributors, 50% Local Vendors, 20% Service
-- Providers; supply types Motor Bikes / Spare Parts / Accessories
-- / General (Service Providers : General); every 15th supplier
-- is Inactive (with its ledger).
-- Built the same way as the Supplier Profiles form :
--   - codes SUP-000001 continue after the highest code used
--   - Display Name = "<NAME> - <BRAND> - <SUPPLY TYPE> - <PHONE 1>"
--     (brand part only when a brand is set), in CAPITALS
--   - brands : active brands from Brand Management (Brand
--     Distributors always, every 3rd Local Vendor); none if
--     there are no active brands
--   - every supplier gets its payable ledger
--     GLR-ccc-ggg-sss-nnnnn under SUB-003-002-001, named like
--     the supplier, numbers continuing after the highest used
-- Test phones : 0177xxxxxxx. A phone already used for the same
-- supply type is skipped.
-- Every test supplier has Remarks 'TEST DATA' (see CLEAN UP at
-- the bottom to remove them all again).
--
-- Run once in pgAdmin (Query Tool) on the App database.
-- ==============================================================

DO $$
DECLARE
    v_count     int    := 520;
    v_user_id   bigint := 1;
    v_marker    text   := 'TEST DATA';

    sg          record;
    v_parent    text;
    v_ledger_no int;
    v_sup_no    int;
    v_brand_ids bigint[];
    v_brand_nms text[];
    v_brand_cnt int;

    v_first text[] := ARRAY[
        'RAHIM','KARIM','AL-AMIN','BISMILLAH','NEW','MODERN','DHAKA',
        'BENGAL','PADMA','MEGHNA','JAMUNA','SONALI','RUPALI','GREEN',
        'STAR','CITY','UNITED','NATIONAL','EASTERN','METRO','SUNRISE',
        'ROYAL','PRIME','SKY','GOLDEN','SHAPLA','MOTHER','FAMILY'];

    v_last text[] := ARRAY[
        'MOTORS','TRADERS','ENTERPRISE','AUTO PARTS','CORPORATION',
        'DISTRIBUTION','AUTOMOBILES','LUBRICANTS','TRADING HOUSE',
        'AGENCIES','INTERNATIONAL','STORE','SUPPLY','IMPEX'];

    v_service text[] := ARRAY[
        'SERVICES','LOGISTICS','COURIER','ENGINEERING','WORKSHOP',
        'TRANSPORT','SOLUTIONS'];

    v_people text[] := ARRAY[
        'MD RAHIM','MD KARIM','MD JAMAL','MD KAMAL','MD RASEL',
        'MD SHAKIL','MD SUMON','MD HASAN','MD FARUK','MD NAZMUL'];

    v_areas text[] := ARRAY[
        'MIRPUR','UTTARA','MOHAMMADPUR','BANGSHAL','NAWABPUR','TEJGAON',
        'BADDA','JATRABARI','KERANIGANJ','SAVAR','TONGI','NARAYANGANJ'];

    v_supply text[] := ARRAY['Motor Bikes','Spare Parts','Accessories','General'];

    i           int;
    v_type      text;
    v_supply_t  text;
    v_name      text;
    v_phone     text;
    v_brand_id  bigint;
    v_brand_nm  text;
    v_code      text;
    v_ledger    text;
    v_display   text;
    v_active    boolean;
    v_added     int := 0;
    v_skipped   int := 0;
BEGIN
    ------------------------------------------------------------
    -- Payable sub group (by CODE)
    ------------------------------------------------------------
    SELECT "AccountClassId", "AccountGroupId", "AccountSubGroupId",
           "ClassCode", "Mode", "GroupCode", "SubGroupCode"
      INTO sg
      FROM "AccountSubGroups"
     WHERE "SubGroupCode" = 'SUB-003-002-001'
       AND NOT "IsDeleted"
     LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sub group SUB-003-002-001 (Liability For Purchase) not found or deleted.';
    END IF;

    v_parent :=
        'GLR-'
        || lpad(substring(sg."ClassCode"    FROM '([0-9]+)$'), 3, '0') || '-'
        || lpad(substring(sg."GroupCode"    FROM '([0-9]+)$'), 3, '0') || '-'
        || lpad(substring(sg."SubGroupCode" FROM '([0-9]+)$'), 3, '0') || '-';

    ------------------------------------------------------------
    -- Highest numbers used so far
    ------------------------------------------------------------
    SELECT COALESCE(MAX(substring(c FROM '([0-9]+)$')::int), 0)
      INTO v_ledger_no
      FROM (
            SELECT "LedgerCode" AS c
              FROM "GeneralLedgers"
             WHERE "LedgerCode" LIKE v_parent || '%'
            UNION ALL
            SELECT "PayableLedgerCode"
              FROM "SupplierProfiles"
             WHERE "PayableLedgerCode" LIKE v_parent || '%'
           ) t
     WHERE c ~ '^GLR-[0-9]{3}-[0-9]{3}-[0-9]{3}-[0-9]+$';

    SELECT COALESCE(MAX(substring("SupplierCode" FROM 5)::int), 0)
      INTO v_sup_no
      FROM "SupplierProfiles"
     WHERE "SupplierCode" ~ '^SUP-[0-9]+$';

    ------------------------------------------------------------
    -- Active brands
    ------------------------------------------------------------
    SELECT array_agg("BrandManagementId" ORDER BY "BrandManagementId"),
           array_agg("BrandName"         ORDER BY "BrandManagementId")
      INTO v_brand_ids, v_brand_nms
      FROM "BrandManagements"
     WHERE NOT "IsDeleted" AND "Status";

    v_brand_cnt := COALESCE(array_length(v_brand_ids, 1), 0);

    ------------------------------------------------------------
    -- Suppliers
    ------------------------------------------------------------
    FOR i IN 1 .. v_count LOOP
        v_type :=
            CASE
                WHEN i % 10 < 3 THEN 'Brand Distributor'
                WHEN i % 10 < 8 THEN 'Local Vendor'
                ELSE 'Service Provider'
            END;

        v_supply_t :=
            CASE
                WHEN v_type = 'Service Provider' THEN 'General'
                ELSE v_supply[1 + i % 4]
            END;

        v_phone := '0177' || lpad(i::text, 7, '0');

        IF EXISTS (SELECT 1 FROM "SupplierProfiles"
                    WHERE NOT "IsDeleted"
                      AND "Phone1" = v_phone
                      AND "SupplyType" = v_supply_t)
        THEN
            v_skipped := v_skipped + 1;
            CONTINUE;
        END IF;

        -- Brand
        v_brand_id := NULL;
        v_brand_nm := '';

        IF v_brand_cnt > 0
           AND (v_type = 'Brand Distributor'
                OR (v_type = 'Local Vendor' AND i % 3 = 0))
        THEN
            v_brand_id := v_brand_ids[1 + i % v_brand_cnt];
            v_brand_nm := upper(v_brand_nms[1 + i % v_brand_cnt]);
        END IF;

        -- Name
        v_name :=
            v_first[1 + (i * 7) % array_length(v_first, 1)] || ' ' ||
            CASE
                WHEN v_type = 'Service Provider'
                    THEN v_service[1 + (i * 3) % array_length(v_service, 1)]
                ELSE v_last[1 + (i * 5) % array_length(v_last, 1)]
            END;

        v_active := (i % 15 <> 0);

        v_sup_no    := v_sup_no + 1;
        v_ledger_no := v_ledger_no + 1;

        v_code    := 'SUP-' || lpad(v_sup_no::text, 6, '0');
        v_ledger  := v_parent || lpad(v_ledger_no::text, 5, '0');
        v_display :=
            v_name
            || CASE WHEN v_brand_nm <> '' THEN ' - ' || v_brand_nm ELSE '' END
            || ' - ' || upper(v_supply_t)
            || ' - ' || v_phone;

        INSERT INTO "SupplierProfiles"
        (
            "SupplierCode", "SupplierType", "SupplyType",
            "SupplierName", "DisplayName", "BrandManagementId",
            "ContactPerson", "Phone1", "Phone2", "Email",
            "Address", "TradeLicenseNo", "BinNo", "TinNo",
            "PayableLedgerCode", "PayableLedgerName",
            "CreditDays",
            "DefaultPriceEntry", "DefaultInvoicePrice",
            "DefaultProfitPercent", "DefaultProfitOn",
            "Remarks", "IsActive", "IsDeleted",
            "CreatedBy", "CreatedDate"
        )
        VALUES
        (
            v_code, v_type, v_supply_t,
            v_name, v_display, v_brand_id,
            v_people[1 + i % array_length(v_people, 1)], v_phone, '', '',
            'SHOP ' || (1 + i % 90) || ', ' ||
                v_areas[1 + (i * 5) % array_length(v_areas, 1)] || ', DHAKA',
            '', '', '',
            v_ledger, v_display,
            (ARRAY[0, 15, 30, 45])[1 + i % 4],
            NULL, NULL,
            NULL, NULL,
            v_marker, v_active, false,
            v_user_id, CURRENT_TIMESTAMP
        );

        INSERT INTO "GeneralLedgers"
        (
            "AccountClassId", "AccountGroupId", "AccountSubGroupId",
            "ClassCode", "Mode", "GroupCode", "SubGroupCode",
            "LedgerCode", "LedgerName", "Remarks",
            "IsActive", "IsDeleted", "CreatedBy", "CreatedDate"
        )
        VALUES
        (
            sg."AccountClassId", sg."AccountGroupId", sg."AccountSubGroupId",
            sg."ClassCode", sg."Mode", sg."GroupCode", sg."SubGroupCode",
            v_ledger, v_display,
            'System generated from Supplier Profiles ' || v_code || ' (payable).',
            v_active, false, v_user_id, CURRENT_TIMESTAMP
        );

        v_added := v_added + 1;
    END LOOP;

    RAISE NOTICE 'Added % test suppliers (% skipped : phone in use; % active brands used).',
        v_added, v_skipped, v_brand_cnt;
END $$;


-- --------------------------------------------------------------
-- Check
-- --------------------------------------------------------------

SELECT "SupplierType",
       COUNT(*)                          AS test_suppliers,
       COUNT(*) FILTER (WHERE "IsActive") AS active
FROM "SupplierProfiles"
WHERE "Remarks" = 'TEST DATA' AND NOT "IsDeleted"
GROUP BY "SupplierType"
ORDER BY "SupplierType";


-- ==============================================================
-- CLEAN UP (removes ALL test suppliers and their ledgers)
-- Select the 3 lines below (without the "--") and run them.
-- Only safe while no purchase / voucher uses these suppliers.
-- ==============================================================

-- DELETE FROM "GeneralLedgers" WHERE "LedgerCode" IN (SELECT "PayableLedgerCode" FROM "SupplierProfiles" WHERE "Remarks" = 'TEST DATA');
-- DELETE FROM "SupplierProfiles" WHERE "Remarks" = 'TEST DATA';
-- SELECT COUNT(*) AS test_suppliers_left FROM "SupplierProfiles" WHERE "Remarks" = 'TEST DATA';
