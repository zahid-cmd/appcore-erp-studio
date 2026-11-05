-- Run on its own after WebsiteEnquiry.sql and EnquiryInterestDays.sql.
-- Every row must say yes.
SELECT 'SalesEnquiries.PreferredColor' AS item, CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SalesEnquiries' AND column_name = 'PreferredColor') THEN 'yes' ELSE 'NO' END AS ok
UNION ALL
SELECT 'SalesEnquiries.FromWebsite', CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SalesEnquiries' AND column_name = 'FromWebsite') THEN 'yes' ELSE 'NO' END
UNION ALL
SELECT 'EnquirySetups.DaysFrom', CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'EnquirySetups' AND column_name = 'DaysFrom') THEN 'yes' ELSE 'NO' END
UNION ALL
SELECT 'Source "Website"', CASE WHEN EXISTS (SELECT 1 FROM public."EnquirySetups" WHERE "SetupType" = 'Source' AND "IsDeleted" = false AND "IsActive" AND lower("Name") = 'website') THEN 'yes' ELSE 'NO' END
UNION ALL
SELECT 'Interest "Super Hot"', CASE WHEN EXISTS (SELECT 1 FROM public."EnquirySetups" WHERE "SetupType" = 'InterestLevel' AND "IsDeleted" = false AND lower("Name") = 'super hot') THEN 'yes' ELSE 'NO' END
UNION ALL
SELECT 'SalesEnquiries.TestRideDate', CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SalesEnquiries' AND column_name = 'TestRideDate') THEN 'yes' ELSE 'NO' END;
