ROLLBACK;

-- =====================================================================
-- FixedAssets_AutoJournal_Sources.sql   (2026-11-14; Opening Assets
-- and the Charge Depreciation route added 2026-11-15)
-- ---------------------------------------------------------------------
-- Fixed Assets on Accounts & Finance > Accounting Registers >
-- Auto Journal Registers.
--
-- The journals of Fixed Assets are Journal Vouchers (JV) written by
-- the pages :
--     Asset Acquisitions    assets bought (posting)
--     Opening Assets        the assets owned before the module (cost,
--                           depreciation to date, opening ledger)
--     Charge Depreciation   the depreciation of a month (was
--                           Depreciation Runs)
--     Asset Disposals       sale / scrap / write-off / lost
--
-- A JV belongs to a page when that page's table holds its number, so
-- each page gets a small view with one column "VoucherNo" (what the
-- register looks for).
--
-- Run AFTER FixedAssets_Engine.sql, FixedAssets_Navigation.sql and
-- AutoJournalRegisters_Sources.sql. Safe to run more than once.
-- ASCII only.
-- =====================================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. The voucher numbers of each page
-- ------------------------------------------------------------

CREATE OR REPLACE VIEW public."FaAcquisitionVouchers" AS
SELECT DISTINCT "JournalVoucherNo" AS "VoucherNo"
FROM   public."FaAcquisitions"
WHERE  "JournalVoucherNo" <> '';

-- an opening asset card holds the number of its live voucher (a
-- cancelled one is replaced when the card is changed)
CREATE OR REPLACE VIEW public."FaOpeningAssetVouchers" AS
SELECT DISTINCT "JournalVoucherNo" AS "VoucherNo"
FROM   public."FaAssets"
WHERE  "Source" = 'Opening'
AND    "JournalVoucherNo" <> '';

CREATE OR REPLACE VIEW public."FaDepreciationRunVouchers" AS
SELECT DISTINCT "JournalVoucherNo" AS "VoucherNo"
FROM   public."FaDepreciationRuns"
WHERE  "JournalVoucherNo" <> '';

CREATE OR REPLACE VIEW public."FaDisposalVouchers" AS
SELECT DISTINCT "JournalVoucherNo" AS "VoucherNo"
FROM   public."FaDisposals"
WHERE  "JournalVoucherNo" <> '';


-- ------------------------------------------------------------
-- 2. Sources (page found by the end of its route)
-- ------------------------------------------------------------

INSERT INTO public."AutoJournalSources"
    ("VoucherType", "SourceTable", "NavigationSubmenuCode", "IsAutoJournal", "DisplayOrder", "Remarks")
SELECT
    v.voucher_type,
    v.source_table,
    COALESCE(s."Code", ''),
    true,
    v.ord,
    v.remarks
FROM
(
    VALUES
        (71, 'JV', 'FaAcquisitionVouchers',     '/asset-acquisitions',  'Fixed Assets : assets bought'),
        (72, 'JV', 'FaOpeningAssetVouchers',    '/opening-assets',      'Fixed Assets : assets owned before the module'),
        (73, 'JV', 'FaDepreciationRunVouchers', '/charge-depreciation', 'Fixed Assets : depreciation of a month'),
        (75, 'JV', 'FaDisposalVouchers',        '/asset-disposals',    'Fixed Assets : asset disposed')
) AS v (ord, voucher_type, source_table, route_end, remarks)
LEFT JOIN LATERAL
(
    SELECT n."Code"
    FROM   "NavigationSubmenus" n
    WHERE  n."IsDeleted" = false
    AND    lower(n."Route") LIKE '/fixed-assets-management/%' || v.route_end
    ORDER  BY n."Id"
    LIMIT  1
) AS s ON true
ON CONFLICT ("VoucherType", "SourceTable") DO UPDATE
SET    "NavigationSubmenuCode" = EXCLUDED."NavigationSubmenuCode"
WHERE  public."AutoJournalSources"."NavigationSubmenuCode" = ''
AND    EXCLUDED."NavigationSubmenuCode" <> '';

COMMIT;


-- ------------------------------------------------------------
-- Check (run on its own) : an empty Page means the route was not
-- found
-- ------------------------------------------------------------

SELECT j."VoucherType",
       j."SourceTable",
       j."NavigationSubmenuCode" AS "Submenu",
       COALESCE(s."Name", '')    AS "Page",
       j."IsAutoJournal",
       j."Remarks"
FROM   public."AutoJournalSources" j
LEFT   JOIN "NavigationSubmenus" s ON s."Code" = j."NavigationSubmenuCode" AND s."IsDeleted" = false
WHERE  j."SourceTable" LIKE 'Fa%'
ORDER  BY j."DisplayOrder";
