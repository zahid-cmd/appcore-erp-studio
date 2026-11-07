-- =====================================================================
-- OtherIncome_Recode_CLS011_to_CLS009.sql
--
-- Restructures the income classes (owner, 2026-11-08):
--
--   1. Deletes CLS-009 Membership Income and CLS-010 Registration Income
--      (no vouchers may be posted to them; the script stops if any are).
--   2. Renumbers CLS-011 Other Income to CLS-009, with all its groups,
--      sub groups and ledgers (GRP / SUB / GLR-011-... -> -009-...),
--      in every "...Code" / "...Codes" column of every table
--      (chart, VoucherEntries, PostingSetups, histories ...).
--   3. Creates under CLS-009 Other Income :
--        GRP-009-002 Registration Management
--          SUB-009-002-001 Registration & Customer File Surplus
--            GLR-009-002-001-00001 Registration Income
--            GLR-009-002-001-00002 Customer File Income
--        GRP-009-003 Membership Management
--          SUB-009-003-001 Membership Fees   (the old SUB-009-001-001,
--            moved with its card fee ledgers : GLR-009-003-001-nnnnn,
--            same numbers; MembershipCards.FeeLedgerCode follows)
--
-- One transaction. Checks before (stops on any problem) and after
-- (nothing left on CLS-010 / -011 codes). Safe to run again : it
-- stops with a notice when the restructure is already done.
-- ASCII only (WIN1252 database).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Helpers (temporary, dropped at the end of the session)
-- ---------------------------------------------------------------------

-- Every text column whose name contains "code", in base tables of the
-- current schema
CREATE OR REPLACE FUNCTION pg_temp.code_columns()
RETURNS TABLE (tbl text, col text)
LANGUAGE sql
AS $$
    SELECT c.table_name::text, c.column_name::text
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = current_schema()
      AND t.table_type = 'BASE TABLE'
      AND c.data_type IN ('text', 'character varying')
      AND c.column_name ILIKE '%code%'
$$;

-- Rows (per table / column) whose code column matches a regex
CREATE OR REPLACE FUNCTION pg_temp.find_codes(p_regex text)
RETURNS TABLE (tbl text, col text, hits bigint)
LANGUAGE plpgsql
AS $$
DECLARE
    r record;
    n bigint;
BEGIN
    FOR r IN SELECT * FROM pg_temp.code_columns() LOOP
        EXECUTE format('SELECT count(*) FROM %I WHERE %I ~ $1', r.tbl, r.col)
            INTO n USING p_regex;
        IF n > 0 THEN
            tbl := r.tbl; col := r.col; hits := n;
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$;

-- regexp_replace on every code column; returns rows changed
CREATE OR REPLACE FUNCTION pg_temp.replace_codes(p_regex text, p_with text)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
    r record;
    n bigint;
    total bigint := 0;
BEGIN
    FOR r IN SELECT * FROM pg_temp.code_columns() LOOP
        EXECUTE format(
            'UPDATE %I SET %I = regexp_replace(%I, $1, $2, ''g'') WHERE %I ~ $1',
            r.tbl, r.col, r.col, r.col)
            USING p_regex, p_with;
        GET DIAGNOSTICS n = ROW_COUNT;
        IF n > 0 THEN
            RAISE NOTICE '  %.% : % row(s)', r.tbl, r.col, n;
        END IF;
        total := total + n;
    END LOOP;
    RETURN total;
END;
$$;

-- Copy one row of a table with some columns overridden; returns new id
CREATE OR REPLACE FUNCTION pg_temp.clone_row
(
    p_table text,
    p_id_col text,
    p_src_id bigint,
    p_over jsonb
)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
    cols text;
    new_id bigint;
BEGIN
    SELECT string_agg(format('%I', column_name), ', ' ORDER BY ordinal_position)
      INTO cols
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = p_table
      AND column_name NOT IN (p_id_col, 'PublicId');

    EXECUTE format(
        'INSERT INTO %1$I (%2$s) '
        || 'SELECT %2$s FROM jsonb_populate_record(NULL::%1$I, '
        || '(SELECT to_jsonb(s) FROM %1$I s WHERE %3$I = $1) || $2) '
        || 'RETURNING %3$I',
        p_table, cols, p_id_col)
      INTO new_id
      USING p_src_id, p_over;

    RETURN new_id;
END;
$$;


DO $$
DECLARE
    v_other_id      bigint;   -- CLS-011 Other Income (becomes CLS-009)
    v_mem_class_id  bigint;   -- old CLS-009 Membership Income
    v_reg_class_id  bigint;   -- old CLS-010 Registration Income
    v_mem_sub_id    bigint;   -- old SUB-009-001-001 Membership Fees
    v_grp_tpl_id    bigint;
    v_sub_tpl_id    bigint;
    v_gl_tpl_id     bigint;
    v_reg_grp_id    bigint;
    v_reg_sub_id    bigint;
    v_mem_grp_id    bigint;
    v_n             bigint;
    r               record;
    v_problems      text := '';
    v_now           timestamptz := now();
BEGIN
    -- -----------------------------------------------------------------
    -- 0. Already done ?
    -- -----------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM "AccountClasses"
                   WHERE "ClassCode" = 'CLS-011' AND NOT "IsDeleted")
       AND EXISTS (SELECT 1 FROM "AccountGroups"
                   WHERE "GroupCode" = 'GRP-009-003' AND NOT "IsDeleted")
    THEN
        RAISE NOTICE 'Already restructured (no CLS-011, GRP-009-003 exists). Nothing to do.';
        RETURN;
    END IF;

    -- -----------------------------------------------------------------
    -- 1. Checks before
    -- -----------------------------------------------------------------
    SELECT "AccountClassId" INTO v_other_id FROM "AccountClasses"
     WHERE "ClassCode" = 'CLS-011' AND NOT "IsDeleted";
    SELECT "AccountClassId" INTO v_mem_class_id FROM "AccountClasses"
     WHERE "ClassCode" = 'CLS-009' AND NOT "IsDeleted";
    SELECT "AccountClassId" INTO v_reg_class_id FROM "AccountClasses"
     WHERE "ClassCode" = 'CLS-010' AND NOT "IsDeleted";

    IF v_other_id IS NULL THEN
        RAISE EXCEPTION 'CLS-011 (Other Income) not found.';
    END IF;

    IF (SELECT "ClassName" FROM "AccountClasses" WHERE "AccountClassId" = v_other_id)
       NOT ILIKE '%other income%' THEN
        RAISE EXCEPTION 'CLS-011 is not "Other Income". Stopped.';
    END IF;

    IF v_mem_class_id IS NOT NULL
       AND (SELECT "ClassName" FROM "AccountClasses" WHERE "AccountClassId" = v_mem_class_id)
           NOT ILIKE '%membership%' THEN
        RAISE EXCEPTION 'CLS-009 is not "Membership Income". Stopped.';
    END IF;

    IF v_reg_class_id IS NOT NULL
       AND (SELECT "ClassName" FROM "AccountClasses" WHERE "AccountClassId" = v_reg_class_id)
           NOT ILIKE '%registration%' THEN
        RAISE EXCEPTION 'CLS-010 is not "Registration Income". Stopped.';
    END IF;

    -- No class after CLS-011 (numbers would no longer be in sequence)
    IF EXISTS (SELECT 1 FROM "AccountClasses"
               WHERE "ClassCode" ~ '^CLS-[0-9]{3}$'
                 AND substr("ClassCode", 5)::int > 11) THEN
        RAISE EXCEPTION 'A class after CLS-011 exists. Stopped; tell Claude.';
    END IF;

    -- No postings on the old 009 / 010 ledgers
    SELECT count(*) INTO v_n FROM "VoucherEntries"
     WHERE "LedgerCode" ~ '^[A-Z]{2,5}-0(09|10)-';
    IF v_n > 0 THEN
        RAISE EXCEPTION '% voucher line(s) are posted to CLS-009 / CLS-010 ledgers. Stopped.', v_n;
    END IF;

    -- No cash / bank / MFS / POS / EMI style ledger in classes 009-011
    -- outside GeneralLedgers (they would not be moved)
    FOR r IN SELECT * FROM pg_temp.find_codes('^(CSH|BNK|MFS|POS|EMI)-0(09|10|11)-') LOOP
        v_problems := v_problems || format(E'\n  %s.%s : %s', r.tbl, r.col, r.hits);
    END LOOP;
    IF v_problems <> '' THEN
        RAISE EXCEPTION 'Money ledgers found under classes 009-011 :%', v_problems;
    END IF;

    -- Old 009 / 010 codes used anywhere except the chart itself and the
    -- membership card fee ledgers (which move with the sub group)
    v_problems := '';
    FOR r IN
        SELECT * FROM pg_temp.find_codes('(^|[^A-Z0-9])(CLS-0(09|10)($|[^0-9])|(GRP|SUB|GLR)-0(09|10)-)')
        WHERE tbl NOT IN ('AccountClasses', 'AccountGroups', 'AccountSubGroups', 'GeneralLedgers')
          AND NOT (tbl = 'MembershipCards' AND col = 'FeeLedgerCode')
          AND NOT (tbl = 'PostingSetups' AND col = 'AllowedSubGroupCodes')
    LOOP
        v_problems := v_problems || format(E'\n  %s.%s : %s', r.tbl, r.col, r.hits);
    END LOOP;
    IF v_problems <> '' THEN
        RAISE NOTICE 'Old CLS-009 / CLS-010 codes are also stored in (checked below) :%', v_problems;
    END IF;

    -- Exactly the membership fee codes may be stored outside the chart
    SELECT count(*) INTO v_n
    FROM pg_temp.find_codes('(^|[^A-Z0-9])(CLS-010($|[^0-9])|(GRP|SUB|GLR)-010-|GRP-009-)') f
    WHERE f.tbl NOT IN ('AccountClasses', 'AccountGroups', 'AccountSubGroups', 'GeneralLedgers');
    IF v_n > 0 THEN
        RAISE EXCEPTION 'Old CLS-010 codes or old CLS-009 group codes are used outside the chart (see notice). Stopped.';
    END IF;

    -- The membership fee sub group
    IF v_mem_class_id IS NOT NULL THEN
        SELECT "AccountSubGroupId" INTO v_mem_sub_id FROM "AccountSubGroups"
         WHERE "SubGroupCode" = 'SUB-009-001-001' AND NOT "IsDeleted"
           AND "AccountClassId" = v_mem_class_id;
    END IF;

    -- Codes under the old 009 that are not the fee sub group / its ledgers
    SELECT count(*) INTO v_n
    FROM pg_temp.find_codes('(^|[^A-Z0-9])(SUB-009-(?!001-001)|GLR-009-(?!001-001-))') f
    WHERE f.tbl NOT IN ('AccountClasses', 'AccountGroups', 'AccountSubGroups', 'GeneralLedgers');
    IF v_n > 0 THEN
        RAISE EXCEPTION 'Old CLS-009 codes other than Membership Fees are used outside the chart. Stopped.';
    END IF;

    -- Templates : the Other Income group / sub group / first ledger
    SELECT "AccountGroupId" INTO v_grp_tpl_id FROM "AccountGroups"
     WHERE "GroupCode" = 'GRP-011-001' AND NOT "IsDeleted";
    SELECT "AccountSubGroupId" INTO v_sub_tpl_id FROM "AccountSubGroups"
     WHERE "SubGroupCode" = 'SUB-011-001-001' AND NOT "IsDeleted";
    SELECT "GeneralLedgerId" INTO v_gl_tpl_id FROM "GeneralLedgers"
     WHERE "SubGroupCode" = 'SUB-011-001-001' AND NOT "IsDeleted"
     ORDER BY "LedgerCode" LIMIT 1;

    IF v_grp_tpl_id IS NULL OR v_sub_tpl_id IS NULL OR v_gl_tpl_id IS NULL THEN
        RAISE EXCEPTION 'GRP-011-001 / SUB-011-001-001 / its ledgers not found.';
    END IF;

    IF EXISTS (SELECT 1 FROM "AccountGroups"
               WHERE "AccountClassId" = v_other_id AND "GroupCode" <> 'GRP-011-001') THEN
        RAISE EXCEPTION 'Other Income has groups besides GRP-011-001. Stopped; tell Claude.';
    END IF;

    RAISE NOTICE 'Checks passed. Membership fee sub group id : %', coalesce(v_mem_sub_id::text, 'none');

    -- -----------------------------------------------------------------
    -- 2. Membership fee codes -> GLR-009-003-001-nnnnn / SUB-009-003-001
    --    (before anything else, while they are still unique)
    -- -----------------------------------------------------------------
    IF v_mem_sub_id IS NOT NULL THEN
        RAISE NOTICE 'Moving membership fee codes :';
        v_n := pg_temp.replace_codes('(^|[^A-Z0-9])GLR-009-001-001-', '\1GLR-009-003-001-');
        v_n := pg_temp.replace_codes('(^|[^A-Z0-9])SUB-009-001-001($|[^0-9-])', '\1SUB-009-003-001\2');
    END IF;

    -- -----------------------------------------------------------------
    -- 3. Park the old 009 / 010 chart codes (frees CLS / GRP / SUB-009)
    -- -----------------------------------------------------------------
    UPDATE "AccountClasses" SET "ClassCode" = 'X' || "ClassCode"
     WHERE "AccountClassId" IN (v_mem_class_id, v_reg_class_id);

    UPDATE "AccountGroups"
       SET "GroupCode" = 'X' || "GroupCode", "ClassCode" = 'X' || "ClassCode"
     WHERE "AccountClassId" IN (v_mem_class_id, v_reg_class_id);

    UPDATE "AccountSubGroups"
       SET "SubGroupCode" = CASE WHEN "AccountSubGroupId" = v_mem_sub_id
                                 THEN "SubGroupCode" ELSE 'X' || "SubGroupCode" END,
           "GroupCode" = 'X' || "GroupCode",
           "ClassCode" = 'X' || "ClassCode"
     WHERE "AccountClassId" IN (v_mem_class_id, v_reg_class_id);

    UPDATE "GeneralLedgers"
       SET "LedgerCode" = CASE WHEN "AccountSubGroupId" = v_mem_sub_id
                               THEN "LedgerCode" ELSE 'X' || "LedgerCode" END,
           "SubGroupCode" = CASE WHEN "AccountSubGroupId" = v_mem_sub_id
                                 THEN "SubGroupCode" ELSE 'X' || "SubGroupCode" END,
           "GroupCode" = 'X' || "GroupCode",
           "ClassCode" = 'X' || "ClassCode"
     WHERE "AccountClassId" IN (v_mem_class_id, v_reg_class_id);

    -- -----------------------------------------------------------------
    -- 4. Recode Other Income 011 -> 009 everywhere
    -- -----------------------------------------------------------------
    RAISE NOTICE 'Recoding 011 -> 009 :';
    v_n := pg_temp.replace_codes('(^|[^A-Z0-9])(GRP|SUB|GLR)-011-', '\1\2-009-');
    v_n := pg_temp.replace_codes('(^|[^A-Z0-9])CLS-011($|[^0-9])', '\1CLS-009\2');

    -- -----------------------------------------------------------------
    -- 5. New groups under CLS-009 Other Income
    -- -----------------------------------------------------------------
    v_reg_grp_id := pg_temp.clone_row('AccountGroups', 'AccountGroupId', v_grp_tpl_id,
        jsonb_build_object(
            'GroupCode', 'GRP-009-002',
            'GroupName', 'Registration Management',
            'Remarks', 'Registration income and customer file surplus',
            'IsActive', true, 'IsDeleted', false,
            'DeletedBy', NULL, 'DeletedDate', NULL,
            'CreatedDate', v_now, 'ModifiedBy', NULL, 'ModifiedDate', NULL));

    v_mem_grp_id := pg_temp.clone_row('AccountGroups', 'AccountGroupId', v_grp_tpl_id,
        jsonb_build_object(
            'GroupCode', 'GRP-009-003',
            'GroupName', 'Membership Management',
            'Remarks', 'Membership card fees (auto ledgers)',
            'IsActive', true, 'IsDeleted', false,
            'DeletedBy', NULL, 'DeletedDate', NULL,
            'CreatedDate', v_now, 'ModifiedBy', NULL, 'ModifiedDate', NULL));

    v_reg_sub_id := pg_temp.clone_row('AccountSubGroups', 'AccountSubGroupId', v_sub_tpl_id,
        jsonb_build_object(
            'AccountGroupId', v_reg_grp_id,
            'GroupCode', 'GRP-009-002',
            'SubGroupCode', 'SUB-009-002-001',
            'SubGroupName', 'Registration & Customer File Surplus',
            'Remarks', NULL,
            'IsActive', true, 'IsDeleted', false,
            'DeletedBy', NULL, 'DeletedDate', NULL,
            'CreatedDate', v_now, 'ModifiedBy', NULL, 'ModifiedDate', NULL));

    PERFORM pg_temp.clone_row('GeneralLedgers', 'GeneralLedgerId', v_gl_tpl_id,
        jsonb_build_object(
            'AccountGroupId', v_reg_grp_id,
            'AccountSubGroupId', v_reg_sub_id,
            'GroupCode', 'GRP-009-002',
            'SubGroupCode', 'SUB-009-002-001',
            'LedgerCode', 'GLR-009-002-001-00001',
            'LedgerName', 'Registration Income',
            'Remarks', NULL,
            'IsActive', true, 'IsDeleted', false,
            'DeletedBy', NULL, 'DeletedDate', NULL,
            'CreatedDate', v_now, 'ModifiedBy', NULL, 'ModifiedDate', NULL));

    PERFORM pg_temp.clone_row('GeneralLedgers', 'GeneralLedgerId', v_gl_tpl_id,
        jsonb_build_object(
            'AccountGroupId', v_reg_grp_id,
            'AccountSubGroupId', v_reg_sub_id,
            'GroupCode', 'GRP-009-002',
            'SubGroupCode', 'SUB-009-002-001',
            'LedgerCode', 'GLR-009-002-001-00002',
            'LedgerName', 'Customer File Income',
            'Remarks', NULL,
            'IsActive', true, 'IsDeleted', false,
            'DeletedBy', NULL, 'DeletedDate', NULL,
            'CreatedDate', v_now, 'ModifiedBy', NULL, 'ModifiedDate', NULL));

    -- -----------------------------------------------------------------
    -- 6. Membership Fees sub group (+ its card ledgers) -> GRP-009-003
    --    or a new empty one when there was none
    -- -----------------------------------------------------------------
    IF v_mem_sub_id IS NOT NULL THEN
        UPDATE "AccountSubGroups"
           SET "AccountClassId" = v_other_id,
               "AccountGroupId" = v_mem_grp_id,
               "ClassCode" = 'CLS-009',
               "GroupCode" = 'GRP-009-003',
               "SubGroupCode" = 'SUB-009-003-001',
               "ModifiedDate" = v_now
         WHERE "AccountSubGroupId" = v_mem_sub_id;

        UPDATE "GeneralLedgers"
           SET "AccountClassId" = v_other_id,
               "AccountGroupId" = v_mem_grp_id,
               "ClassCode" = 'CLS-009',
               "GroupCode" = 'GRP-009-003',
               "SubGroupCode" = 'SUB-009-003-001',
               "Mode" = (SELECT "Mode" FROM "AccountClasses" WHERE "AccountClassId" = v_other_id),
               "ModifiedDate" = v_now
         WHERE "AccountSubGroupId" = v_mem_sub_id;
        GET DIAGNOSTICS v_n = ROW_COUNT;
        RAISE NOTICE 'Membership fee ledgers moved : %', v_n;

        UPDATE "AccountSubGroups"
           SET "Mode" = (SELECT "Mode" FROM "AccountClasses" WHERE "AccountClassId" = v_other_id)
         WHERE "AccountSubGroupId" = v_mem_sub_id;
    ELSE
        PERFORM pg_temp.clone_row('AccountSubGroups', 'AccountSubGroupId', v_sub_tpl_id,
            jsonb_build_object(
                'AccountGroupId', v_mem_grp_id,
                'GroupCode', 'GRP-009-003',
                'SubGroupCode', 'SUB-009-003-001',
                'SubGroupName', 'Membership Fees',
                'AllowManualLedger', false,
                'Remarks', NULL,
                'IsActive', true, 'IsDeleted', false,
                'DeletedBy', NULL, 'DeletedDate', NULL,
                'CreatedDate', v_now, 'ModifiedBy', NULL, 'ModifiedDate', NULL));
    END IF;

    -- -----------------------------------------------------------------
    -- 7. Delete the old classes (no postings : checked above)
    -- -----------------------------------------------------------------
    DELETE FROM "GeneralLedgers"   WHERE "AccountClassId" IN (v_mem_class_id, v_reg_class_id);
    DELETE FROM "AccountSubGroups" WHERE "AccountClassId" IN (v_mem_class_id, v_reg_class_id);
    DELETE FROM "AccountGroups"    WHERE "AccountClassId" IN (v_mem_class_id, v_reg_class_id);
    DELETE FROM "AccountClasses"   WHERE "AccountClassId" IN (v_mem_class_id, v_reg_class_id);

    -- -----------------------------------------------------------------
    -- 8. Checks after
    -- -----------------------------------------------------------------
    v_problems := '';
    FOR r IN SELECT * FROM pg_temp.find_codes('(^|[^A-Z0-9])((GRP|SUB|GLR)-01[01]-|CLS-01[01]($|[^0-9]))|^X(CLS|GRP|SUB|GLR)-') LOOP
        v_problems := v_problems || format(E'\n  %s.%s : %s', r.tbl, r.col, r.hits);
    END LOOP;
    IF v_problems <> '' THEN
        RAISE EXCEPTION 'Codes still on CLS-010 / CLS-011 after the recode :%', v_problems;
    END IF;

    IF (SELECT count(*) FROM "AccountClasses"
        WHERE "ClassCode" = 'CLS-009' AND NOT "IsDeleted") <> 1 THEN
        RAISE EXCEPTION 'CLS-009 is not unique after the recode.';
    END IF;

    IF EXISTS (SELECT 1 FROM "MembershipCards" m
               WHERE coalesce(m."FeeLedgerCode", '') <> ''
                 AND NOT EXISTS (SELECT 1 FROM "GeneralLedgers" g
                                 WHERE g."LedgerCode" = m."FeeLedgerCode")) THEN
        RAISE EXCEPTION 'A membership card fee ledger code has no ledger after the move.';
    END IF;

    RAISE NOTICE 'Done. CLS-009 Other Income : groups 001 / 002 / 003.';
END;
$$;

-- Result
SELECT c."ClassCode", c."ClassName", g."GroupCode", g."GroupName",
       s."SubGroupCode", s."SubGroupName", l."LedgerCode", l."LedgerName"
FROM "AccountClasses" c
JOIN "AccountGroups" g ON g."AccountClassId" = c."AccountClassId" AND NOT g."IsDeleted"
LEFT JOIN "AccountSubGroups" s ON s."AccountGroupId" = g."AccountGroupId" AND NOT s."IsDeleted"
LEFT JOIN "GeneralLedgers" l ON l."AccountSubGroupId" = s."AccountSubGroupId" AND NOT l."IsDeleted"
WHERE c."ClassCode" = 'CLS-009' AND NOT c."IsDeleted"
ORDER BY g."GroupCode", s."SubGroupCode", l."LedgerCode";

COMMIT;
