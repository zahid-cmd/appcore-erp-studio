-- ==============================================================
-- Motor Bike Specifications : REVOO seed (12 models)
--
-- Source : revoo-ev.com.bd Parameter pages + owner answers
-- (2026-11-07 21:05 / 21:07). Project doc :
-- claude/data-revoo-model-specifications.md
--
-- Rules used
--   Fuel Electric, No. of Motors 1, Vehicle Class MOTOR CYCLE,
--   Seats 2, Tyres 2, Axles 1, Country CHINA.
--   Body Type : motor below 1000 W -> MOTOR CYCLE (SMALL),
--               1000 W and above   -> MOTOR CYCLE (LARGE).
--   Unladen weight = website dry weight;
--   Laden weight   = unladen + 70 kg x 2 seats (option A).
--   Maker = the REVOO brand's Maker's Name (Brand Management).
--
-- Models are found by name inside the REVOO brand, ignoring
-- spaces and hyphens (C35 GT = C35GT, C35-Y = C35Y).
-- A model that already has a live specification keeps what was
-- typed : only its empty / 0 fixed fields are filled, and the
-- technical rows are added only when it has none yet. A model not
-- found is reported and skipped.
--
-- Run after MotorBikeSpecifications_Tables.sql and
-- BrandManagement_MakerName.sql. Safe to run again. ASCII only.
-- ==============================================================

DO $$
DECLARE
    v_brand_id   bigint;
    v_maker      text;
    m            record;
    v_model_id   bigint;
    v_spec_id    bigint;
    v_next       integer;
    v_code       text;
    v_rows       integer;
    v_added      integer := 0;
    v_rows_only  integer := 0;
    v_skipped    integer := 0;
    v_missing    integer := 0;
BEGIN
    SELECT b."BrandManagementId", b."MakerName"
    INTO   v_brand_id, v_maker
    FROM   "BrandManagements" b
    WHERE  upper(trim(b."BrandName")) = 'REVOO'
    AND    NOT b."IsDeleted"
    LIMIT  1;

    IF v_brand_id IS NULL THEN
        RAISE EXCEPTION 'Brand REVOO not found - nothing changed.';
    END IF;

    IF coalesce(trim(v_maker), '') = '' THEN
        RAISE EXCEPTION 'Brand REVOO has no Maker''s Name - set it on Brand Management first. Nothing changed.';
    END IF;

    -- ---------- Fixed fields ----------
    CREATE TEMP TABLE tmp_specs
    (
        model     text,
        watts     integer,
        front     text,
        rear      text,
        len_mm    integer,
        wid_mm    integer,
        hgt_mm    integer,
        wb_mm     integer,
        dry_kg    numeric(8,2)
    ) ON COMMIT DROP;

    INSERT INTO tmp_specs VALUES
        ('A04',    350,  '14X2.5',    '14X2.5',    1430, 665, 1065, 1010,  52),
        ('A09',    800,  '60/100-10', '60/100-10', 1700, 715, 1075, 1225,  85),
        ('A10',    800,  '2.5-10',    '2.5-10',    1680, 680, 1080, 1220,  75),
        ('A11EXD', 1000, '3.0-10',    '3.0-10',    1685, 710, 1155, 1265,  90),
        ('A12S',   1000, '3.0-10',    '3.0-10',    1780, 750, 1170, 1265, 107),
        ('C35GT',  3000, '90/80-12',  '110/70-12', 1900, 720, 1165, 1360, 110),
        ('C35',    1800, '90/80-12',  '90/80-12',  1965, 720, 1160, 1370, 145),
        ('C35Y',   1200, '3.0-10',    '3.0-10',    1860, 720, 1160, 1365, 132),
        ('C32Y',   1200, '3.0-10',    '3.0-10',    2010, 730, 1080, 1345, 140),
        ('E52',    3000, '100/90-12', '120/70-12', 1970, 730, 1240, 1380, 175),
        ('B12',    1800, '3.0-10',    '3.0-10',    1990, 785, 1200, 1285, 105),
        ('Y06',    350,  '60/100-10', '60/100-10',    0,   0,    0, 1220,  50);

    -- ---------- Technical rows (section, line, label, value) ----------
    CREATE TEMP TABLE tmp_rows
    (
        model    text,
        section  text,
        line_no  integer,
        label    text,
        val      text
    ) ON COMMIT DROP;

    -- Per model rows that differ
    INSERT INTO tmp_rows
    SELECT x.model, s.section, s.line_no, s.label, s.val
    FROM
    (
        VALUES
        ('A04',    '30 KM/H',    '45 KM',      'Graphene Battery 48V12Ah',             '8-10 H',                             '0.8 Units/KWH One Complete Charge',  '6 Tube Vector-Based Controllers',  'Front & Rear Drum Brakes',                'Front & Rear Mechanical Suspension',  '135 MM'),
        ('A09',    '25-35 KM/H', '60-85 KM',   'Graphene Battery 48V26Ah',             '8-10 H',                             '1.39 Units/KWH One Complete Charge', '6 Tube Vector-Based Controllers',  'Front & Rear Drum Brakes',                'Front & Rear Hydraulic Suspension',   '155 MM'),
        ('A10',    '35 KM/H',    '65-75 KM',   'Graphene Battery 48V26Ah',             '8-10 H',                             '1.25 Units/KWH One Complete Charge', '9 Tube Vector-Based Controllers',  'Front & Rear Drum Brakes',                'Front Telescopic & Rear Hydraulic',   '140 MM'),
        ('A11EXD', '35-45 KM/H', '65-80 KM',   'Graphene Battery 60V26Ah',             '8-10 H',                             '1.56 Units/KWH One Complete Charge', '12 Tube Vector-Based Controllers', 'Front Disc & Rear Drum',                  'Front Telescopic & Rear Hydraulic',   '150 MM'),
        ('A12S',   '45 KM/H',    '85-95 KM',   'Graphene Battery 72V26Ah',             '8-9 H',                              '1.87 Units/KWH One Complete Charge', '12 Tube Vector-Based Controllers', 'Front Disc & Rear Drum Brakes',           'Front Telescopic & Rear Hydraulic',   '150 MM'),
        ('C35GT',  '45-75 KM/H', '100-135 KM', 'Lithium Iron Phosphate Battery 73.6V50Ah', '5-6 H',                          '3.68 Units/KWH One Complete Charge', '18 Tube Vector-Based Controllers', 'Front & Rear Disc Brakes',                'Front & Rear Hydraulic Suspension',   '175 MM'),
        ('C35',    '35-60 KM/H', '80-125 KM',  'Graphene Battery 72V35Ah',             '8-10 H',                             '2.52 Units/KWH One Complete Charge', '12 Tube Vector-Based Controllers', 'Front & Rear Disc Brakes',                'Front & Rear Hydraulic Suspension',   '170 MM'),
        ('C35Y',   '35-55 KM/H', '75-120 KM',  'Graphene Battery 72V35Ah',             '8-10 H',                             '2.52 Units/KWH One Complete Charge', '12 Tube Vector-Based Controllers', 'Front Disc & Rear Drum Brakes',           'Front & Rear Hydraulic Suspension',   '165 MM'),
        ('C32Y',   '55 KM/H',    '110-120 KM', 'Graphene Battery 72V35Ah',             '8-10 H',                             '2.52 Units/KWH One Complete Charge', '12 Tube Vector-Based Controllers', 'Front Disc & Rear Drum Brakes',           'Front & Rear Hydraulic Suspension',   '160 MM'),
        ('E52',    '77 KM/H',    '130-140 KM', 'Graphene Battery 96V35Ah',             '8-10 H',                             '3.36 Units/KWH One Complete Charge', '12 Tube Vector-Based Controllers', 'Front & Rear Disc Brakes With CBS',       'Front Telescopic & Rear Hydraulic',   '145 MM'),
        ('B12',    '65 KM/H',    '',           'Lithium Iron Battery 73.6V 50Ah',      'Fast 1.5 H / Standard 3.5 H (0-80%)', '',                                  '12 Tube 30A',                      'Front & Rear Disc (CBS)',                 'Front & Rear Hydraulic Damping',      '150 MM'),
        ('Y06',    '33 KM/H',    '70-80 KM',   'Lithium Battery 48V20Ah',              '7-8 H',                              '0.96 Units/KWH One Complete Charge', '6 Tube Vector-Based Controllers',  'Front & Rear Drum Brakes',                'Front & Rear Mechanical Suspension',  '150 MM')
    ) AS x (model, speed, range_km, battery, charging, consumption, controller, brakes, suspension, clearance)
    CROSS JOIN LATERAL
    (
        VALUES
        ('Features',              1, 'Top Speed',               x.speed),
        ('Features',              2, 'Max Range',               x.range_km),
        ('Electricals',           1, 'Battery',                 x.battery),
        ('Electricals',           2, 'Charging Time',           x.charging),
        ('Electricals',           3, 'Controller',              x.controller),
        ('Electricals',           4, 'Electricity Consumption', x.consumption),
        ('Brakes & Wheels',       1, 'Brakes',                  x.brakes),
        ('Brakes & Wheels',       2, 'Tyre Type',               'Vacuum Tyre'),
        ('Chassis & Suspension',  1, 'Suspension',              x.suspension),
        ('Dimensions & Capacity', 1, 'Ground Clearance',        x.clearance)
    ) AS s (section, line_no, label, val)
    WHERE s.val <> '';

    -- Motor power and dry weight rows (all models)
    INSERT INTO tmp_rows
    SELECT t.model, 'Engine / Motor', 1, 'Motor Power', t.watts || ' W'
    FROM   tmp_specs t;

    INSERT INTO tmp_rows
    SELECT t.model, 'Dimensions & Capacity', 2, 'Dry Weight', trim(to_char(t.dry_kg, 'FM9990.##'), '.') || ' KG'
    FROM   tmp_specs t;

    -- Extras
    INSERT INTO tmp_rows VALUES
        ('A11EXD', 'Dimensions & Capacity', 3, 'Pedal Length', '400 MM (L) x 380 MM (W)'),
        ('B12',    'Engine / Motor',        2, 'Motor Type',   'Hub Motor'),
        ('B12',    'Dimensions & Capacity', 3, 'Seat Storage', '33 L');

    -- ---------- Insert, model by model ----------
    FOR m IN SELECT * FROM tmp_specs ORDER BY model
    LOOP
        v_model_id := NULL;

        SELECT bm."BikeModelId"
        INTO   v_model_id
        FROM   "BikeModels" bm
        WHERE  bm."BrandManagementId" = v_brand_id
        AND    NOT bm."IsDeleted"
        AND    regexp_replace(upper(bm."ModelName"), '[^A-Z0-9]', '', 'g') = m.model
        LIMIT  1;

        IF v_model_id IS NULL THEN
            v_missing := v_missing + 1;
            RAISE NOTICE '% : bike model not found in REVOO - skipped.', m.model;
            CONTINUE;
        END IF;

        v_spec_id := NULL;

        SELECT s."MotorBikeSpecificationId"
        INTO   v_spec_id
        FROM   "MotorBikeSpecifications" s
        WHERE  s."BikeModelId" = v_model_id
        AND    NOT s."IsDeleted"
        LIMIT  1;

        IF v_spec_id IS NOT NULL THEN
            -- Fills only the fixed fields still empty / 0
            UPDATE "MotorBikeSpecifications"
            SET    "BodyType"        = CASE WHEN trim("BodyType") = '' THEN
                                           CASE WHEN m.watts < 1000 THEN 'MOTOR CYCLE (SMALL)' ELSE 'MOTOR CYCLE (LARGE)' END
                                       ELSE "BodyType" END,
                   "UnladenWeightKg" = CASE WHEN "UnladenWeightKg" = 0 THEN m.dry_kg ELSE "UnladenWeightKg" END,
                   "LadenWeightKg"   = CASE WHEN "LadenWeightKg" = 0
                                            THEN CASE WHEN "UnladenWeightKg" = 0 THEN m.dry_kg ELSE "UnladenWeightKg" END + 140
                                            ELSE "LadenWeightKg" END,
                   "WheelBaseMm"     = CASE WHEN "WheelBaseMm" = 0 THEN m.wb_mm ELSE "WheelBaseMm" END,
                   "LengthMm"        = CASE WHEN "LengthMm" = 0 THEN m.len_mm ELSE "LengthMm" END,
                   "WidthMm"         = CASE WHEN "WidthMm" = 0 THEN m.wid_mm ELSE "WidthMm" END,
                   "HeightMm"        = CASE WHEN "HeightMm" = 0 THEN m.hgt_mm ELSE "HeightMm" END,
                   "FrontTyreSize"   = CASE WHEN trim("FrontTyreSize") = '' THEN m.front ELSE "FrontTyreSize" END,
                   "RearTyreSize"    = CASE WHEN trim("RearTyreSize") = '' THEN m.rear ELSE "RearTyreSize" END,
                   "CountryOfOrigin" = CASE WHEN trim("CountryOfOrigin") = '' THEN 'CHINA' ELSE "CountryOfOrigin" END,
                   "Maker"           = CASE WHEN trim("Maker") = '' THEN upper(trim(v_maker)) ELSE "Maker" END
            WHERE  "MotorBikeSpecificationId" = v_spec_id;

            SELECT count(*) INTO v_rows
            FROM   "MotorBikeSpecificationItems"
            WHERE  "MotorBikeSpecificationId" = v_spec_id;

            IF v_rows = 0 THEN
                INSERT INTO "MotorBikeSpecificationItems"
                    ("MotorBikeSpecificationId", "Section", "LineNo", "Label", "Value")
                SELECT v_spec_id, r.section, r.line_no, r.label, r.val
                FROM   tmp_rows r
                WHERE  r.model = m.model;

                v_rows_only := v_rows_only + 1;
                RAISE NOTICE '% : specification exists - technical rows added, empty fixed fields filled.', m.model;
            ELSE
                v_skipped := v_skipped + 1;
                RAISE NOTICE '% : specification exists with rows - only empty fixed fields filled.', m.model;
            END IF;

            CONTINUE;
        END IF;

        -- Next MBS code (deleted rows count, never reused)
        SELECT coalesce(max(substring("SpecificationCode" FROM '^MBS-([0-9]+)$')::integer), 0) + 1
        INTO   v_next
        FROM   "MotorBikeSpecifications";

        v_code := 'MBS-' || lpad(v_next::text, 4, '0');

        INSERT INTO "MotorBikeSpecifications"
        (
            "SpecificationCode", "BikeModelId",
            "EngineCc", "MotorPowerWatts", "FuelType", "Cylinders",
            "VehicleClass", "BodyType", "SeatingCapacity",
            "UnladenWeightKg", "LadenWeightKg",
            "Maker", "CountryOfOrigin",
            "HorsePower", "Rpm",
            "WheelBaseMm", "LengthMm", "WidthMm", "HeightMm",
            "TyreCount", "FrontTyreSize", "RearTyreSize", "AxleCount",
            "ShowOnWebsite", "Remarks", "Status", "IsDeleted",
            "CreatedBy", "CreatedDate"
        )
        VALUES
        (
            v_code, v_model_id,
            0, m.watts, 'Electric', 1,
            'MOTOR CYCLE',
            CASE WHEN m.watts < 1000 THEN 'MOTOR CYCLE (SMALL)' ELSE 'MOTOR CYCLE (LARGE)' END,
            2,
            m.dry_kg, m.dry_kg + 140,
            upper(trim(v_maker)), 'CHINA',
            '', 0,
            m.wb_mm, m.len_mm, m.wid_mm, m.hgt_mm,
            2, m.front, m.rear, 1,
            true, 'Seeded from revoo-ev.com.bd (2026-11-07). Laden = unladen + 140 kg; check against BRTA papers.', true, false,
            1, now()
        )
        RETURNING "MotorBikeSpecificationId" INTO v_spec_id;

        INSERT INTO "MotorBikeSpecificationItems"
            ("MotorBikeSpecificationId", "Section", "LineNo", "Label", "Value")
        SELECT v_spec_id, r.section, r.line_no, r.label, r.val
        FROM   tmp_rows r
        WHERE  r.model = m.model;

        v_added := v_added + 1;
        RAISE NOTICE '% : % created.', m.model, v_code;
    END LOOP;

    RAISE NOTICE 'Done : % created, % got rows only, % left as they were, % models not found.',
        v_added, v_rows_only, v_skipped, v_missing;
END $$;


-- Check
SELECT s."SpecificationCode", bm."ModelName", s."MotorPowerWatts", s."BodyType",
       s."UnladenWeightKg", s."LadenWeightKg", s."WheelBaseMm",
       s."FrontTyreSize", s."RearTyreSize",
       (SELECT count(*) FROM "MotorBikeSpecificationItems" i
        WHERE i."MotorBikeSpecificationId" = s."MotorBikeSpecificationId") AS "Rows"
FROM   "MotorBikeSpecifications" s
JOIN   "BikeModels" bm ON bm."BikeModelId" = s."BikeModelId"
WHERE  NOT s."IsDeleted"
ORDER  BY s."SpecificationCode";
