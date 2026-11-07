-- =====================================================================
-- RegistrationFund_DeleteSubGroups.sql
--
-- Deletes every sub group under GRP-003-003 Registration Fund
-- Management (SUB-003-003-001 .. 004) and any ledgers under them.
-- The group GRP-003-003 itself stays.
--
-- Hard delete (rows removed), so SUB-003-003-001 onwards can be used
-- again for the new design.
--
-- Stops and changes nothing when :
--   - a ledger under these sub groups has voucher postings, or
--   - one of their codes is used in another table (Posting Setup,
--     cards, ...).
--
-- One transaction. ASCII only (WIN1252 database).
-- =====================================================================

-- Clears a transaction left open by an earlier failed run in the
-- same pgAdmin tab (a harmless warning when there is none).
ROLLBACK;

BEGIN;

DO $$
DECLARE
    v_group_id  bigint;
    v_subs      bigint;
    v_ledgers   bigint;
    v_n         bigint;
    r           record;
    v_problems  text := '';
BEGIN
    SELECT "AccountGroupId" INTO v_group_id
    FROM "AccountGroups"
    WHERE "GroupCode" = 'GRP-003-003' AND NOT "IsDeleted";

    IF v_group_id IS NULL THEN
        RAISE EXCEPTION 'GRP-003-003 not found.';
    END IF;

    IF (SELECT "GroupName" FROM "AccountGroups" WHERE "AccountGroupId" = v_group_id)
       NOT ILIKE '%registration%' THEN
        RAISE EXCEPTION 'GRP-003-003 is not Registration Fund Management. Stopped.';
    END IF;

    -- Codes of the sub groups and ledgers to delete (deleted rows too)
    CREATE TEMP TABLE del_codes ON COMMIT DROP AS
        SELECT "SubGroupCode" AS code FROM "AccountSubGroups"
         WHERE "AccountGroupId" = v_group_id
        UNION
        SELECT "LedgerCode" FROM "GeneralLedgers"
         WHERE "AccountGroupId" = v_group_id;

    SELECT count(*) INTO v_subs FROM "AccountSubGroups"
     WHERE "AccountGroupId" = v_group_id;
    SELECT count(*) INTO v_ledgers FROM "GeneralLedgers"
     WHERE "AccountGroupId" = v_group_id;

    RAISE NOTICE 'Found % sub group(s) and % ledger(s) under GRP-003-003.', v_subs, v_ledgers;

    -- No postings
    SELECT count(*) INTO v_n FROM "VoucherEntries" v
     WHERE v."LedgerCode" IN (SELECT code FROM del_codes);
    IF v_n > 0 THEN
        RAISE EXCEPTION '% voucher line(s) are posted to these ledgers. Stopped.', v_n;
    END IF;

    -- Codes not used anywhere else (menu / navigation tables skipped)
    FOR r IN
        SELECT c.table_name::text AS tbl, c.column_name::text AS col
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON t.table_schema = c.table_schema AND t.table_name = c.table_name
        WHERE c.table_schema = current_schema()
          AND t.table_type = 'BASE TABLE'
          AND c.data_type IN ('text', 'character varying')
          AND c.column_name ILIKE '%code%'
          AND c.column_name NOT ILIKE '%menu%'
          AND c.column_name NOT ILIKE '%module%'
          AND c.table_name NOT ILIKE 'Navigation%'
          AND c.table_name NOT ILIKE 'INF\_%'
          AND c.table_name NOT ILIKE '%Synchronization%'
          AND c.table_name NOT IN ('AccountSubGroups', 'GeneralLedgers', 'VoucherEntries')
    LOOP
        EXECUTE format(
            'SELECT count(*) FROM %I x WHERE EXISTS (SELECT 1 FROM del_codes d '
            || 'WHERE x.%I = d.code OR x.%I LIKE ''%%'' || d.code || ''%%'')',
            r.tbl, r.col, r.col)
            INTO v_n;
        IF v_n > 0 THEN
            v_problems := v_problems || format(E'\n  %s.%s : %s', r.tbl, r.col, v_n);
        END IF;
    END LOOP;

    IF v_problems <> '' THEN
        RAISE EXCEPTION 'These codes are still used in :%', v_problems;
    END IF;

    -- Delete
    DELETE FROM "GeneralLedgers"   WHERE "AccountGroupId" = v_group_id;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    RAISE NOTICE 'Ledgers deleted : %', v_n;

    DELETE FROM "AccountSubGroups" WHERE "AccountGroupId" = v_group_id;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    RAISE NOTICE 'Sub groups deleted : %', v_n;

    RAISE NOTICE 'Done. GRP-003-003 Registration Fund Management is kept, now empty.';
END;
$$;

-- Result : should show the group with no sub groups
SELECT g."GroupCode", g."GroupName",
       (SELECT count(*) FROM "AccountSubGroups" s
         WHERE s."AccountGroupId" = g."AccountGroupId") AS "SubGroups"
FROM "AccountGroups" g
WHERE g."GroupCode" = 'GRP-003-003';

COMMIT;
