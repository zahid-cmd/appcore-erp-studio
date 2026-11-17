ROLLBACK;

-- =====================================================================
-- ServiceOperations_Estimates_Open.sql   (2026-11-16)
-- ---------------------------------------------------------------------
-- Service Estimates are no longer made for a job card. An estimate is
-- made for a customer and a bike; a job card CAN be made from it
-- afterwards (button Create Job Card on the estimate).
--
--   ServiceEstimates       + the customer and the bike of its own
--                          + the Estimate Charge and its collection
--                          JobCardId may be empty (not converted)
--                          Status gets Converted (a job card was made)
--   WorkshopConfiguration  + EstimateChargeServiceId : the customized
--                            service (Service Setup) that is the
--                            Estimate Charge. Empty : estimates are free.
--                          RequireEstimate now means : a job card is
--                            made from an estimate only.
--
-- The Estimate Charge : collected on the estimate by a Receipt Voucher
-- (journal under the estimate number : Dr customer receivable, Cr the
-- income ledger of the service, Cr VAT). An estimate is printed only
-- when the charge was collected or a job card was made from it. When
-- the job card is invoiced, the collected charge comes off the service
-- invoice.
--
-- Estimates made before this script keep their job card : they become
-- Converted and get the customer and the bike of that job card.
--
-- Run ServiceOperations_Workshop_Engine.sql and ServiceOperations_
-- Estimates_Engine.sql first. Safe to run more than once. Run the
-- whole script (F5). ASCII only.
-- =====================================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Workshop Configuration : the Estimate Charge service
-- ------------------------------------------------------------

ALTER TABLE public."WorkshopConfiguration"
    ADD COLUMN IF NOT EXISTS "EstimateChargeServiceId" bigint NULL;


-- ------------------------------------------------------------
-- 2. Service Estimates : the customer, the bike, the charge
-- ------------------------------------------------------------

ALTER TABLE public."ServiceEstimates" ALTER COLUMN "JobCardId" DROP NOT NULL;

ALTER TABLE public."ServiceEstimates"
    ADD COLUMN IF NOT EXISTS "CustomerId"             bigint                 NULL,
    ADD COLUMN IF NOT EXISTS "CustomerName"           character varying(150) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "Mobile"                 character varying(20)  NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "ServiceVehicleId"       bigint                 NULL,
    ADD COLUMN IF NOT EXISTS "ChassisNo"              character varying(50)  NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "EngineNo"               character varying(50)  NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "RegistrationNo"         character varying(50)  NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "ModelId"                bigint                 NULL,
    ADD COLUMN IF NOT EXISTS "ModelName"              character varying(150) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "BrandManagementId"      bigint                 NULL,
    ADD COLUMN IF NOT EXISTS "BrandName"              character varying(100) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "ColorName"              character varying(60)  NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "KmReading"              integer                NULL,
    ADD COLUMN IF NOT EXISTS "Requirement"            character varying(1000) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "ChargeServiceId"        bigint                 NULL,
    ADD COLUMN IF NOT EXISTS "ChargeName"             character varying(200) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "ChargeAmount"           numeric(18,2)          NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "ChargeVatRate"          numeric(9,4)           NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "ChargeVatAmount"        numeric(18,2)          NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "ChargeTotal"            numeric(18,2)          NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "ChargeIncomeLedgerCode" character varying(40)  NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "ChargeVatLedgerCode"    character varying(40)  NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "ChargeCollected"        boolean                NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "ChargeCollectedDate"    date                   NULL,
    ADD COLUMN IF NOT EXISTS "ChargeReceiptVoucherId" bigint                 NULL,
    ADD COLUMN IF NOT EXISTS "ChargeReceiptVoucherNo" character varying(30)  NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "ChargeInvoiceNo"        character varying(30)  NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS "IX_ServiceEstimates_Customer" ON public."ServiceEstimates" ("CustomerId");
CREATE INDEX IF NOT EXISTS "IX_ServiceEstimates_Mobile"   ON public."ServiceEstimates" ("Mobile");


-- ------------------------------------------------------------
-- 3. Estimates made for a job card before this script : they
--    get the customer and the bike of that job card, and the
--    live ones become Converted
-- ------------------------------------------------------------

UPDATE public."ServiceEstimates" e
SET    "CustomerId"        = c."CustomerId",
       "CustomerName"      = c."CustomerName",
       "Mobile"            = c."Mobile",
       "ServiceVehicleId"  = c."ServiceVehicleId",
       "ChassisNo"         = c."ChassisNo",
       "EngineNo"          = c."EngineNo",
       "RegistrationNo"    = c."RegistrationNo",
       "ModelId"           = c."ModelId",
       "ModelName"         = c."ModelName",
       "BrandManagementId" = c."BrandManagementId",
       "BrandName"         = c."BrandName",
       "ColorName"         = c."ColorName",
       "KmReading"         = c."KmReading",
       "Requirement"       = c."BasicRequirement"
FROM   public."JobCards" c
WHERE  c."JobCardId" = e."JobCardId"
AND    e."CustomerName" = ''
AND    e."ModelName" = '';

UPDATE public."ServiceEstimates"
SET    "Status" = 'Converted'
WHERE  "JobCardId" IS NOT NULL
AND    "Status" IN ('Draft', 'Sent', 'Approved');


-- ------------------------------------------------------------
-- 4. Auto Journal : the journal of a collected Estimate Charge
--    (voucher type EST) shows under Service Estimates
-- ------------------------------------------------------------

DO $$
DECLARE
    v_code text;
BEGIN
    IF to_regclass('public."AutoJournalSources"') IS NULL THEN
        RAISE NOTICE 'AutoJournalSources not found : skipped (the journal shows under Other).';
        RETURN;
    END IF;

    SELECT s."Code" INTO v_code
    FROM   "NavigationSubmenus" s
    WHERE  s."Route" ILIKE '/service-operations/%/service-estimates'
    AND    NOT s."IsDeleted"
    LIMIT  1;

    INSERT INTO public."AutoJournalSources"
        ("VoucherType", "SourceTable", "NavigationSubmenuCode", "IsAutoJournal", "DisplayOrder", "Remarks")
    VALUES
        ('EST', '', COALESCE(v_code, ''), true, 75, 'Estimate Charge collected : receivable, estimate charge income, VAT')
    ON CONFLICT ("VoucherType", "SourceTable") DO UPDATE
    SET "NavigationSubmenuCode" = EXCLUDED."NavigationSubmenuCode"
    WHERE public."AutoJournalSources"."NavigationSubmenuCode" = ''
    AND   EXCLUDED."NavigationSubmenuCode" <> '';
END $$;

COMMIT;


-- ------------------------------------------------------------
-- Check (run on its own)
-- ------------------------------------------------------------
SELECT "EstimateNo", "Version", "Status", "CustomerName", "ModelName", "JobCardId", "ChargeTotal", "ChargeCollected"
FROM   public."ServiceEstimates"
WHERE  "IsDeleted" = false
ORDER  BY "ServiceEstimateId" DESC
LIMIT  20;
