-- ==============================================================
-- Customer Profiles : TEST DATA (2000 Inbound + 1000 Outside)
-- --------------------------------------------------------------
-- For testing server-side pagination, search and filters.
-- Required fields only :
--   Inbound : Name, Phone 1, NID, Present Address
--   Outside : Name, Phone 1
-- Built the same way as the Customer Profiles form :
--   - codes CIB-000001 / COS-000001 continue after the highest
--     code ever used (deleted and previous codes included)
--   - Display Name = "<NAME> - <PHONE 1>", names in CAPITALS
--   - every customer gets its receivable ledger
--     GLR-ccc-ggg-sss-nnnnn under SUB-002-002-006, named like the
--     customer, numbers continuing after the highest one used
-- Test phones : Inbound 0199xxxxxxx, Outside 0188xxxxxxx
-- Test NIDs   : 1990xxxxxxxxx (13 digits)
-- A phone / NID already in use is skipped.
-- Every test customer has Remarks 'TEST DATA' (see CLEAN UP at
-- the bottom to remove them all again).
--
-- Run once in pgAdmin (Query Tool) on the App database.
-- ==============================================================

DO $$
DECLARE
    -- How many to add
    v_inbound_count  int    := 2000;
    v_outside_count  int    := 1000;

    -- CreatedBy (1 = System)
    v_user_id        bigint := 1;

    v_marker         text   := 'TEST DATA';

    sg               record;
    v_parent         text;
    v_ledger_no      int;
    v_cib_no         int;
    v_cos_no         int;

    v_first text[] := ARRAY[
        'MD RAHIM','MD KARIM','ABDUL HAMID','MD JAMAL','MD KAMAL','MD RASEL',
        'MD SHAKIL','MD SUMON','MD RAKIB','MD HASAN','MD MAHMUD','MD SOHEL',
        'MD FARUK','MD NAZMUL','MD MASUD','MD ARIF','MD SHAHIN','MD BABUL',
        'MD RIPON','MD TANVIR','MD SAIFUL','MD MONIR','MD ALAMGIR','MD JAHID',
        'FATEMA','AYESHA','NASRIN','SHARMIN','RUMANA','TASLIMA','NUSRAT','SADIA'];

    v_last text[] := ARRAY[
        'HOSSAIN','RAHMAN','ISLAM','AHMED','UDDIN','ALI','MIAH','KHAN',
        'SARKAR','MOLLA','SHEIKH','CHOWDHURY','TALUKDER','BHUIYAN','MRIDHA',
        'HAWLADER','BEPARI','SIKDER','MATUBBAR','PRAMANIK','MONDOL','BISWAS',
        'HAQUE','KABIR','HOWLADER','JAMAN','PATWARY','SHAH'];

    v_areas text[] := ARRAY[
        'MIRPUR','UTTARA','MOHAMMADPUR','DHANMONDI','BADDA','RAMPURA',
        'JATRABARI','KERANIGANJ','SAVAR','TONGI','GAZIPUR SADAR','NARAYANGANJ',
        'MOTIJHEEL','KHILGAON','BASHUNDHARA','PALLABI','KAFRUL','DEMRA'];

    i          int;
    v_name     text;
    v_phone    text;
    v_nid      text;
    v_code     text;
    v_ledger   text;
    v_display  text;
    v_address  text;
    v_added_in  int := 0;
    v_added_out int := 0;
    v_skipped   int := 0;
BEGIN
    ------------------------------------------------------------
    -- Receivable sub group (by CODE)
    ------------------------------------------------------------
    SELECT "AccountClassId", "AccountGroupId", "AccountSubGroupId",
           "ClassCode", "Mode", "GroupCode", "SubGroupCode"
      INTO sg
      FROM "AccountSubGroups"
     WHERE "SubGroupCode" = 'SUB-002-002-006'
       AND NOT "IsDeleted"
     LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sub group SUB-002-002-006 (Trade Receivables) not found or deleted.';
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
            SELECT "ReceivableLedgerCode"
              FROM "CustomerProfiles"
             WHERE "ReceivableLedgerCode" LIKE v_parent || '%'
           ) t
     WHERE c ~ '^GLR-[0-9]{3}-[0-9]{3}-[0-9]{3}-[0-9]+$';

    SELECT COALESCE(MAX(substring(c FROM 5)::int), 0)
      INTO v_cib_no
      FROM (
            SELECT "CustomerCode" AS c FROM "CustomerProfiles"
            UNION ALL
            SELECT "PreviousCode" FROM "CustomerProfiles"
           ) t
     WHERE c ~ '^CIB-[0-9]+$';

    SELECT COALESCE(MAX(substring(c FROM 5)::int), 0)
      INTO v_cos_no
      FROM (
            SELECT "CustomerCode" AS c FROM "CustomerProfiles"
            UNION ALL
            SELECT "PreviousCode" FROM "CustomerProfiles"
           ) t
     WHERE c ~ '^COS-[0-9]+$';

    ------------------------------------------------------------
    -- Inbound
    ------------------------------------------------------------
    FOR i IN 1 .. v_inbound_count LOOP
        v_phone := '0199' || lpad(i::text, 7, '0');
        v_nid   := '1990' || lpad(i::text, 9, '0');

        IF EXISTS (SELECT 1 FROM "CustomerProfiles"
                    WHERE NOT "IsDeleted" AND "Phone1" = v_phone)
        OR EXISTS (SELECT 1 FROM "CustomerProfiles"
                    WHERE NOT "IsDeleted" AND "CustomerType" = 'Inbound'
                      AND "NidNo" = v_nid)
        THEN
            v_skipped := v_skipped + 1;
            CONTINUE;
        END IF;

        v_name :=
            v_first[1 + (i * 7)  % array_length(v_first, 1)] || ' ' ||
            v_last [1 + (i * 13) % array_length(v_last, 1)];

        v_address :=
            'HOUSE ' || (1 + i % 120) || ', ROAD ' || (1 + i % 25) || ', ' ||
            v_areas[1 + (i * 5) % array_length(v_areas, 1)] || ', DHAKA';

        v_cib_no    := v_cib_no + 1;
        v_ledger_no := v_ledger_no + 1;

        v_code    := 'CIB-' || lpad(v_cib_no::text, 6, '0');
        v_ledger  := v_parent || lpad(v_ledger_no::text, 5, '0');
        v_display := v_name || ' - ' || v_phone;

        INSERT INTO "CustomerProfiles"
        (
            "CustomerType", "CustomerCode", "PreviousCode",
            "CustomerName", "DisplayName", "FatherName", "MotherName",
            "DateOfBirth", "PhotoPath",
            "Phone1", "Phone2", "Email",
            "NidNo", "DrivingLicenseNo",
            "PresentAddress", "PermanentAddress", "RegistrationAddress",
            "LocationId",
            "ReceivableLedgerCode", "ReceivableLedgerName",
            "CreditLimit", "IsWalkIn", "Remarks",
            "IsActive", "IsDeleted", "CreatedBy", "CreatedDate"
        )
        VALUES
        (
            'Inbound', v_code, '',
            v_name, v_display, '', '',
            NULL, '',
            v_phone, '', '',
            v_nid, '',
            v_address, '', '',
            NULL,
            v_ledger, v_display,
            0, false, v_marker,
            true, false, v_user_id, CURRENT_TIMESTAMP
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
            'System generated from Customer Profiles ' || v_code || ' (receivable).',
            true, false, v_user_id, CURRENT_TIMESTAMP
        );

        v_added_in := v_added_in + 1;
    END LOOP;

    ------------------------------------------------------------
    -- Outside
    ------------------------------------------------------------
    FOR i IN 1 .. v_outside_count LOOP
        v_phone := '0188' || lpad(i::text, 7, '0');

        IF EXISTS (SELECT 1 FROM "CustomerProfiles"
                    WHERE NOT "IsDeleted" AND "Phone1" = v_phone)
        THEN
            v_skipped := v_skipped + 1;
            CONTINUE;
        END IF;

        v_name :=
            v_first[1 + (i * 11) % array_length(v_first, 1)] || ' ' ||
            v_last [1 + (i * 3)  % array_length(v_last, 1)];

        v_cos_no    := v_cos_no + 1;
        v_ledger_no := v_ledger_no + 1;

        v_code    := 'COS-' || lpad(v_cos_no::text, 6, '0');
        v_ledger  := v_parent || lpad(v_ledger_no::text, 5, '0');
        v_display := v_name || ' - ' || v_phone;

        INSERT INTO "CustomerProfiles"
        (
            "CustomerType", "CustomerCode", "PreviousCode",
            "CustomerName", "DisplayName", "FatherName", "MotherName",
            "DateOfBirth", "PhotoPath",
            "Phone1", "Phone2", "Email",
            "NidNo", "DrivingLicenseNo",
            "PresentAddress", "PermanentAddress", "RegistrationAddress",
            "LocationId",
            "ReceivableLedgerCode", "ReceivableLedgerName",
            "CreditLimit", "IsWalkIn", "Remarks",
            "IsActive", "IsDeleted", "CreatedBy", "CreatedDate"
        )
        VALUES
        (
            'Outside', v_code, '',
            v_name, v_display, '', '',
            NULL, '',
            v_phone, '', '',
            '', '',
            '', '', '',
            NULL,
            v_ledger, v_display,
            0, false, v_marker,
            true, false, v_user_id, CURRENT_TIMESTAMP
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
            'System generated from Customer Profiles ' || v_code || ' (receivable).',
            true, false, v_user_id, CURRENT_TIMESTAMP
        );

        v_added_out := v_added_out + 1;
    END LOOP;

    RAISE NOTICE 'Added % Inbound and % Outside test customers (% skipped : phone / NID in use).',
        v_added_in, v_added_out, v_skipped;
END $$;


-- --------------------------------------------------------------
-- Check
-- --------------------------------------------------------------

SELECT "CustomerType", COUNT(*) AS test_customers
FROM "CustomerProfiles"
WHERE "Remarks" = 'TEST DATA' AND NOT "IsDeleted"
GROUP BY "CustomerType"
ORDER BY "CustomerType";


-- ==============================================================
-- CLEAN UP (removes ALL test customers and their ledgers)
-- Select the 3 lines below (without the "--") and run them.
-- Only safe while no invoice / voucher uses these customers.
-- ==============================================================

-- DELETE FROM "GeneralLedgers" WHERE "LedgerCode" IN (SELECT "ReceivableLedgerCode" FROM "CustomerProfiles" WHERE "Remarks" = 'TEST DATA');
-- DELETE FROM "CustomerProfiles" WHERE "Remarks" = 'TEST DATA';
-- SELECT COUNT(*) AS test_customers_left FROM "CustomerProfiles" WHERE "Remarks" = 'TEST DATA';
