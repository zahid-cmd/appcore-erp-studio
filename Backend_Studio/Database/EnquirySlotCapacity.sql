-- Enquiry Setup › Time Slots : Bookings per Slot (2026-11-05)
-- How many appointments one slot can take (1 - 20). Manual for
-- now; later from Workshop Configuration (service bays allowed
-- for online booking). Existing time slots get 2.
-- Safe to run more than once.

ALTER TABLE "EnquirySetups" ADD COLUMN IF NOT EXISTS "SlotCapacity" integer NULL;

UPDATE "EnquirySetups" SET "SlotCapacity" = 2 WHERE "SetupType" = 'TimeSlot' AND "SlotCapacity" IS NULL;

SELECT "Code", "Name", "IntervalMinutes", "SlotCapacity", "IsDefault", "IsActive" FROM "EnquirySetups" WHERE "SetupType" = 'TimeSlot' ORDER BY "Code";
