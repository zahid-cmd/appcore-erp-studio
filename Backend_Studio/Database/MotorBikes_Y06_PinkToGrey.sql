-- =============================================================
-- One-off fix : MB-001-007-00003  Y06 Pink  ->  Y06 Grey
--   Changes the bike's color, its Product Name and the names of
--   its four ledgers (INV / WIP / COGS / Sales). Codes stay.
--   Stops (no change) if the Grey color is not found, or Y06
--   already has a Grey bike.
-- =============================================================

DO $$
DECLARE
    v_code      text := 'MB-001-007-00003';
    v_bike      public."MotorBikes"%ROWTYPE;
    v_grey_id   bigint;
    v_grey_name text;
    v_sub_name  text;
    v_new_name  text;
BEGIN
    SELECT * INTO v_bike
    FROM   public."MotorBikes"
    WHERE  "ProductCode" = v_code
      AND  "IsDeleted" = false;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Motor bike % not found.', v_code;
    END IF;

    SELECT "ColorManagementId", trim("ColorName")
    INTO   v_grey_id, v_grey_name
    FROM   public."ColorManagements"
    WHERE  "IsDeleted" = false
      AND  lower(trim("ColorName")) IN ('grey', 'gray')
    ORDER  BY "ColorManagementId"
    LIMIT  1;

    IF v_grey_id IS NULL THEN
        RAISE EXCEPTION 'Color Grey not found. Add it in Color Management first.';
    END IF;

    IF EXISTS
    (
        SELECT 1
        FROM   public."MotorBikes"
        WHERE  "ProductSubCategoryId" = v_bike."ProductSubCategoryId"
          AND  "ColorManagementId" = v_grey_id
          AND  "IsDeleted" = false
          AND  "MotorBikeId" <> v_bike."MotorBikeId"
    )
    THEN
        RAISE EXCEPTION 'This model already has a % motor bike.', v_grey_name;
    END IF;

    SELECT trim("SubCategoryName")
    INTO   v_sub_name
    FROM   public."ProductSubCategories"
    WHERE  "ProductSubCategoryId" = v_bike."ProductSubCategoryId";

    -- "<Sub Category Name> - <Color Name>"
    v_new_name := v_sub_name || ' - ' || v_grey_name;

    UPDATE public."MotorBikes"
    SET    "ColorManagementId" = v_grey_id,
           "ProductName"       = v_new_name,
           "ModifiedDate"      = now()
    WHERE  "MotorBikeId" = v_bike."MotorBikeId";

    -- "INV - <name>" / "WIP - <name>" / "COGS - <name>"
    UPDATE public."GeneralLedgers"
    SET    "LedgerName" = split_part("LedgerCode", '-', 1) || ' - ' || v_new_name
    WHERE  "IsDeleted" = false
      AND  "LedgerCode" IN (v_bike."InventoryLedgerCode",
                            v_bike."WipLedgerCode",
                            v_bike."CogsLedgerCode");

    -- "Sales - <name>" (found by its old name)
    UPDATE public."GeneralLedgers"
    SET    "LedgerName" = 'Sales - ' || v_new_name
    WHERE  "IsDeleted" = false
      AND  "LedgerName" = 'Sales - ' || v_bike."ProductName";

    RAISE NOTICE 'Done : % is now "%".', v_code, v_new_name;
END $$;

-- Check
SELECT b."ProductCode", b."ProductName", c."ColorName"
FROM   public."MotorBikes" b
JOIN   public."ColorManagements" c ON c."ColorManagementId" = b."ColorManagementId"
WHERE  b."ProductCode" = 'MB-001-007-00003';

SELECT g."LedgerCode", g."LedgerName"
FROM   public."GeneralLedgers" g
WHERE  g."IsDeleted" = false
  AND  g."LedgerName" LIKE '% - Motor Bikes - REVOO - Y06 - %'
ORDER  BY g."LedgerCode";
