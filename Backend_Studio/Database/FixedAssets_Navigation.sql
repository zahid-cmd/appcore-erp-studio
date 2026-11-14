ROLLBACK;

-- =====================================================================
-- FixedAssets_Navigation.sql   (2026-11-14)
-- ---------------------------------------------------------------------
-- The menus and pages of Fixed Assets Management (the module is made
-- on the Navigation page : route key fixed-assets-management), the
-- same way the Navigation page makes them :
--   Code   MNU-<module seq>-<menu seq> / SUB-<module>-<menu>-<sub>
--   Route  /<module route key>/<menu route key>/<submenu route key>
--
--   1  Asset Setup       asset-setup
--        Asset Groups                  asset-groups
--        Depreciation of Fixed Assets  depreciation-of-fixed-assets
--        Asset Locations               asset-locations
--        Asset Configuration           asset-configuration
--   2  Asset Register    asset-register
--        Asset Acquisitions      asset-acquisitions
--        Fixed Asset Register    fixed-asset-register
--        Opening Assets          opening-assets
--   (3  Asset Movements : removed 2026-11-15, not required - see
--       FixedAssets_Remove_Movements.sql)
--   4  Depreciation      depreciation
--        Depreciation Runs       depreciation-runs
--        Depreciation Schedule   depreciation-schedule
--   5  Asset Disposal    asset-disposal
--        Asset Disposals         asset-disposals
--   6  Asset Reports     asset-reports
--        Fixed Asset Schedule    fixed-asset-schedule
--        Asset Tags              asset-tags
--        Asset Verification      asset-verification
--
-- Hand-written pages : NEVER run Module Sync / Menu Sync / Submenu
-- Sync / Code Sync for this module (the routes are in the code
-- already).
--
-- Rows that already exist (same route key) are skipped : safe to run
-- again. A submenu name must be unique in the whole system : the
-- script stops when one of the names is taken elsewhere. Run the
-- whole script (F5). ASCII only.
--
-- AFTER : run FixedAssets_Engine.sql; then Security & Permission >
-- Activity Assignment : tick the pages for the roles, and log in
-- again.
-- =====================================================================

DO $$
DECLARE
    v_module    record;
    v_menu      record;
    v_menu_id   bigint;
    v_seq       int;
    m           record;
    s           record;
BEGIN
    -- ---------- Module ----------
    SELECT "Id", "SequenceNo", "RouteKey", "Name", "Code" INTO v_module
    FROM   "NavigationModules"
    WHERE  lower(trim("RouteKey")) = 'fixed-assets-management'
    AND    "IsDeleted" = false
    LIMIT  1;

    IF v_module."Id" IS NULL THEN
        RAISE EXCEPTION 'Module with route key fixed-assets-management not found : make it on the Navigation page first - nothing changed.';
    END IF;

    RAISE NOTICE 'Module % % (route key %)', v_module."Code", v_module."Name", v_module."RouteKey";

    -- ---------- Menus ----------
    FOR m IN
        SELECT * FROM (VALUES
            (1, 'Asset Setup',     'fa-solid fa-sliders',            'asset-setup',     'Asset groups (with their ledgers), their depreciation, locations and the configuration.'),
            (2, 'Asset Register',  'fa-solid fa-clipboard-list',     'asset-register',  'Buying assets, the asset cards and the opening assets.'),
            (4, 'Depreciation',    'fa-solid fa-chart-line',         'depreciation',    'The monthly depreciation runs and the schedule of an asset.'),
            (5, 'Asset Disposal',  'fa-solid fa-box-archive',        'asset-disposal',  'Sale, scrap, write-off and lost assets.'),
            (6, 'Asset Reports',   'fa-solid fa-file-invoice',       'asset-reports',   'Fixed Asset Schedule, asset tags and the physical count.')
        ) AS t (ord, name, icon, route_key, remarks)
        ORDER BY ord
    LOOP
        SELECT "Id" INTO v_menu_id
        FROM   "NavigationMenus"
        WHERE  "NavigationModuleId" = v_module."Id"
        AND    lower(trim("RouteKey")) = m.route_key
        AND    "IsDeleted" = false
        LIMIT  1;

        IF v_menu_id IS NULL THEN
            SELECT COALESCE(MAX("SequenceNo"), 0) + 1 INTO v_seq
            FROM   "NavigationMenus"
            WHERE  "NavigationModuleId" = v_module."Id";

            INSERT INTO "NavigationMenus"
                ("NavigationModuleId", "SequenceNo", "Code", "Name", "Icon",
                 "RouteKey", "Route", "DisplayOrder", "Remarks",
                 "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
            VALUES
                (v_module."Id", v_seq,
                 'MNU-' || lpad(v_module."SequenceNo"::text, 3, '0') || '-' || lpad(v_seq::text, 3, '0'),
                 m.name, m.icon,
                 m.route_key, '/' || v_module."RouteKey" || '/' || m.route_key,
                 m.ord, m.remarks,
                 true, false, 1, now());

            RAISE NOTICE 'Menu created : %', m.name;
        ELSE
            RAISE NOTICE 'Menu exists, skipped : %', m.name;
        END IF;
    END LOOP;

    -- ---------- A page of the first build, renamed ----------
    -- Asset Categories (asset-categories) is Asset Groups (asset-groups)
    UPDATE "NavigationSubmenus" n
    SET    "Name"     = 'Asset Groups',
           "RouteKey" = 'asset-groups',
           "Route"    = '/' || v_module."RouteKey" || '/asset-setup/asset-groups',
           "Remarks"  = 'A kind of asset. Making one makes its two ledgers : PPE - <name> and ACD - <name>. Hand-written page : never run Submenu / Code Sync.'
    FROM   "NavigationMenus" mn
    WHERE  mn."Id" = n."NavigationMenuId"
    AND    mn."NavigationModuleId" = v_module."Id"
    AND    lower(trim(n."RouteKey")) = 'asset-categories'
    AND    n."IsDeleted" = false
    AND    NOT EXISTS (SELECT 1 FROM "NavigationSubmenus" x
                       WHERE  x."NavigationMenuId" = n."NavigationMenuId"
                       AND    lower(trim(x."RouteKey")) = 'asset-groups'
                       AND    x."IsDeleted" = false);

    -- ---------- Submenus ----------
    FOR s IN
        SELECT * FROM (VALUES
            (1, 'asset-setup',     1, 'Asset Groups',          'fa-solid fa-layer-group',          'asset-groups',          'A kind of asset. Making one makes its two ledgers : PPE - <name> and ACD - <name>.'),
            (1, 'asset-setup',     2, 'Depreciation of Fixed Assets', 'fa-solid fa-percent',       'depreciation-of-fixed-assets', 'The depreciation of each asset group : method, rate or life, residual value and the expense ledger.'),
            (1, 'asset-setup',     3, 'Asset Locations',       'fa-solid fa-location-dot',         'asset-locations',       'Where an asset is kept : showroom floor, workshop, office.'),
            (1, 'asset-setup',     4, 'Asset Configuration',   'fa-solid fa-gear',                 'asset-configuration',   'The switches and rules of the module.'),
            (2, 'asset-register',  1, 'Asset Acquisitions',    'fa-solid fa-cart-plus',            'asset-acquisitions',    'Buying assets : posts the voucher and makes the asset cards.'),
            (2, 'asset-register',  2, 'Fixed Asset Register',  'fa-solid fa-id-card',              'fixed-asset-register',  'The asset cards : cost, depreciation, book value, where and with whom.'),
            (2, 'asset-register',  3, 'Opening Assets',        'fa-solid fa-box-open',             'opening-assets',        'Assets owned before the module : the card and its depreciation to date, no voucher.'),
            (4, 'depreciation',    1, 'Depreciation Runs',     'fa-solid fa-calendar-check',       'depreciation-runs',     'The depreciation of a month for a branch : preview, post, undo the last run.'),
            (4, 'depreciation',    2, 'Depreciation Schedule', 'fa-solid fa-table-list',           'depreciation-schedule', 'An asset month by month to the end of its life.'),
            (5, 'asset-disposal',  1, 'Asset Disposals',       'fa-solid fa-trash-can-arrow-up',   'asset-disposals',       'Sale, scrap, write-off or loss of an asset, with the gain or loss.'),
            (6, 'asset-reports',   1, 'Fixed Asset Schedule',  'fa-solid fa-table-columns',        'fixed-asset-schedule',  'Cost, depreciation and book value by category for a period.'),
            (6, 'asset-reports',   2, 'Asset Tags',            'fa-solid fa-qrcode',               'asset-tags',            'QR labels to stick on the assets.'),
            (6, 'asset-reports',   3, 'Asset Verification',    'fa-solid fa-clipboard-check',      'asset-verification',    'The physical count of a location against the register.')
        ) AS t (menu_ord, menu_key, ord, name, icon, route_key, remarks)
        ORDER BY menu_ord, ord
    LOOP
        SELECT "Id", "SequenceNo", "RouteKey" INTO v_menu
        FROM   "NavigationMenus"
        WHERE  "NavigationModuleId" = v_module."Id"
        AND    lower(trim("RouteKey")) = s.menu_key
        AND    "IsDeleted" = false
        LIMIT  1;

        IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
                   WHERE  "NavigationMenuId" = v_menu."Id"
                   AND    lower(trim("RouteKey")) = s.route_key
                   AND    "IsDeleted" = false) THEN
            RAISE NOTICE 'Page exists, skipped : %', s.name;
            CONTINUE;
        END IF;

        IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
                   WHERE  lower(trim("Name")) = lower(s.name)
                   AND    "IsDeleted" = false) THEN
            RAISE EXCEPTION 'A page named "%" already exists elsewhere : page names must be unique. Tell Claude - nothing changed.', s.name;
        END IF;

        SELECT COALESCE(MAX("SequenceNo"), 0) + 1 INTO v_seq
        FROM   "NavigationSubmenus"
        WHERE  "NavigationMenuId" = v_menu."Id";

        INSERT INTO "NavigationSubmenus"
            ("NavigationMenuId", "SequenceNo", "Code", "Name", "Icon",
             "RouteKey", "Route", "DisplayOrder", "Remarks",
             "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        VALUES
            (v_menu."Id", v_seq,
             'SUB-' || lpad(v_module."SequenceNo"::text, 3, '0')
                    || '-' || lpad(v_menu."SequenceNo"::text, 3, '0')
                    || '-' || lpad(v_seq::text, 3, '0'),
             s.name, s.icon,
             s.route_key,
             '/' || v_module."RouteKey" || '/' || v_menu."RouteKey" || '/' || s.route_key,
             s.ord, s.remarks || ' Hand-written page : never run Submenu / Code Sync.',
             true, false, 1, now());

        RAISE NOTICE 'Page created : %', s.name;
    END LOOP;

    -- ---------- The order of the Asset Setup pages ----------
    UPDATE "NavigationSubmenus" n
    SET    "DisplayOrder" = o.ord
    FROM   "NavigationMenus" mn,
           (VALUES ('asset-groups', 1), ('depreciation-of-fixed-assets', 2),
                   ('asset-locations', 3), ('asset-configuration', 4)) AS o (route_key, ord)
    WHERE  mn."Id" = n."NavigationMenuId"
    AND    mn."NavigationModuleId" = v_module."Id"
    AND    lower(trim(mn."RouteKey")) = 'asset-setup'
    AND    lower(trim(n."RouteKey")) = o.route_key
    AND    n."IsDeleted" = false;
END
$$;


-- ---------------------------------------------------------------------
-- Check (run on its own)
-- ---------------------------------------------------------------------

SELECT m."Code"  AS "Menu Code",  m."Name" AS "Menu",
       s."Code"  AS "Page Code",  s."Name" AS "Page",
       s."Route", s."DisplayOrder"
FROM   "NavigationMenus" m
JOIN   "NavigationModules" d ON d."Id" = m."NavigationModuleId" AND lower(trim(d."RouteKey")) = 'fixed-assets-management'
LEFT   JOIN "NavigationSubmenus" s ON s."NavigationMenuId" = m."Id" AND s."IsDeleted" = false
WHERE  m."IsDeleted" = false
ORDER  BY m."DisplayOrder", s."DisplayOrder";
