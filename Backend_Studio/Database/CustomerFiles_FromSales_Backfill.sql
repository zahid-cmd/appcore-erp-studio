ROLLBACK;

-- ============================================================
-- Customer Files : from posted Sales Invoices - MB (2026-11-11)
--
-- From now on posting an MB invoice creates one Customer File
-- per chassis (owner 2026-11-11 : every posted sale, dues or not;
-- Registration By = Customer). This script makes the missing
-- files of the invoices posted before :
--   Customer File No  <invoice no>/<n>  (n = the bike's place
--                     among the invoice's bike lines, by LineNo)
--   Source Invoice, file date = invoice date, status Open,
--   Fuel / Electric from the model's specification.
-- A chassis that already has a live file is skipped.
--
-- Safe to run again (existing file numbers are skipped).
-- ============================================================

BEGIN;

WITH bikes AS
(
    SELECT
        h."SalesInvoiceId",
        h."InvoiceNo",
        h."InvoiceDate",
        h."BranchId",
        h."SalesPersonName",
        h."CustomerId",
        l."ProductId",
        trim(l."ChassisNo")                      AS chassis,
        trim(l."EngineNo")                       AS engine,
        l."CkdStatus",
        l."ManufactureYear",
        row_number() OVER (PARTITION BY h."SalesInvoiceId"
                           ORDER BY l."LineNo", l."SalesInvoiceLineId") AS n
    FROM   public."SalesInvoicesMb" h
    JOIN   public."SalesInvoicesMbLines" l
           ON l."SalesInvoiceId" = h."SalesInvoiceId"
    WHERE  h."Status" = 'Posted'
    AND    NOT h."IsDeleted"
    AND    l."MotorBikeUnitId" IS NOT NULL
),
power AS
(
    SELECT DISTINCT ON (b."MotorBikeId")
           b."MotorBikeId",
           CASE WHEN upper(trim(coalesce(p."FuelType", ''))) = 'ELECTRIC' THEN 'Electric' ELSE 'Fuel' END AS vehicle_power
    FROM   public."MotorBikes" b
    JOIN   public."ProductSubCategories" s ON s."ProductSubCategoryId" = b."ProductSubCategoryId"
    JOIN   public."MotorBikeSpecifications" p ON p."BikeModelId" = s."BikeModelId" AND NOT p."IsDeleted"
    ORDER  BY b."MotorBikeId", p."MotorBikeSpecificationId"
),
todo AS
(
    SELECT x.*, x."InvoiceNo" || '/' || x.n AS file_no
    FROM   bikes x
)
INSERT INTO public."CustomerFiles"
    ("CustomerFileNo", "Source", "FileDate", "BranchId",
     "SalesInvoiceId", "SalesInvoiceNo", "SalesInvoiceDate", "SalesmanName",
     "MotorBikeId", "ChassisNo", "EngineNo", "VehiclePower",
     "OriginalCustomerId", "CurrentCustomerId",
     "RegistrationBy", "RegistrationFileNo", "TransferCount",
     "CkdStatus", "ManufactureYear",
     "Status", "Remarks", "IsDeleted", "CreatedBy", "CreatedDate")
SELECT
    t.file_no, 'Invoice', t."InvoiceDate", t."BranchId",
    t."SalesInvoiceId", t."InvoiceNo", t."InvoiceDate", left(coalesce(t."SalesPersonName", ''), 150),
    t."ProductId", t.chassis, coalesce(t.engine, ''), coalesce(pw.vehicle_power, 'Fuel'),
    t."CustomerId", t."CustomerId",
    'Customer', '', 0,
    CASE WHEN coalesce(t."CkdStatus", '') = '' THEN 'No' ELSE t."CkdStatus" END, t."ManufactureYear",
    'Open', 'Made from the posted invoice (backfill 2026-11-11).', false, 1, now()
FROM   todo t
LEFT   JOIN power pw ON pw."MotorBikeId" = t."ProductId"
WHERE  NOT EXISTS (SELECT 1 FROM public."CustomerFiles" f WHERE f."CustomerFileNo" = t.file_no)
AND    NOT EXISTS (SELECT 1 FROM public."CustomerFiles" f
                   WHERE NOT f."IsDeleted" AND f."Status" <> 'Cancelled'
                   AND   upper(f."ChassisNo") = upper(t.chassis));

COMMIT;

SELECT "CustomerFileNo", "FileDate", "ChassisNo", "EngineNo", "VehiclePower", "RegistrationBy", "Status"
FROM   public."CustomerFiles"
WHERE  "Source" = 'Invoice'
ORDER  BY "CustomerFileId";
