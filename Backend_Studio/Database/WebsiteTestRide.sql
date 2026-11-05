-- Website test ride requests on Sales Enquiries (2026-11-03)
-- Run in a NEW Query Tool tab (F5) after WebsiteEnquiry.sql. Safe to run again.

ALTER TABLE public."SalesEnquiries" ADD COLUMN IF NOT EXISTS "TestRideDate" date NULL;

ALTER TABLE public."SalesEnquiries" ADD COLUMN IF NOT EXISTS "TestRideSlot" character varying(20) NOT NULL DEFAULT '';
