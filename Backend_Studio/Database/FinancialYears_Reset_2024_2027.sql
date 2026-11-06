-- ============================================================
-- Financial Years : reset to three consecutive years (2026-11-06)
--
--   FY-0001  FY 2024-2025  01-Jul-2024 .. 30-Jun-2025
--   FY-0002  FY 2025-2026  01-Jul-2025 .. 30-Jun-2026
--   FY-0003  FY 2026-2027  01-Jul-2026 .. 30-Jun-2027  (Current)
--
-- A. No document uses any financial year yet :
--    every row is deleted and the three years are created fresh
--    (ids 1, 2, 3).
-- B. Some documents already use a year (FinancialYearId) :
--    nothing is deleted. The documents entered so far belong to
--    the year with id 1 (it was FY 2026-2027 when they were
--    saved), so id 1 becomes FY-0003 2026-2027 (Current); the
--    other rows become FY-0002 2025-2026 and FY-0001 2024-2025;
--    any extra row is deleted only when nothing uses it.
--
-- Also drops the old index UX_FinancialYears_IsCurrent (it
-- allowed only one non-current year).
--
-- ASCII only. Run the whole script (F5). Log in again afterwards.
-- ============================================================

DROP INDEX IF EXISTS public."UX_FinancialYears_IsCurrent";

CREATE UNIQUE INDEX IF NOT EXISTS "IX_FinancialYears_OneCurrent"
    ON public."FinancialYears" ("IsCurrent")
    WHERE "IsCurrent" = true AND "IsDeleted" = false;


DO $$
DECLARE
    r        record;
    used     bigint;
    total    bigint := 0;
    usedIds  bigint[] := ARRAY[]::bigint[];
    ids      bigint[];
    id2026   bigint;
    id2025   bigint;
    id2024   bigint;
BEGIN
    -- Which financial year ids are used by documents
    FOR r IN
        SELECT c.table_name
        FROM   information_schema.columns c
        JOIN   information_schema.tables t
               ON t.table_schema = c.table_schema AND t.table_name = c.table_name
        WHERE  c.table_schema = 'public'
        AND    c.column_name = 'FinancialYearId'
        AND    c.table_name <> 'FinancialYears'
        AND    t.table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('SELECT count(*) FROM public.%I WHERE "FinancialYearId" IS NOT NULL', r.table_name)
        INTO used;

        IF used > 0 THEN
            total := total + used;

            EXECUTE format('SELECT array_agg(DISTINCT "FinancialYearId") FROM public.%I WHERE "FinancialYearId" IS NOT NULL', r.table_name)
            INTO ids;

            usedIds := usedIds || ids;

            RAISE NOTICE 'Used : % (% rows)', r.table_name, used;
        END IF;
    END LOOP;

    IF total = 0 THEN
        ---------------------------------------------------------
        -- A. Nothing uses a year : start clean
        ---------------------------------------------------------
        DELETE FROM public."FinancialYears";

        ALTER TABLE public."FinancialYears" ALTER COLUMN "FinancialYearId" RESTART WITH 1;

        INSERT INTO public."FinancialYears"
            ("FinancialYearCode", "FinancialYearName", "StartDate", "EndDate",
             "IsCurrent", "YearStatus", "Remarks", "Status", "IsDeleted",
             "CreatedBy", "CreatedDate")
        VALUES
            ('FY-0001', 'FY 2024-2025', DATE '2024-07-01', DATE '2025-06-30', false, 'Open', '', true, false, 1, now()),
            ('FY-0002', 'FY 2025-2026', DATE '2025-07-01', DATE '2026-06-30', false, 'Open', '', true, false, 1, now()),
            ('FY-0003', 'FY 2026-2027', DATE '2026-07-01', DATE '2027-06-30', true,  'Open', '', true, false, 1, now());

        RAISE NOTICE 'A : all years deleted, FY-0001 .. FY-0003 created (FY 2026-2027 current).';
        RETURN;
    END IF;

    ---------------------------------------------------------
    -- B. Documents use years : keep the rows, re-label them
    ---------------------------------------------------------
    IF EXISTS (SELECT 1 FROM unnest(usedIds) u WHERE u <> 1) THEN
        RAISE EXCEPTION 'Documents use years other than id 1 (ids : %) : nothing changed. Send this message to Claude.',
            (SELECT string_agg(DISTINCT u::text, ', ') FROM unnest(usedIds) u);
    END IF;

    id2026 := 1;

    SELECT min("FinancialYearId") INTO id2025
    FROM   public."FinancialYears"
    WHERE  "FinancialYearId" <> 1;

    SELECT min("FinancialYearId") INTO id2024
    FROM   public."FinancialYears"
    WHERE  "FinancialYearId" NOT IN (1, COALESCE(id2025, 0));

    -- Extra rows (none of the three) : nothing uses them, delete
    DELETE FROM public."FinancialYears"
    WHERE  "FinancialYearId" NOT IN (1, COALESCE(id2025, 0), COALESCE(id2024, 0));

    -- Park every row on temporary codes / names, nobody current
    UPDATE public."FinancialYears"
    SET    "FinancialYearCode" = 'FY-TMP-' || "FinancialYearId",
           "FinancialYearName" = 'TMP ' || "FinancialYearId",
           "IsCurrent" = false;

    IF id2024 IS NULL THEN
        INSERT INTO public."FinancialYears"
            ("FinancialYearCode", "FinancialYearName", "StartDate", "EndDate",
             "IsCurrent", "YearStatus", "Remarks", "Status", "IsDeleted",
             "CreatedBy", "CreatedDate")
        VALUES ('FY-0001', 'FY 2024-2025', DATE '2024-07-01', DATE '2025-06-30', false, 'Open', '', true, false, 1, now());
    ELSE
        UPDATE public."FinancialYears"
        SET    "FinancialYearCode" = 'FY-0001', "FinancialYearName" = 'FY 2024-2025',
               "StartDate" = DATE '2024-07-01', "EndDate" = DATE '2025-06-30',
               "YearStatus" = 'Open', "Status" = true, "IsDeleted" = false, "ModifiedDate" = now()
        WHERE  "FinancialYearId" = id2024;
    END IF;

    IF id2025 IS NULL THEN
        INSERT INTO public."FinancialYears"
            ("FinancialYearCode", "FinancialYearName", "StartDate", "EndDate",
             "IsCurrent", "YearStatus", "Remarks", "Status", "IsDeleted",
             "CreatedBy", "CreatedDate")
        VALUES ('FY-0002', 'FY 2025-2026', DATE '2025-07-01', DATE '2026-06-30', false, 'Open', '', true, false, 1, now());
    ELSE
        UPDATE public."FinancialYears"
        SET    "FinancialYearCode" = 'FY-0002', "FinancialYearName" = 'FY 2025-2026',
               "StartDate" = DATE '2025-07-01', "EndDate" = DATE '2026-06-30',
               "YearStatus" = 'Open', "Status" = true, "IsDeleted" = false, "ModifiedDate" = now()
        WHERE  "FinancialYearId" = id2025;
    END IF;

    UPDATE public."FinancialYears"
    SET    "FinancialYearCode" = 'FY-0003', "FinancialYearName" = 'FY 2026-2027',
           "StartDate" = DATE '2026-07-01', "EndDate" = DATE '2027-06-30',
           "IsCurrent" = true, "YearStatus" = 'Open', "Status" = true, "IsDeleted" = false,
           "ModifiedDate" = now()
    WHERE  "FinancialYearId" = id2026;

    PERFORM setval(pg_get_serial_sequence('public."FinancialYears"', 'FinancialYearId'),
                   (SELECT max("FinancialYearId") FROM public."FinancialYears") + 1, false);

    RAISE NOTICE 'B : documents kept on id 1 = FY-0003 FY 2026-2027 (current); FY-0001 / FY-0002 set.';
END $$;


SELECT "FinancialYearId", "FinancialYearCode", "FinancialYearName",
       "StartDate", "EndDate", "IsCurrent", "YearStatus", "IsDeleted"
FROM   public."FinancialYears"
ORDER  BY "StartDate";
