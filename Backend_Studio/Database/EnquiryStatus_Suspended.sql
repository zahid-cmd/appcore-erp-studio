-- Rename the enquiry status "Lost" to "Suspended" (2026-11-03).
-- The stage stays 'Lost' inside the database (the screens show it as Suspended).
-- Run in a NEW Query Tool tab (F5). Safe to run again.

UPDATE public."EnquirySetups" SET "Name" = 'Suspended', "ModifiedBy" = 1, "ModifiedDate" = now() WHERE "SetupType" = 'Status' AND "IsDeleted" = false AND lower("Name") = 'lost' AND NOT EXISTS (SELECT 1 FROM public."EnquirySetups" x WHERE x."SetupType" = 'Status' AND x."IsDeleted" = false AND lower(x."Name") = 'suspended');
