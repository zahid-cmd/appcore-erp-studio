-- Enquiry Management : all column changes of 2026-11-03 in one script
-- (interest days, Super Hot, website enquiries, test rides).
-- Run in a NEW Query Tool tab (F5). Safe to run again.

ALTER TABLE public."EnquirySetups" ADD COLUMN IF NOT EXISTS "DaysFrom" integer NULL;

ALTER TABLE public."EnquirySetups" ADD COLUMN IF NOT EXISTS "DaysTo" integer NULL;

ALTER TABLE public."SalesEnquiries" ADD COLUMN IF NOT EXISTS "PreferredColor" character varying(50) NOT NULL DEFAULT '';

ALTER TABLE public."SalesEnquiries" ADD COLUMN IF NOT EXISTS "FromWebsite" boolean NOT NULL DEFAULT false;

ALTER TABLE public."SalesEnquiries" ADD COLUMN IF NOT EXISTS "TestRideDate" date NULL;

ALTER TABLE public."SalesEnquiries" ADD COLUMN IF NOT EXISTS "TestRideSlot" character varying(20) NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS "IX_SalesEnquiries_FromWebsite_Executive" ON public."SalesEnquiries" ("FromWebsite", "ExecutiveUserId");

INSERT INTO public."EnquirySetups" ("SetupType", "Code", "Name", "ColorCode", "Stage", "DisplayOrder", "IsDefault", "IsSystem", "Remarks", "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
SELECT 'InterestLevel', 'INT-' || lpad(s.n::text, 3, '0'), 'Super Hot', '#DC2626', '', 1, false, false, '', true, false, 1, now()
FROM (SELECT COALESCE(MAX(substring("Code" FROM 5)::int), 0) + 1 AS n FROM public."EnquirySetups" WHERE "SetupType" = 'InterestLevel' AND "Code" ~ '^INT-[0-9]+$') AS s
WHERE NOT EXISTS (SELECT 1 FROM public."EnquirySetups" e WHERE e."SetupType" = 'InterestLevel' AND e."IsDeleted" = false AND lower(e."Name") = 'super hot');

UPDATE public."EnquirySetups" SET "ColorCode" = '#EA580C' WHERE "SetupType" = 'InterestLevel' AND "IsDeleted" = false AND lower("Name") = 'hot' AND upper("ColorCode") = '#DC2626';

UPDATE public."EnquirySetups" e SET "DisplayOrder" = v.ord, "DaysFrom" = v.days_from, "DaysTo" = v.days_to
FROM (VALUES ('super hot', 1, 0, 3), ('hot', 2, 4, 7), ('warm', 3, 8, 15), ('cold', 4, 16, NULL::int)) AS v (name, ord, days_from, days_to)
WHERE e."SetupType" = 'InterestLevel' AND e."IsDeleted" = false AND lower(e."Name") = v.name AND e."DaysFrom" IS NULL AND e."DaysTo" IS NULL;

INSERT INTO public."EnquirySetups" ("SetupType", "Code", "Name", "ColorCode", "Stage", "DisplayOrder", "IsDefault", "IsSystem", "Remarks", "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
SELECT 'Source', 'SRC-' || lpad(s.n::text, 3, '0'), 'Website', '', '', s.n, false, false, '', true, false, 1, now()
FROM (SELECT COALESCE(MAX(substring("Code" FROM 5)::int), 0) + 1 AS n FROM public."EnquirySetups" WHERE "SetupType" = 'Source' AND "Code" ~ '^SRC-[0-9]+$') AS s
WHERE NOT EXISTS (SELECT 1 FROM public."EnquirySetups" e WHERE e."SetupType" = 'Source' AND e."IsDeleted" = false AND lower(e."Name") = 'website');

UPDATE public."EnquirySetups" SET "IsActive" = true WHERE "SetupType" = 'Source' AND "IsDeleted" = false AND lower("Name") = 'website';
