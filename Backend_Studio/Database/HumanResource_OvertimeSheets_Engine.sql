-- =====================================================================
-- HumanResource_OvertimeSheets_Engine.sql   (2026-11-14)
-- ---------------------------------------------------------------------
-- 1. Posting Setup : "Payroll - Overtime Expense". When it has a
--    ledger, a posted salary sheet debits the overtime to it and the
--    rest of the earned salary to Payroll - Salary Expense. Without a
--    ledger the overtime stays in Salary Expense, as before.
--    "Payroll - Overtime Payable" : when it has a ledger, the overtime
--    in the net pay is credited to it and the rest of the net pay to
--    Payroll - Salary Payable. Without a ledger it stays in Salary
--    Payable, as before.
--
-- 2. Page "Overtime Sheets" under Human Resource > Payroll Management.
--    No table : an overtime sheet is the overtime of a POSTED salary
--    sheet (one sheet a branch a month, OTS-0001 for SAL-0001). It is
--    there when the salary sheet is posted and goes when it is
--    unposted. The page has no Add : view and print only.
--
-- Safe to run more than once. ASCII only.
-- =====================================================================


-- ------------------------------------------------------------
-- 1. Posting Setup : overtime
-- ------------------------------------------------------------

INSERT INTO public."PostingSetups"
(
    "PurposeCode", "PurposeName", "GroupName", "Description", "UsedBy",
    "AllowedSubGroupCodes", "LedgerCode", "IsRequired", "DisplayOrder",
    "CreatedBy", "CreatedDate"
)
VALUES
    ('PAYROLL-OVERTIME-EXPENSE', 'Payroll - Overtime Expense', 'Payroll',
     'Debited with the overtime of a salary sheet when it is posted (expense). Left without a ledger, the overtime goes to Payroll - Salary Expense with the rest of the salary.',
     'Salary Sheets, Overtime Sheets', '', '', false, 204, 1, now()),
    ('PAYROLL-OVERTIME-PAYABLE', 'Payroll - Overtime Payable', 'Payroll',
     'Credited with the overtime in the net pay when a salary sheet is posted (liability); debited when the overtime is paid by Payment Voucher. Left without a ledger, the overtime stays in Payroll - Salary Payable.',
     'Salary Sheets, Overtime Sheets', '', '', false, 205, 1, now())
ON CONFLICT ("PurposeCode") DO UPDATE
SET "PurposeName" = EXCLUDED."PurposeName",
    "GroupName"   = EXCLUDED."GroupName",
    "Description" = EXCLUDED."Description",
    "UsedBy"      = EXCLUDED."UsedBy";


-- ------------------------------------------------------------
-- 2. Page : Overtime Sheets (Payroll Management)
-- ------------------------------------------------------------

DO $$
DECLARE
    v_module   record;
    v_menu     record;
    v_seq      int;
    v_code     text;
BEGIN
    SELECT "Id", "SequenceNo", "RouteKey" INTO v_module
    FROM   "NavigationModules"
    WHERE  lower(trim("RouteKey")) = 'human-resource-manangement'
    AND    "IsDeleted" = false
    LIMIT  1;

    IF v_module."Id" IS NULL THEN
        RAISE EXCEPTION 'Module with route key human-resource-manangement not found - no page was added.';
    END IF;

    SELECT "Id", "SequenceNo", "RouteKey" INTO v_menu
    FROM   "NavigationMenus"
    WHERE  "NavigationModuleId" = v_module."Id"
    AND    lower(trim("RouteKey")) = 'payroll-management'
    AND    "IsDeleted" = false
    LIMIT  1;

    IF v_menu."Id" IS NULL THEN
        RAISE EXCEPTION 'Menu Payroll Management not found - run HumanResource_Phase3_Engine.sql first.';
    END IF;

    IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
               WHERE "NavigationMenuId" = v_menu."Id"
               AND   lower(trim("RouteKey")) = 'overtime-sheets'
               AND   "IsDeleted" = false) THEN
        RAISE NOTICE 'Page exists, skipped : Overtime Sheets';
        RETURN;
    END IF;

    IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
               WHERE lower(trim("Name")) = 'overtime sheets' AND "IsDeleted" = false) THEN
        RAISE EXCEPTION 'A submenu named "Overtime Sheets" already exists elsewhere : names must be unique. Tell Claude.';
    END IF;

    SELECT COALESCE(MAX("SequenceNo"), 0) + 1 INTO v_seq
    FROM   "NavigationSubmenus"
    WHERE  "NavigationMenuId" = v_menu."Id";

    v_code :=
        'SUB-' || lpad(v_module."SequenceNo"::text, 3, '0')
               || '-' || lpad(v_menu."SequenceNo"::text, 3, '0')
               || '-' || lpad(v_seq::text, 3, '0');

    INSERT INTO "NavigationSubmenus"
        ("NavigationMenuId", "SequenceNo", "Code", "Name", "Icon",
         "RouteKey", "Route", "DisplayOrder", "Remarks",
         "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
    VALUES
        (v_menu."Id", v_seq, v_code, 'Overtime Sheets', 'fa-solid fa-business-time',
         'overtime-sheets',
         '/' || v_module."RouteKey" || '/' || v_menu."RouteKey" || '/overtime-sheets',
         v_seq, 'The overtime of every posted salary sheet : view and print. Hand-written page : never run Submenu / Code Sync.',
         true, false, 1, now());

    RAISE NOTICE 'Page created : % Overtime Sheets', v_code;
END $$;


-- ------------------------------------------------------------
-- Check (run on its own)
-- ------------------------------------------------------------
SELECT s."Code", s."Name", s."Route"
FROM   "NavigationSubmenus" s
WHERE  lower(s."Route") LIKE '/human-resource-manangement/payroll-management/%' AND s."IsDeleted" = false
ORDER  BY s."Code";
