-- =====================================================================
-- CkdDocuments_Status.sql   (2026-11-08)
-- ---------------------------------------------------------------------
-- CKD documents : the set of import documents the brand distributor
-- supplies per chassis (with the bikes, or on its CKD portal). The
-- same set goes to BRTA for registration and to the customer in the
-- customer file. No accounting.
--
-- 1. CKD status per chassis (MotorBikeUnits) : Yes / No (default No)
--      Yes = the documents are in hand or available on the portal.
--    Columns : CkdStatus, CkdCheckedDate, CkdCheckedBy,
--              CkdCheckedByName, CkdRemarks.
--    Set on the Unit Desk of Purchases - MB / Motor Bike Receiving
--    and changed on the page below.
-- 2. The same columns on CustomerFiles : used only for an opening
--    customer file whose chassis has no bike record (sold before
--    the system).
-- 3. Page Inventory Management > Inventory Status >
--      CKD Documents Status
--      /inventory-management/inventory-status/ckd-documents-status
--    (hand-written page : NEVER run Submenu Sync / Code Sync for
--    it). Uses the common activities View / Update / Print.
--
-- Rules (in the API) : a Customer File cannot be marked Ready for
-- Delivery, and full registration work cannot be done, while the
-- chassis is CKD No (only the registration fee deposit).
--
-- Plain statements, safe to run again. Run the whole script (F5).
-- ASCII only.
--
-- AFTER : Security & Permission > Activity Assignment : tick View
-- and Update on CKD Documents Status for the roles, then log in
-- again.
-- =====================================================================


-- Clears a transaction left open by an earlier failed run in the
-- same pgAdmin tab (a harmless warning when there is none).
ROLLBACK;


-- 1. Bikes ------------------------------------------------------------

ALTER TABLE public."MotorBikeUnits"
    ADD COLUMN IF NOT EXISTS "CkdStatus"        character varying(5)   NOT NULL DEFAULT 'No',
    ADD COLUMN IF NOT EXISTS "CkdCheckedDate"   date                   NULL,
    ADD COLUMN IF NOT EXISTS "CkdCheckedBy"     bigint                 NULL,
    ADD COLUMN IF NOT EXISTS "CkdCheckedByName" character varying(150) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "CkdRemarks"       character varying(250) NOT NULL DEFAULT '';

ALTER TABLE public."MotorBikeUnits"
    DROP CONSTRAINT IF EXISTS "CK_MotorBikeUnits_CkdStatus";

ALTER TABLE public."MotorBikeUnits"
    ADD CONSTRAINT "CK_MotorBikeUnits_CkdStatus"
    CHECK ("CkdStatus" IN ('Yes', 'No'));

CREATE INDEX IF NOT EXISTS "IX_MotorBikeUnits_ChassisUpper"
    ON public."MotorBikeUnits" (upper("ChassisNo"));


-- 2. Opening customer files ---------------------------------------------

ALTER TABLE public."CustomerFiles"
    ADD COLUMN IF NOT EXISTS "CkdStatus"        character varying(5)   NOT NULL DEFAULT 'No',
    ADD COLUMN IF NOT EXISTS "CkdCheckedDate"   date                   NULL,
    ADD COLUMN IF NOT EXISTS "CkdCheckedBy"     bigint                 NULL,
    ADD COLUMN IF NOT EXISTS "CkdCheckedByName" character varying(150) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "CkdRemarks"       character varying(250) NOT NULL DEFAULT '';

ALTER TABLE public."CustomerFiles"
    DROP CONSTRAINT IF EXISTS "CK_CustomerFiles_CkdStatus";

ALTER TABLE public."CustomerFiles"
    ADD CONSTRAINT "CK_CustomerFiles_CkdStatus"
    CHECK ("CkdStatus" IN ('Yes', 'No'));


-- 3. Page ---------------------------------------------------------------

DO $$
DECLARE
    v_module    record;
    v_menu      record;
    v_seq       int;
    v_sub_code  text;
BEGIN
    SELECT "Id", "SequenceNo", "RouteKey", "Code" INTO v_module
    FROM   "NavigationModules"
    WHERE  lower("RouteKey") = 'inventory-management'
    AND    "IsDeleted" = false;

    IF v_module."Id" IS NULL THEN
        RAISE EXCEPTION 'Module with route key inventory-management not found - nothing changed.';
    END IF;

    SELECT "Id", "SequenceNo", "RouteKey", "Code" INTO v_menu
    FROM   "NavigationMenus"
    WHERE  "NavigationModuleId" = v_module."Id"
    AND    lower("RouteKey") = 'inventory-status'
    AND    "IsDeleted" = false;

    IF v_menu."Id" IS NULL THEN
        RAISE EXCEPTION 'Menu Inventory Status (route key inventory-status) not found - nothing changed.';
    END IF;

    SELECT "Code" INTO v_sub_code
    FROM   "NavigationSubmenus"
    WHERE  "NavigationMenuId" = v_menu."Id"
    AND    lower("RouteKey") = 'ckd-documents-status'
    AND    "IsDeleted" = false;

    IF v_sub_code IS NULL THEN
        -- Submenu names must be unique across the system (Code Sync)
        IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
                   WHERE  lower("Name") = 'ckd documents status'
                   AND    "IsDeleted" = false) THEN
            RAISE EXCEPTION 'A submenu named "CKD Documents Status" already exists elsewhere - nothing changed.';
        END IF;

        SELECT COALESCE(MAX("SequenceNo"), 0) + 1 INTO v_seq
        FROM   "NavigationSubmenus"
        WHERE  "NavigationMenuId" = v_menu."Id";

        v_sub_code :=
            'SUB-' || lpad(v_module."SequenceNo"::text, 3, '0')
                   || '-' || lpad(v_menu."SequenceNo"::text, 3, '0')
                   || '-' || lpad(v_seq::text, 3, '0');

        INSERT INTO "NavigationSubmenus"
            ("NavigationMenuId", "SequenceNo", "Code", "Name", "Icon",
             "RouteKey", "Route", "DisplayOrder", "Remarks",
             "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        VALUES
            (v_menu."Id", v_seq, v_sub_code, 'CKD Documents Status', 'fa-solid fa-file-shield',
             'ckd-documents-status',
             '/' || v_module."RouteKey" || '/' || v_menu."RouteKey" || '/ckd-documents-status',
             v_seq, 'CKD documents in hand / on the portal, per chassis (registration and customer file).',
             true, false, 1, now());

        RAISE NOTICE 'Submenu created : % CKD Documents Status', v_sub_code;
    ELSE
        RAISE NOTICE 'Submenu exists, skipped : % CKD Documents Status', v_sub_code;
    END IF;
END
$$;


-- Check
SELECT "CkdStatus", count(*) AS "Bikes"
FROM   public."MotorBikeUnits"
WHERE  "IsDeleted" = false
GROUP  BY "CkdStatus";

SELECT s."Code", s."Name", s."Route"
FROM   "NavigationSubmenus" s
WHERE  lower(s."RouteKey") = 'ckd-documents-status'
AND    s."IsDeleted" = false;
