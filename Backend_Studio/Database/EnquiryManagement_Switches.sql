-- ============================================================
-- System Configuration : Enquiry Management switches (2026-11-05)
--
-- Page switches (ScopeType Submenu) of Enquiry Management (MOD-010)
-- and one module switch. People with "Change Configuration" on a
-- page may change its switches; module switches are admin only.
-- Every switch starts at the behaviour the pages had before, so
-- nothing changes until one is turned.
--
-- Sales Enquiries  (CFG-MOD-010-0001 .. 0020)
--   0001 Expected Purchase Date Required          ON
--   0002 Auto Interest Level by Days              ON
--   0003 Repeat Mobile Joins the Open Enquiry     ON  (website)
--   0004 Call Note Required                       ON
--   0005 Allow Test Ride Overbooking              ON
--   0006 Website Test Ride Booking                ON
--   0007 Test Ride Booking Window      90 days    ON
--   0008 Driving Licence Required for Test Ride   OFF (website)
--   0009 Follow-up After a Test Ride    1 day     ON
-- Service Enquiries  (CFG-MOD-010-0021 .. 0040)
--   0021 Call Note Required                       ON
--   0022 Allow Appointment Overbooking            ON
--   0023 Website Service Booking                  ON
--   0024 Appointment Booking Window   180 days    ON
--   0025 Follow-up Before the Visit     1 day     ON
--   0026 Service Reminder Lead Days     7 days    ON
-- Module (admin only)
--   0041 Website Enquiries per Hour     5         ON
--
-- The codes are fixed (pages and server read them by code; a
-- missing switch behaves as its default). The script stops if the
-- module code is not MOD-010 or a page is missing. A switch that
-- already exists is left as it is. Safe to run more than once.
-- Run the whole script (F5).
-- ============================================================

DO $$
DECLARE
    v_module_id   bigint;
    v_module_code text;
    p             record;
    v_page_code   text;
    v_menu_code   text;
    n             integer;
    v_total       integer := 0;
BEGIN
    SELECT m."Id", m."Code"
    INTO   v_module_id, v_module_code
    FROM   "NavigationModules" m
    WHERE  lower(trim(m."RouteKey")) = 'enquiry-management'
    AND    NOT m."IsDeleted"
    LIMIT  1;

    IF v_module_id IS NULL THEN
        RAISE EXCEPTION 'Enquiry Management module not found - nothing changed.';
    END IF;

    IF upper(trim(v_module_code)) <> 'MOD-010' THEN
        RAISE EXCEPTION 'Enquiry Management module code is % (expected MOD-010) - nothing changed. Tell Claude the code.', v_module_code;
    END IF;

    CREATE TEMP TABLE tmp_enq_switches
    (
        page        text,
        code        text,
        name        text,
        on_text     text,
        off_text    text,
        def_on      boolean,
        def_value   text,
        value_type  text,
        unit        text,
        vmin        int,
        vmax        int,
        empty_text  text,
        critical    boolean,
        ord         int,
        remarks     text
    ) ON COMMIT DROP;

    INSERT INTO tmp_enq_switches
    VALUES
    -- ---------------- Sales Enquiries ----------------
    ('sales-enquiries', 'CFG-MOD-010-0001', 'Expected Purchase Date Required',
     'A sales enquiry cannot be saved without an Expected Purchase Date.',
     'The Expected Purchase Date may be left empty (the interest level is then chosen by hand).',
     true, '', 'None', '', NULL, NULL, '', false, 1, ''),

    ('sales-enquiries', 'CFG-MOD-010-0002', 'Auto Interest Level by Days',
     'An open enquiry with an Expected Purchase Date takes the interest level of the days left (Enquiry Setup ranges), and heats up as the date comes near.',
     'The interest level is always chosen by hand.',
     true, '', 'None', '', NULL, NULL, '', false, 2, ''),

    ('sales-enquiries', 'CFG-MOD-010-0003', 'Repeat Mobile Joins the Open Enquiry',
     'A website enquiry from a mobile that already has an open sales enquiry is added to it as a note (no new number).',
     'Every website enquiry gets its own new enquiry number.',
     true, '', 'None', '', NULL, NULL, '', false, 3, 'Website enquiries only.'),

    ('sales-enquiries', 'CFG-MOD-010-0004', 'Call Note Required',
     'Logging a call needs a short note of what the customer said (not for "No answer").',
     'A call may be logged without a note.',
     true, '', 'None', '', NULL, NULL, '', false, 4, ''),

    ('sales-enquiries', 'CFG-MOD-010-0005', 'Allow Test Ride Overbooking',
     'A full test ride slot can still be booked from the Test Rides board after a warning.',
     'A full slot cannot be booked; pick another slot.',
     true, '', 'None', '', NULL, NULL, '', false, 5, 'The website never overbooks.'),

    ('sales-enquiries', 'CFG-MOD-010-0006', 'Website Test Ride Booking',
     'The website shows the free test ride times of the default Test Ride time slot and books the one picked.',
     'The website asks Morning / Afternoon / Evening only; staff book the ride.',
     true, '', 'None', '', NULL, NULL, '', false, 6, ''),

    ('sales-enquiries', 'CFG-MOD-010-0007', 'Test Ride Booking Window',
     'A test ride can be booked up to this many days ahead.',
     'A test ride can be booked up to a year ahead.',
     true, '90', 'Number', 'days', 1, 365, '', false, 7, ''),

    ('sales-enquiries', 'CFG-MOD-010-0008', 'Driving Licence Required for Test Ride',
     'A website test ride request without a driving licence is refused.',
     'Whether they have a licence is only asked.',
     false, '', 'None', '', NULL, NULL, '', false, 8, 'Website test ride requests.'),

    ('sales-enquiries', 'CFG-MOD-010-0009', 'Follow-up After a Test Ride',
     'When a ride is marked Ridden, the next follow-up is set this many days later (0 = the same day) to ask how it went.',
     'Marking a ride Ridden does not change the next follow-up.',
     true, '1', 'Number', 'days', 0, 30, '', false, 9, ''),

    -- ---------------- Service Enquiries ----------------
    ('service-enquiries', 'CFG-MOD-010-0021', 'Call Note Required',
     'Logging a call needs a short note of what the customer said (not for "No answer").',
     'A call may be logged without a note.',
     true, '', 'None', '', NULL, NULL, '', false, 1, ''),

    ('service-enquiries', 'CFG-MOD-010-0022', 'Allow Appointment Overbooking',
     'A full appointment slot can still be booked from the Service Appointments board after a warning.',
     'A full slot cannot be booked; pick another slot.',
     true, '', 'None', '', NULL, NULL, '', false, 2, 'The website never overbooks.'),

    ('service-enquiries', 'CFG-MOD-010-0023', 'Website Service Booking',
     'The website shows the free service times of the default Service Appointment time slot and books the one picked.',
     'The website shows no times; staff book the appointment.',
     true, '', 'None', '', NULL, NULL, '', false, 3, ''),

    ('service-enquiries', 'CFG-MOD-010-0024', 'Appointment Booking Window',
     'An appointment can be booked up to this many days ahead.',
     'An appointment can be booked up to a year ahead.',
     true, '180', 'Number', 'days', 1, 365, '', false, 4, ''),

    ('service-enquiries', 'CFG-MOD-010-0025', 'Follow-up Before the Visit',
     'Booking or moving an appointment sets the next follow-up this many days before the visit (0 = the visit day; today at the earliest).',
     'Booking an appointment does not change the next follow-up.',
     true, '1', 'Number', 'days', 0, 7, '', false, 5, ''),

    ('service-enquiries', 'CFG-MOD-010-0026', 'Service Reminder Lead Days',
     'A sold bike''s due service becomes a Service Enquiry this many days before its due date.',
     'The Service Enquiry is raised on the due date.',
     true, '7', 'Number', 'days', 0, 60, '', false, 6, 'Sold Bikes service schedules.'),

    -- ---------------- Module ----------------
    ('', 'CFG-MOD-010-0041', 'Website Enquiries per Hour',
     'One address may send this many website enquiries (sales, test ride, service, parts) per hour.',
     'No hourly limit (the hidden field and the 3-second check stay).',
     true, '5', 'Number', 'sends', 1, 100, '', false, 1, 'Spam guard of the website forms.');

    -- ---------- Page switches ----------
    FOR p IN SELECT DISTINCT page FROM tmp_enq_switches WHERE page <> '' ORDER BY page
    LOOP
        v_page_code := NULL;

        SELECT s."Code", mn."Code"
        INTO   v_page_code, v_menu_code
        FROM   "NavigationSubmenus" s
        JOIN   "NavigationMenus" mn ON mn."Id" = s."NavigationMenuId"
        WHERE  s."Route" ILIKE '/enquiry-management/%/' || p.page
        AND    NOT s."IsDeleted"
        LIMIT  1;

        IF v_page_code IS NULL THEN
            RAISE EXCEPTION 'Page % not found by route - nothing changed.', p.page;
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
            t.code, t.name, t.on_text, t.off_text,
            t.def_on, t.def_value,
            t.value_type, t.unit, t.vmin, t.vmax, t.empty_text,
            t.def_on, t.def_value, NULL,
            t.critical, true, t.ord, t.remarks,
            false, 1, now()
        FROM   tmp_enq_switches t
        WHERE  t.page = p.page
        AND    NOT EXISTS
               (
                   SELECT 1 FROM "SystemConfigurations" c WHERE c."ConfigurationCode" = t.code
               )
        ORDER  BY t.ord;

        GET DIAGNOSTICS n = ROW_COUNT;
        v_total := v_total + n;
        RAISE NOTICE '% (%) : % switch(es) added', p.page, v_page_code, n;
    END LOOP;

    -- ---------- Module switches ----------
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
        v_module_id, 'Module', NULL, NULL,
        t.code, t.name, t.on_text, t.off_text,
        t.def_on, t.def_value,
        t.value_type, t.unit, t.vmin, t.vmax, t.empty_text,
        t.def_on, t.def_value, NULL,
        t.critical, true, t.ord, t.remarks,
        false, 1, now()
    FROM   tmp_enq_switches t
    WHERE  t.page = ''
    AND    NOT EXISTS
           (
               SELECT 1 FROM "SystemConfigurations" c WHERE c."ConfigurationCode" = t.code
           );

    GET DIAGNOSTICS n = ROW_COUNT;
    v_total := v_total + n;
    RAISE NOTICE 'Module : % switch(es) added', n;

    RAISE NOTICE 'Enquiry Management switches added : %', v_total;
END $$;

SELECT COALESCE("NavigationSubmenuCode", 'Module') AS "Page", "ConfigurationCode", "ConfigurationName",
       "IsEnabled", "Value", "ValueType"
FROM   "SystemConfigurations"
WHERE  "ConfigurationCode" LIKE 'CFG-MOD-010-%'
ORDER  BY "ConfigurationCode";
