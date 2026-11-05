SELECT 'ServiceVehicles table' AS "Check",
       CASE WHEN to_regclass('public."ServiceVehicles"') IS NOT NULL THEN 'yes' ELSE 'NO' END AS "Result"
UNION ALL
SELECT 'ServiceVehicleSchedules table',
       CASE WHEN to_regclass('public."ServiceVehicleSchedules"') IS NOT NULL THEN 'yes' ELSE 'NO' END
UNION ALL
SELECT 'ServiceEnquiries.ServiceVehicleScheduleId',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ServiceEnquiries' AND column_name = 'ServiceVehicleScheduleId') THEN 'yes' ELSE 'NO' END
UNION ALL
SELECT 'Source of Enquiry "Scheduled"',
       CASE WHEN EXISTS (SELECT 1 FROM public."EnquirySetups" WHERE "SetupType" = 'Source' AND "IsDeleted" = false AND "IsActive" = true AND lower("Name") = 'scheduled') THEN 'yes' ELSE 'NO' END;
