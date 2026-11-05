-- Website enquiries -> Sales Enquiries (2026-11-03)
-- Run in a NEW Query Tool tab (F5). Safe to run again.
-- Check afterwards with WebsiteEnquiry_Check.sql

ALTER TABLE public."SalesEnquiries" ADD COLUMN IF NOT EXISTS "PreferredColor" character varying(50) NOT NULL DEFAULT '';

ALTER TABLE public."SalesEnquiries" ADD COLUMN IF NOT EXISTS "FromWebsite" boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "IX_SalesEnquiries_FromWebsite_Executive" ON public."SalesEnquiries" ("FromWebsite", "ExecutiveUserId");

INSERT INTO public."EnquirySetups" ("SetupType", "Code", "Name", "ColorCode", "Stage", "DisplayOrder", "IsDefault", "IsSystem", "Remarks", "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
SELECT 'Source', 'SRC-' || lpad(s.n::text, 3, '0'), 'Website', '', '', s.n, false, false, '', true, false, 1, now()
FROM (SELECT COALESCE(MAX(substring("Code" FROM 5)::int), 0) + 1 AS n FROM public."EnquirySetups" WHERE "SetupType" = 'Source' AND "Code" ~ '^SRC-[0-9]+$') AS s
WHERE NOT EXISTS (SELECT 1 FROM public."EnquirySetups" e WHERE e."SetupType" = 'Source' AND e."IsDeleted" = false AND lower(e."Name") = 'website');

UPDATE public."EnquirySetups" SET "IsActive" = true WHERE "SetupType" = 'Source' AND "IsDeleted" = false AND lower("Name") = 'website';
