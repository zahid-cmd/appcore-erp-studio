-- =====================================================================
-- Template_TW_Cleanup.sql   (2026-11-19)
-- ---------------------------------------------------------------------
-- Turns AppCoreTpl_TW (a copy of AppCoreERP_Studio) into the clean
-- Two Wheeler starter template. See the project docs
-- design-database-multi-product.md and
-- template-tw-table-classification.md.
--
-- RULE : every table is CLEARED unless it is listed below as
--        KEEP / CATALOGUE / RESET. New tables can never leak data.
--
--   KEEP       structure, switches, chart, posting, HR samples,
--              wings, screen parts, menus and permission rules
--   CATALOGUE  REVOO : brand, colours, models, variants,
--              specifications, categories, warranty, PDI,
--              registration types, places (Locations)
--   RESET      New Company, one Head Office branch (Sales Center),
--              one warehouse, the current financial year, the
--              admin user only (no password : set when a client is
--              created), only catalogue pictures, website blank
--
-- The template's administrator is made from the user "Zahid"
-- (UserProfileId 5) : renamed to "admin", no password, no
-- Developer role (owner 2026-11-19 : the database has no "admin")
--
-- SAFE : runs only on the database AppCoreTpl_TW. The whole file
-- is one unit : if any statement fails, nothing is changed.
--
-- HOW : pgAdmin, Query Tool on AppCoreTpl_TW, paste ALL, press F5.
-- ASCII only.
-- =====================================================================


-- 0. Guard : only AppCoreTpl_TW, and the admin user must exist ------

DO $$
BEGIN
    IF current_database() <> 'AppCoreTpl_TW' THEN
        RAISE EXCEPTION 'Wrong database (%). This script runs only on AppCoreTpl_TW.', current_database();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public."UserProfiles" WHERE "UserProfileId" = 5 AND lower("UserName") = 'zahid') THEN
        RAISE EXCEPTION 'User 5 (Zahid) was not found : stopped, nothing changed.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public."Wings" WHERE "WingName" = 'Sales Center') THEN
        RAISE EXCEPTION 'Wing "Sales Center" was not found : stopped, nothing changed.';
    END IF;
END $$;


-- 1. Ledgers made for rows that are cleared below ---------------------
--    (customers, suppliers, bank / cash / MFS / POS / EMI accounts),
--    unless a kept table still points to the ledger

DELETE FROM public."GeneralLedgers" g
WHERE
(
    g."Remarks" LIKE 'System generated from Customer Profiles %'
    OR g."Remarks" LIKE 'System generated from Supplier Profiles %'
    OR g."LedgerCode" IN (SELECT "ReceivableLedgerCode" FROM public."CustomerProfiles" WHERE "ReceivableLedgerCode" IS NOT NULL)
    OR g."LedgerCode" IN (SELECT "PayableLedgerCode"    FROM public."SupplierProfiles" WHERE "PayableLedgerCode" IS NOT NULL)
    OR g."LedgerCode" IN (SELECT "BankAccountCode"      FROM public."BankAccounts")
    OR g."LedgerCode" IN (SELECT "CashAccountCode"      FROM public."CashAccounts")
    OR g."LedgerCode" IN (SELECT "MFSAccountCode"       FROM public."MFSAccounts")
    OR g."LedgerCode" IN (SELECT "POSAccountCode"       FROM public."POSAccounts")
    OR g."LedgerCode" IN (SELECT "EmiAccountCode"       FROM public."EmiAccounts")
)
AND g."LedgerCode" NOT IN (SELECT "LedgerCode" FROM public."PostingSetups" WHERE "LedgerCode" IS NOT NULL)
AND g."LedgerCode" NOT IN (SELECT "LedgerCode" FROM public."SalesVat"      WHERE "LedgerCode" IS NOT NULL)
AND g."LedgerCode" NOT IN (SELECT "LedgerCode" FROM public."PurchaseVat"   WHERE "LedgerCode" IS NOT NULL)
AND g."LedgerCode" NOT IN (SELECT "PayableLedgerCode" FROM public."HrSalaryHeads" WHERE "PayableLedgerCode" IS NOT NULL);


-- 2. Pictures : only those used by the catalogue (and the login page
--    backgrounds); everything else (customers, staff, company logo,
--    website, chat, feedback screenshots) goes

DELETE FROM public."StoredFiles" f
WHERE NOT EXISTS
(
    SELECT 1
    FROM
    (
        SELECT "ImagePath" AS p FROM public."MotorBikes"  WHERE COALESCE("ImagePath", '') <> ''
        UNION SELECT "ImagePath"      FROM public."Accessories"      WHERE COALESCE("ImagePath", '') <> ''
        UNION SELECT "ImagePath"      FROM public."SpareParts"       WHERE COALESCE("ImagePath", '') <> ''
        UNION SELECT "BrandImagePath" FROM public."BrandManagements" WHERE COALESCE("BrandImagePath", '') <> ''
        UNION SELECT "lightBackgroundImagePath" FROM public."SubOrdinateComponents" WHERE COALESCE("lightBackgroundImagePath", '') <> ''
        UNION SELECT "deepBackgroundImagePath"  FROM public."SubOrdinateComponents" WHERE COALESCE("deepBackgroundImagePath", '') <> ''
    ) k
    WHERE lower(trim(leading '/' from k.p)) = lower(trim(leading '/' from f."Path"))
       OR lower(trim(leading '/' from k.p)) = lower(trim(leading '/' from COALESCE(f."PathKey", '')))
);


-- 3. Clear every table that is not on the lists ------------------------

DO $$
DECLARE
    keep text[] := ARRAY[
        -- KEEP : structure, switches, chart, posting
        'navigationmodules','navigationmenus','navigationsubmenus','navigationactivities',
        'masteractivities','masteractivitypages',
        'roleprofiles','activityassignments','activityassignmentdetails','activityassignmentpermissions',
        'systemconfigurations','vatapplicabilityhistory','businessconfigurations','businessconfiguration',
        'termsconditionsets','termsconditionlines','enquirysetups',
        'accountclasses','accountgroups','accountsubgroups','postingsetups','autojournalsources',
        'vouchersequences','salesvat','purchasevat',
        -- KEEP : screen parts and developer sync metadata
        'corecomponents','controlcomponents','layoutcomponents','subordinatecomponents',
        'utilitycomponents','applicationcomponents','defaultdbcomponents','rolebaseddbcomponents',
        'dashboards','widgetconfiguration','widgetconfigurations','widgetconfigurationdetails','loginpages',
        'codesynchronizations','inf_menusynchronization','inf_modulesynchronization',
        'inf_submenusynchronization','pageclonings','tblpagecloning','__efmigrationshistory',
        -- KEEP : HR samples (owner : A)
        'departments','designations','hrleavetypes','hrsalaryheads','hrshifts','hrweeklyholidays',
        'hrsalarystructures','hrsalarystructurelines','hrbonusstructures','hrbonusstructureslabs',
        'hrovertimestructures','hrleaveencashpolicies','hrleaveencashpolicytypes','hrpfpolicy',
        -- KEEP : other rules
        'faconfiguration','facategories','workshopconfiguration','workshopchecklistitems',
        'workshopobservations','workshopoutsideworks','banksetup','cardsetup',
        'wings','wingbusinesslines',
        -- CATALOGUE : REVOO
        'brandmanagements','colormanagements','bikemodels','motorbikes',
        'motorbikespecifications','motorbikespecificationitems',
        'productcategories','productsubcategories','accessories','accessoryfitments',
        'spareparts','sparepartfitments',
        'servicecategories','servicesubcategories','servicecategory','servicesubcategory',
        'laborcharts','servicepolicies','servicepolicyschedules','workshopservicebikes',
        'warrantypolicies','warrantycoverages','warrantyparts',
        'pditemplates','pditemplatesections','pditemplateitems','pditemplatemodels',
        'registrationtypes','registrationfees','registrationcosts','registrationstagetimings',
        'customerfiledocuments','customerfiledeliveryrules','customerfilenametransferrules',
        'locations',
        -- RESET (handled in step 4)
        'companies','branches','warehouses','financialyears',
        'userprofiles','usercredentials','roleassignments','roleassignmentdetails',
        'branchassignments','branchassignmentdetails',
        'generalledgers','storedfiles','websiteconfigurations'
    ];
    list text;
    cleared int;
BEGIN
    -- all in ONE statement, so tables linked to each other (foreign
    -- keys) are cleared together. No CASCADE : if a KEPT table
    -- points to a cleared one, it stops and nothing changes.
    SELECT string_agg(format('public.%I', table_name), ', ' ORDER BY table_name), count(*)
    INTO list, cleared
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND lower(table_name) <> ALL (keep);

    IF cleared > 0 THEN
        EXECUTE 'TRUNCATE TABLE ' || list || ' RESTART IDENTITY';
    END IF;

    RAISE NOTICE 'Tables cleared : %', cleared;
END $$;


-- 4. RESET -------------------------------------------------------------

-- 4a. Company : New Company, details blank
UPDATE public."Companies"
SET "CompanyName" = 'New Company',
    "CompanyShortName" = 'New Company',
    "AddressLine1" = '', "AddressLine2" = '',
    "BINNo" = '', "TINNo" = '', "TradeLicenseNo" = '',
    "Email" = '', "Phone" = '', "Mobile" = '', "Website" = '',
    "CompanyLogoPath" = '', "Remarks" = '',
    "ModifiedDate" = now();

-- 4b. One branch : Head Office, under Sales Center
CREATE TEMP TABLE tpl_keep_branch AS
SELECT min("BranchId") AS branch_id FROM public."Branches";

UPDATE public."Branches"
SET "BranchName" = 'Head Office',
    "ShortName" = 'HO',
    "Address" = '', "Email" = '', "Mobile" = '', "Remarks" = '',
    "WingId" = (SELECT "WingId" FROM public."Wings" WHERE "WingName" = 'Sales Center' ORDER BY "WingId" LIMIT 1),
    "IsActive" = true, "IsDeleted" = false,
    "ModifiedDate" = now()
WHERE "BranchId" = (SELECT branch_id FROM tpl_keep_branch);

-- 4c. One warehouse, of the Head Office
CREATE TEMP TABLE tpl_keep_warehouse AS
SELECT COALESCE(
    (SELECT min("WarehouseId") FROM public."Warehouses" WHERE "BranchId" = (SELECT branch_id FROM tpl_keep_branch) AND "IsDefault"),
    (SELECT min("WarehouseId") FROM public."Warehouses" WHERE "BranchId" = (SELECT branch_id FROM tpl_keep_branch)),
    (SELECT min("WarehouseId") FROM public."Warehouses")) AS warehouse_id;

UPDATE public."Warehouses"
SET "BranchId" = (SELECT branch_id FROM tpl_keep_branch),
    "WarehouseName" = 'Head Office Store',
    "DisplayName" = 'Head Office Store',
    "WingId" = (SELECT "WingId" FROM public."Branches" WHERE "BranchId" = (SELECT branch_id FROM tpl_keep_branch)),
    "Address" = '', "Email" = '', "Mobile" = '', "Remarks" = '',
    "IsDefault" = true, "IsActive" = true, "IsDeleted" = false,
    "ModifiedDate" = now()
WHERE "WarehouseId" = (SELECT warehouse_id FROM tpl_keep_warehouse);

DELETE FROM public."Warehouses"
WHERE "WarehouseId" <> (SELECT warehouse_id FROM tpl_keep_warehouse);

UPDATE public."BusinessConfigurations"
SET "BranchId" = (SELECT branch_id FROM tpl_keep_branch)
WHERE "BranchId" IS NOT NULL;

-- 4d. Financial year : only the current one
DELETE FROM public."FinancialYears"
WHERE "FinancialYearId" <>
(
    SELECT "FinancialYearId"
    FROM public."FinancialYears"
    ORDER BY "IsCurrent" DESC, "StartDate" DESC
    LIMIT 1
);

-- 4e. Users : admin only, without a password (set per client)
DELETE FROM public."UserCredentials";

-- (also rows of users that no longer exist)
DELETE FROM public."RoleAssignmentDetails"
WHERE "RoleAssignmentId" NOT IN
(
    SELECT "RoleAssignmentId" FROM public."RoleAssignments" WHERE "UserProfileId" = 5
);

DELETE FROM public."RoleAssignments"
WHERE "UserProfileId" <> 5;

DELETE FROM public."BranchAssignmentDetails"
WHERE "BranchAssignmentId" NOT IN
(
    SELECT "BranchAssignmentId" FROM public."BranchAssignments" WHERE "UserProfileId" = 5
)
OR "BranchId" <> (SELECT branch_id FROM tpl_keep_branch);

DELETE FROM public."BranchAssignments"
WHERE "UserProfileId" <> 5;

DELETE FROM public."UserProfiles"
WHERE "UserProfileId" <> 5;

-- no Developer role for a client's administrator
DELETE FROM public."RoleAssignmentDetails"
WHERE "RoleProfileId" IN (SELECT "RoleProfileId" FROM public."RoleProfiles" WHERE "IsDeveloperRole");

UPDATE public."UserProfiles"
SET "UserName" = 'admin',
    "FullName" = 'Administrator',
    "DisplayName" = 'Administrator',
    "Email" = '', "MobileNo" = '', "UserPhotoPath" = '',
    "IsActive" = true, "IsDeleted" = false,
    "ModifiedDate" = now();

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public."RoleAssignmentDetails" d
                   JOIN public."RoleAssignments" r ON r."RoleAssignmentId" = d."RoleAssignmentId"
                   WHERE r."UserProfileId" = 5) THEN
        RAISE EXCEPTION 'admin would be left without any role : stopped, nothing changed.';
    END IF;
END $$;

-- admin keeps access to the Head Office
INSERT INTO public."BranchAssignmentDetails"
    ("BranchAssignmentId", "BranchId", "CreatedBy", "CreatedDate", "IsActive", "IsDeleted")
SELECT b."BranchAssignmentId", (SELECT branch_id FROM tpl_keep_branch), b."UserProfileId", now(), true, false
FROM public."BranchAssignments" b
WHERE NOT EXISTS
(
    SELECT 1 FROM public."BranchAssignmentDetails" d
    WHERE d."BranchAssignmentId" = b."BranchAssignmentId"
      AND d."BranchId" = (SELECT branch_id FROM tpl_keep_branch)
);

-- the other branches go last : warehouses and branch access
-- pointing to them are already gone
DELETE FROM public."Branches"
WHERE "BranchId" <> (SELECT branch_id FROM tpl_keep_branch);

-- 4f. Catalogue : nothing that belongs to one dealer
UPDATE public."BrandManagements" SET "MotorBikesSupplierCode" = '';
UPDATE public."MotorBikes"  SET "RedLevel" = 0, "ReorderLevel" = 0, "MaxStockLevel" = 0;
UPDATE public."Accessories" SET "RedLevel" = 0, "ReorderLevel" = 0, "MaxStockLevel" = 0;
UPDATE public."SpareParts"  SET "RedLevel" = 0, "ReorderLevel" = 0, "MaxStockLevel" = 0;

-- 4g. Document numbers start again
UPDATE public."VoucherSequences" SET "LastNumber" = 0, "ModifiedDate" = now();

-- 4h. Website : off and blank
UPDATE public."WebsiteConfigurations"
SET "IsEnabled" = false,
    "Tagline" = '', "About" = '', "Hotline" = '', "WhatsApp" = '', "Email" = '',
    "MapQuery" = '', "MapLink" = '',
    "FacebookUrl" = '', "YoutubeUrl" = '', "InstagramUrl" = '', "TiktokUrl" = '',
    "OfferTitle" = '', "OfferText" = '', "OfferEndsOn" = NULL,
    "WhyPhotoPath" = '', "HeroPhotoPath" = '', "HeroRoundPath" = '',
    "HeroTitle" = '', "HeroText" = '',
    "ModifiedDate" = now();

DROP TABLE tpl_keep_warehouse;
DROP TABLE tpl_keep_branch;


-- 5. Result : what is left ----------------------------------------------

SELECT 'Companies' AS "Table", count(*) AS "Rows", string_agg("CompanyName", ', ') AS "Names" FROM public."Companies"
UNION ALL SELECT 'Branches', count(*), string_agg("BranchName", ', ') FROM public."Branches"
UNION ALL SELECT 'Warehouses', count(*), string_agg("WarehouseName", ', ') FROM public."Warehouses"
UNION ALL SELECT 'FinancialYears', count(*), string_agg("FinancialYearName", ', ') FROM public."FinancialYears"
UNION ALL SELECT 'Users', count(*), string_agg("UserName", ', ') FROM public."UserProfiles"
UNION ALL SELECT 'Wings', count(*), string_agg("WingName", ', ') FROM public."Wings"
UNION ALL SELECT 'Brands', count(*), string_agg("BrandName", ', ') FROM public."BrandManagements"
UNION ALL SELECT 'Bike models', count(*), NULL FROM public."BikeModels"
UNION ALL SELECT 'Motor bike variants', count(*), NULL FROM public."MotorBikes"
UNION ALL SELECT 'General ledgers', count(*), NULL FROM public."GeneralLedgers"
UNION ALL SELECT 'Pictures kept', count(*), NULL FROM public."StoredFiles"
UNION ALL SELECT 'Customers (must be 0)', count(*), NULL FROM public."CustomerProfiles"
UNION ALL SELECT 'Suppliers (must be 0)', count(*), NULL FROM public."SupplierProfiles"
UNION ALL SELECT 'Employees (must be 0)', count(*), NULL FROM public."HrEmployees"
UNION ALL SELECT 'Voucher entries (must be 0)', count(*), NULL FROM public."VoucherEntries"
UNION ALL SELECT 'Server agent rows (must be 0)', count(*), NULL FROM public."ServerManagement";
