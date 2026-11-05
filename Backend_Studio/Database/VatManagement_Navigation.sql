-- =====================================================================
-- VatManagement_Navigation.sql   (2026-11-03)
-- ---------------------------------------------------------------------
-- Completes the menus and submenus of the existing VAT Management
-- module (route key vat-management), the same way the Navigation page
-- does :
--   Code   MNU-<module seq>-<menu seq> / SUB-<module>-<menu>-<sub>
--   Route  /<module route key>/<menu route key>/<submenu route key>
--   SequenceNo = next number (deleted rows counted)
--
-- The module and the menu VAT Setup (Sales VAT, Purchase VAT) already
-- exist : they are found by route key and skipped; only the new rows
-- are added.
--
--   VAT Setup (exists)                /vat-management/vat-setup
--     1  Sales VAT                (exists)
--     2  Purchase VAT             (exists)
--     3  VAT Configuration        (hand-written setup page : NO Code Sync)
--   VAT Documents                     /vat-management/vat-documents
--     1  Tax Invoices             (Mushak 6.3 register)
--     2  Transfer Challans        (Mushak 6.5 : inter-branch transfers)
--     3  Credit Notes             (Mushak 6.7 : generated from returns)
--     4  Debit Notes              (Mushak 6.8 : generated)
--   VAT Books & Returns               /vat-management/vat-books-returns
--     1  Purchase Book            (Mushak 6.1)
--     2  Sales Book               (Mushak 6.2)
--     3  Purchase Sales Book      (Mushak 6.2.1)
--     4  VAT Returns              (Mushak 9.1 : prepared by the system,
--                                  filed online by the user)
--     5  VAT Deposits             (treasury challan payments)
--     6  VAT Dashboard            (read-only page : NO Code Sync)
--
-- Page names carry no dots / brackets (Code Sync builds class names
-- from them); each page shows its Mushak number in its subtitle.
-- Generated registers / books are read-only pages : whether they get a
-- Code Sync is decided page by page when we build them.
-- Submenu names must be unique system-wide : the script refuses a
-- duplicate. Rows that already exist (same route key) are skipped, so
-- it is safe to run again. One transaction. Run the whole script (F5).
--
-- AFTER : Menu Sync; tick the pages for the roles in Security &
-- Permission > Activity Assignment, then log in again.
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
    -- ---------- Module (created on the Navigation page) ----------
    SELECT "Id", "SequenceNo", "RouteKey", "Name", "Code" INTO v_module
    FROM   "NavigationModules"
    WHERE  lower("RouteKey") = 'vat-management'
    AND    "IsDeleted" = false;

    IF v_module."Id" IS NULL THEN
        RAISE EXCEPTION 'Module with route key vat-management not found : the VAT Management module (route key vat-management) is expected to exist.';
    END IF;

    RAISE NOTICE 'Module % % (route key %)', v_module."Code", v_module."Name", v_module."RouteKey";

    -- ---------- Menus ----------
    FOR m IN
        SELECT * FROM (VALUES
            (1, 'VAT Setup',           'fa-solid fa-percent',        'vat-setup'),
            (2, 'VAT Documents',       'fa-solid fa-file-invoice',   'vat-documents'),
            (3, 'VAT Books & Returns', 'fa-solid fa-book',           'vat-books-returns')
        ) AS t (ord, name, icon, route_key)
        ORDER BY ord
    LOOP
        SELECT "Id" INTO v_menu_id
        FROM   "NavigationMenus"
        WHERE  "NavigationModuleId" = v_module."Id"
        AND    lower("RouteKey") = m.route_key
        AND    "IsDeleted" = false;

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
                 m.ord, NULL,
                 true, false, 1, now())
            RETURNING "Id" INTO v_menu_id;

            RAISE NOTICE 'Menu created : %', m.name;
        ELSE
            RAISE NOTICE 'Menu exists, skipped : %', m.name;
        END IF;
    END LOOP;

    -- ---------- Submenus ----------
    FOR s IN
        SELECT * FROM (VALUES
            (1, 'vat-setup',         3, 'VAT Configuration',   'fa-solid fa-sliders',             'vat-configuration'),
            (2, 'vat-documents',     1, 'Tax Invoices',        'fa-solid fa-receipt',             'tax-invoices'),
            (2, 'vat-documents',     2, 'Transfer Challans',   'fa-solid fa-truck-arrow-right',   'transfer-challans'),
            (2, 'vat-documents',     3, 'Credit Notes',        'fa-solid fa-file-circle-minus',   'credit-notes'),
            (2, 'vat-documents',     4, 'Debit Notes',         'fa-solid fa-file-circle-plus',    'debit-notes'),
            (3, 'vat-books-returns', 1, 'Purchase Book',       'fa-solid fa-book-open',           'purchase-book'),
            (3, 'vat-books-returns', 2, 'Sales Book',          'fa-solid fa-book-open-reader',    'sales-book'),
            (3, 'vat-books-returns', 3, 'Purchase Sales Book', 'fa-solid fa-book-bookmark',       'purchase-sales-book'),
            (3, 'vat-books-returns', 4, 'VAT Returns',         'fa-solid fa-file-contract',       'vat-returns'),
            (3, 'vat-books-returns', 5, 'VAT Deposits',        'fa-solid fa-building-columns',    'vat-deposits'),
            (3, 'vat-books-returns', 6, 'VAT Dashboard',       'fa-solid fa-chart-pie',           'vat-dashboard')
        ) AS t (menu_ord, menu_key, ord, name, icon, route_key)
        ORDER BY menu_ord, ord
    LOOP
        SELECT "Id", "SequenceNo", "RouteKey" INTO v_menu
        FROM   "NavigationMenus"
        WHERE  "NavigationModuleId" = v_module."Id"
        AND    lower("RouteKey") = s.menu_key
        AND    "IsDeleted" = false;

        IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
                   WHERE  "NavigationMenuId" = v_menu."Id"
                   AND    lower("RouteKey") = s.route_key
                   AND    "IsDeleted" = false) THEN
            RAISE NOTICE 'Submenu exists, skipped : %', s.name;
            CONTINUE;
        END IF;

        -- Submenu names must be unique across the system (Code Sync)
        IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
                   WHERE  lower("Name") = lower(s.name)
                   AND    "IsDeleted" = false) THEN
            RAISE EXCEPTION 'A submenu named "%" already exists elsewhere : names must be unique (Code Sync).', s.name;
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
             s.ord, NULL,
             true, false, 1, now());

        RAISE NOTICE 'Submenu created : %', s.name;
    END LOOP;
END
$$;


-- ---------------------------------------------------------------------
-- Dashboard first (rule, owner 2026-11-03) : VAT Dashboard becomes submenu 1
-- of its menu; the others keep their order behind it. Codes unchanged.
-- ---------------------------------------------------------------------

WITH dash AS
(
    SELECT s."Id", s."NavigationMenuId"
    FROM   "NavigationSubmenus" s
    JOIN   "NavigationMenus"    m ON m."Id" = s."NavigationMenuId" AND m."IsDeleted" = false
    JOIN   "NavigationModules"  d ON d."Id" = m."NavigationModuleId" AND d."IsDeleted" = false
    WHERE  s."IsDeleted" = false
    AND    lower(d."RouteKey") = 'vat-management'
    AND    lower(m."RouteKey") = 'vat-books-returns'
    AND    lower(s."RouteKey") = 'vat-dashboard'
),
ordered AS
(
    SELECT s."Id",
           row_number() OVER
           (
               PARTITION BY s."NavigationMenuId"
               ORDER BY CASE WHEN s."Id" IN (SELECT "Id" FROM dash) THEN 0 ELSE 1 END,
                        s."DisplayOrder",
                        s."SequenceNo"
           ) AS rn
    FROM   "NavigationSubmenus" s
    WHERE  s."IsDeleted" = false
    AND    s."NavigationMenuId" IN (SELECT "NavigationMenuId" FROM dash)
)
UPDATE "NavigationSubmenus" u
SET    "DisplayOrder" = o.rn
FROM   ordered o
WHERE  u."Id" = o."Id"
AND    u."DisplayOrder" IS DISTINCT FROM o.rn;


-- ---------------------------------------------------------------------
-- Check (run on its own)
-- ---------------------------------------------------------------------

SELECT m."Code"  AS "Menu Code",  m."Name" AS "Menu",
       s."Code"  AS "Submenu Code", s."Name" AS "Submenu",
       s."Icon", s."Route", s."DisplayOrder"
FROM   "NavigationMenus" m
JOIN   "NavigationModules" d ON d."Id" = m."NavigationModuleId" AND lower(d."RouteKey") = 'vat-management'
LEFT   JOIN "NavigationSubmenus" s ON s."NavigationMenuId" = m."Id" AND s."IsDeleted" = false
WHERE  m."IsDeleted" = false
ORDER  BY m."DisplayOrder", s."DisplayOrder";
