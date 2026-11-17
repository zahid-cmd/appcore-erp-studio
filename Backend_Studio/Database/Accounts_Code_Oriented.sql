ROLLBACK;

-- =====================================================================
-- Accounts_Code_Oriented.sql   (2026-11-17)
-- ---------------------------------------------------------------------
-- The financial statements stop reading NAMES. What an account is comes
-- from three settings :
--
--   AccountClasses . StatementType      Asset / Liability / Equity /
--                                       Income / Other Income /
--                                       Cost of Goods Sold / Expense
--                                       (Account Class form)
--   AccountClasses . BusinessLine       MB / SP / AC / SV / '' (none)
--   GeneralLedgers . BusinessLine       a ledger may have its own
--                                       ('' : the one of its class)
--   AccountGroups  . CashFlowActivity   Operating / Investing /
--                                       Financing (Account Group form)
--
-- Used by : Trial Balance, Profit & Loss, Balance Sheet, Daily
-- Statements, Cash Flow, and the income class of Service Category.
-- After this a class, group or ledger can be renamed freely.
--
-- FIRST RUN ONLY, each column is filled for the data that exists :
--   StatementType     the inventory family by its Class Type; the
--                     classes CLS-001 .. CLS-009 by their code; any
--                     other class, one last time, the way the
--                     statements read its name until today.
--   BusinessLine      CLS-005 MB, CLS-006 SP, CLS-007 SV, CLS-008 AC.
--   CashFlowActivity  one last time from the group / sub group names
--                     the Cash Flow read until today, so the report
--                     does not change on the day this is run.
-- A setting changed later on a form is kept : running the script again
-- does not fill anything again.
--
-- Also : Posting Setup gets two purposes, the Workshop WIP of what has
-- no product behind it (a typed outsourced part, an outside work).
--
-- Safe to run more than once. Run the whole script (F5). ASCII only.
--
-- AFTER : restart the API. Then look at the check at the end : every
-- class must have a Statement Type.
-- =====================================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Account Class : Statement Type
-- ------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS
       (
           SELECT 1
           FROM   information_schema.columns
           WHERE  table_schema = 'public'
           AND    table_name = 'AccountClasses'
           AND    column_name = 'StatementType'
       )
    THEN
        ALTER TABLE public."AccountClasses"
            ADD COLUMN "StatementType" character varying(30) NOT NULL DEFAULT '';

        -- the inventory family : fixed by the Class Type
        UPDATE public."AccountClasses"
        SET    "StatementType" = CASE "ClassType"
                                     WHEN 'Inventory'          THEN 'Asset'
                                     WHEN 'Work In Progress'   THEN 'Asset'
                                     WHEN 'Cost of Goods Sold' THEN 'Cost of Goods Sold'
                                 END
        WHERE  "ClassType" IN ('Inventory', 'Work In Progress', 'Cost of Goods Sold');

        -- the Account classes that exist : by their code
        UPDATE public."AccountClasses" c
        SET    "StatementType" = v.statement_type
        FROM   (VALUES
                   ('CLS-001', 'Equity'),
                   ('CLS-002', 'Asset'),
                   ('CLS-003', 'Liability'),
                   ('CLS-004', 'Expense'),
                   ('CLS-005', 'Income'),
                   ('CLS-006', 'Income'),
                   ('CLS-007', 'Income'),
                   ('CLS-008', 'Income'),
                   ('CLS-009', 'Other Income')
               ) AS v(class_code, statement_type)
        WHERE  c."ClassCode" = v.class_code
        AND    c."ClassType" = 'Account'
        AND    c."StatementType" = '';

        -- any other class : one last time, as its name was read
        UPDATE public."AccountClasses"
        SET    "StatementType" =
               CASE
                   WHEN lower("ClassName") LIKE '%cost of%'                          THEN 'Cost of Goods Sold'
                   WHEN lower("ClassName") ~ '(income|revenue|sale)'
                    AND lower("ClassName") LIKE '%other%'                            THEN 'Other Income'
                   WHEN lower("ClassName") ~ '(income|revenue|sale)'                 THEN 'Income'
                   WHEN lower("ClassName") ~ '(expense|expenditure|cost)'            THEN 'Expense'
                   WHEN lower("ClassName") ~ '(equity|capital|reserve)'              THEN 'Equity'
                   WHEN lower("ClassName") ~ '(liabilit|payable|loan|borrow)'        THEN 'Liability'
                   WHEN lower("ClassName") ~ '(asset|receivable|inventor|stock|progress)' THEN 'Asset'
                   WHEN "Mode" ILIKE 'c%'                                            THEN 'Liability'
                   ELSE 'Asset'
               END
        WHERE  "StatementType" = '';
    END IF;
END $$;


-- ------------------------------------------------------------
-- 2. Account Class : Business Line
-- ------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS
       (
           SELECT 1
           FROM   information_schema.columns
           WHERE  table_schema = 'public'
           AND    table_name = 'AccountClasses'
           AND    column_name = 'BusinessLine'
       )
    THEN
        ALTER TABLE public."AccountClasses"
            ADD COLUMN "BusinessLine" character varying(10) NOT NULL DEFAULT '';

        UPDATE public."AccountClasses" c
        SET    "BusinessLine" = v.business_line
        FROM   (VALUES
                   ('CLS-005', 'MB'),
                   ('CLS-006', 'SP'),
                   ('CLS-007', 'SV'),
                   ('CLS-008', 'AC')
               ) AS v(class_code, business_line)
        WHERE  c."ClassCode" = v.class_code
        AND    c."ClassType" = 'Account';
    END IF;
END $$;


-- ------------------------------------------------------------
-- 3. General Ledger : its own Business Line ('' : of its class)
-- ------------------------------------------------------------

ALTER TABLE public."GeneralLedgers"
    ADD COLUMN IF NOT EXISTS "BusinessLine" character varying(10) NOT NULL DEFAULT '';


-- ------------------------------------------------------------
-- 4. Account Group : Cash Flow Activity
-- ------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS
       (
           SELECT 1
           FROM   information_schema.columns
           WHERE  table_schema = 'public'
           AND    table_name = 'AccountGroups'
           AND    column_name = 'CashFlowActivity'
       )
    THEN
        ALTER TABLE public."AccountGroups"
            ADD COLUMN "CashFlowActivity" character varying(20) NOT NULL DEFAULT 'Operating';

        -- Investing : a group of an asset class whose name (or a sub
        -- group's) was read as fixed assets / investments
        UPDATE public."AccountGroups" g
        SET    "CashFlowActivity" = 'Investing'
        FROM   public."AccountClasses" c
        WHERE  c."AccountClassId" = g."AccountClassId"
        AND    c."ClassType" = 'Account'
        AND    c."StatementType" = 'Asset'
        AND    (
                   lower(g."GroupName") ~ '(fixed asset|property|plant|equipment|machinery|vehicle|furniture|fixture|building|land|investment)'
                   OR EXISTS
                      (
                          SELECT 1
                          FROM   public."AccountSubGroups" s
                          WHERE  s."AccountGroupId" = g."AccountGroupId"
                          AND    lower(s."SubGroupName") ~ '(fixed asset|property|plant|equipment|machinery|vehicle|furniture|fixture|building|land|investment)'
                      )
               );

        -- Financing : loans, borrowings, leases, debentures
        UPDATE public."AccountGroups" g
        SET    "CashFlowActivity" = 'Financing'
        WHERE  lower(g."GroupName") ~ '(loan|borrow|lease|debenture)'
        OR     EXISTS
               (
                   SELECT 1
                   FROM   public."AccountSubGroups" s
                   WHERE  s."AccountGroupId" = g."AccountGroupId"
                   AND    lower(s."SubGroupName") ~ '(loan|borrow|lease|debenture)'
               );
    END IF;
END $$;


-- ------------------------------------------------------------
-- 5. Posting Setup (group Service Operations) : Workshop WIP of
--    what has no product behind it
-- ------------------------------------------------------------

INSERT INTO public."PostingSetups"
(
    "PurposeCode", "PurposeName", "GroupName", "Description", "UsedBy",
    "AllowedSubGroupCodes", "LedgerCode", "IsRequired", "DisplayOrder",
    "CreatedBy", "CreatedDate"
)
VALUES
    ('OUTSOURCED-PARTS-WIP', 'Workshop - Outsourced Parts WIP', 'Service Operations',
     'Debited with the cost of a TYPED outsourced part (not of the product lists) bought for a job card, until the job card is invoiced (asset). Empty : Workshop WIP is used. A part of the product lists keeps its own WIP ledger.',
     'Job Cards', '', '', false, 409, 1, now()),
    ('OUTSIDE-WORK-WIP', 'Workshop - Outside Work WIP', 'Service Operations',
     'Debited with what a vendor charges for an outside work entered on a job card, until the job card is invoiced (asset). Empty : Workshop WIP is used.',
     'Job Cards', '', '', false, 410, 1, now())
ON CONFLICT ("PurposeCode") DO UPDATE
SET "PurposeName"  = EXCLUDED."PurposeName",
    "GroupName"    = EXCLUDED."GroupName",
    "Description"  = EXCLUDED."Description",
    "UsedBy"       = EXCLUDED."UsedBy",
    "DisplayOrder" = EXCLUDED."DisplayOrder";

COMMIT;


-- ------------------------------------------------------------
-- Check 1 (run on its own) : every class and what it is.
-- No row may have an empty Statement Type.
-- ------------------------------------------------------------
SELECT c."ClassCode", c."ClassType", c."ClassName", c."Mode",
       c."StatementType", c."BusinessLine"
FROM   public."AccountClasses" c
WHERE  c."IsDeleted" = false
ORDER  BY c."ClassType", c."ClassCode";


-- ------------------------------------------------------------
-- Check 2 (run on its own) : the groups that are not Operating
-- ------------------------------------------------------------
SELECT g."GroupCode", g."GroupName", g."CashFlowActivity"
FROM   public."AccountGroups" g
WHERE  g."IsDeleted" = false
AND    g."CashFlowActivity" <> 'Operating'
ORDER  BY g."GroupCode";
