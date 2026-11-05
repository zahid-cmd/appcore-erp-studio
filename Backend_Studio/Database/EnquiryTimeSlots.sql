-- Enquiry Setup : Time Slots tab
-- A time slot = a booking day for one page (UsedFor 'Service' =
-- service appointments, 'TestRide' = test rides) : working hours
-- TimeFrom - TimeTo cut into IntervalMinutes slots (15 / 30 / 45 /
-- 60), lunch break BreakFrom - BreakTo skipped. SetupType
-- 'TimeSlot', code TSL-001, name "Service Appointment 1" ...
-- Safe to run more than once.

ALTER TABLE "EnquirySetups" ADD COLUMN IF NOT EXISTS "TimeFrom" time NULL;

ALTER TABLE "EnquirySetups" ADD COLUMN IF NOT EXISTS "TimeTo" time NULL;

ALTER TABLE "EnquirySetups" ADD COLUMN IF NOT EXISTS "UsedFor" varchar(20) NOT NULL DEFAULT '';

ALTER TABLE "EnquirySetups" ADD COLUMN IF NOT EXISTS "IntervalMinutes" integer NULL;

ALTER TABLE "EnquirySetups" ADD COLUMN IF NOT EXISTS "BreakFrom" time NULL;

ALTER TABLE "EnquirySetups" ADD COLUMN IF NOT EXISTS "BreakTo" time NULL;

ALTER TABLE "EnquirySetups" DROP CONSTRAINT IF EXISTS "CK_EnquirySetups_SetupType";

ALTER TABLE "EnquirySetups" ADD CONSTRAINT "CK_EnquirySetups_SetupType" CHECK ("SetupType" IN ('Source', 'Status', 'InterestLevel', 'FollowUpMethod', 'LostReason', 'TimeSlot'));

SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'EnquirySetups' AND column_name IN ('TimeFrom', 'TimeTo', 'UsedFor', 'IntervalMinutes', 'BreakFrom', 'BreakTo') ORDER BY column_name;
