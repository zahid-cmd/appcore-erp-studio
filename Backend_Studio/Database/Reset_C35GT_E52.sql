-- =============================================================
-- One-off reset before testing Model Onboarding
--   Hard-deletes (so the codes can be used again):
--     Product Sub Categories  MB-001-009  Motor Bikes - REVOO - C35GT
--                             MB-001-010  Motor Bikes - REVOO - E52
--       + their INV / WIP / COGS / Sales account sub groups
--     Bike Models             BMD-0009    C35GT
--                             BMD-0010    E52
--   Stops (nothing changed) when a name does not match, a motor
--   bike or a ledger still sits under them, or anything else still
--   points at them.
--   Run the whole script (F5).
-- =============================================================

DO $$
DECLARE
    v_sub_ids   bigint[];
    v_codes     text[];
    v_group_ids bigint[];
    v_bad       text;
    n           integer;
BEGIN
    -- ---------- Sub categories ----------
    SELECT string_agg(s."SubCategoryCode" || ' = ' || s."SubCategoryName", ', ')
    INTO   v_bad
    FROM   "ProductSubCategories" s
    WHERE  s."SubCategoryCode" IN ('MB-001-009', 'MB-001-010')
    AND    NOT (
               (s."SubCategoryCode" = 'MB-001-009' AND s."SubCategoryName" ILIKE '%C35GT')
            OR (s."SubCategoryCode" = 'MB-001-010' AND s."SubCategoryName" ILIKE '%E52')
           );

    IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'Unexpected sub category: % - nothing changed.', v_bad;
    END IF;

    SELECT array_agg(s."ProductSubCategoryId"),
           array_remove(array_agg(s."InventorySubGroupCode") || array_agg(s."WipSubGroupCode")
                        || array_agg(s."CogsSubGroupCode") || array_agg(s."SalesSubGroupCode"), '')
    INTO   v_sub_ids, v_codes
    FROM   "ProductSubCategories" s
    WHERE  s."SubCategoryCode" IN ('MB-001-009', 'MB-001-010');

    IF v_sub_ids IS NOT NULL THEN

        SELECT string_agg(b."ProductCode", ', ')
        INTO   v_bad
        FROM   "MotorBikes" b
        WHERE  b."ProductSubCategoryId" = ANY (v_sub_ids);

        IF v_bad IS NOT NULL THEN
            RAISE EXCEPTION 'Motor bikes still exist under these sub categories (%): delete them first - nothing changed.', v_bad;
        END IF;

        SELECT array_agg(g."AccountSubGroupId")
        INTO   v_group_ids
        FROM   "AccountSubGroups" g
        WHERE  g."SubGroupCode" = ANY (v_codes);

        IF v_group_ids IS NOT NULL THEN

            SELECT string_agg(l."LedgerCode", ', ')
            INTO   v_bad
            FROM   "GeneralLedgers" l
            WHERE  l."AccountSubGroupId" = ANY (v_group_ids);

            IF v_bad IS NOT NULL THEN
                RAISE EXCEPTION 'Ledgers still exist under their account sub groups (%) - nothing changed.', v_bad;
            END IF;

            DELETE FROM "AccountSubGroups" WHERE "AccountSubGroupId" = ANY (v_group_ids);
            GET DIAGNOSTICS n = ROW_COUNT;
            RAISE NOTICE 'Account sub groups deleted : %', n;
        END IF;

        DELETE FROM "ProductSubCategories" WHERE "ProductSubCategoryId" = ANY (v_sub_ids);
        GET DIAGNOSTICS n = ROW_COUNT;
        RAISE NOTICE 'Product sub categories deleted : %', n;
    END IF;

    -- ---------- Bike models ----------
    SELECT string_agg(m."ModelCode" || ' = ' || m."ModelName", ', ')
    INTO   v_bad
    FROM   "BikeModels" m
    WHERE  m."ModelCode" IN ('BMD-0009', 'BMD-0010')
    AND    NOT (
               (m."ModelCode" = 'BMD-0009' AND upper(m."ModelName") = 'C35GT')
            OR (m."ModelCode" = 'BMD-0010' AND upper(m."ModelName") = 'E52')
           );

    IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'Unexpected bike model: % - nothing changed.', v_bad;
    END IF;

    DELETE FROM "BikeModels" WHERE "ModelCode" IN ('BMD-0009', 'BMD-0010');
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE 'Bike models deleted : %', n;
END $$;

-- Check : the next codes will be MB-001-009 and BMD-0009 again
SELECT "SubCategoryCode", "SubCategoryName" FROM "ProductSubCategories"
WHERE  "SubCategoryCode" LIKE 'MB-001-%' ORDER BY "SubCategoryCode";

SELECT "ModelCode", "ModelName" FROM "BikeModels" ORDER BY "ModelCode";
