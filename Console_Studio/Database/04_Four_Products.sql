/*===============================================================
  AppCore Console : the website shows four products (2026-11-13).

  Run in pgAdmin connected to "AppCore_Control" (Query Tool on that
  database), the whole file (F5). Safe to run again.

  1. Product names and the website order :
     1 AppCore Automobiles, 2 AppCore Two Wheelers,
     3 AppCore Real Estate, 4 AppCore Consultancy.
     Status is NOT changed (Two Wheeler stays Active, the rest
     Planned); the website takes enquiries for all four.
  2. Website settings : the home page hero, the highlights strip
     and the About text become company-wide (not two-wheeler only).
     Everything else saved in Website settings is kept.
===============================================================*/

BEGIN;

UPDATE public."Products" SET "ProductName" = 'AppCore Automobiles',  "DisplayOrder" = 1, "ModifiedDate" = now() WHERE "ProductCode" = 'AUTOMOBILE';
UPDATE public."Products" SET "ProductName" = 'AppCore Two Wheelers', "DisplayOrder" = 2, "ModifiedDate" = now() WHERE "ProductCode" = 'TWO-WHEELER';
UPDATE public."Products" SET "ProductName" = 'AppCore Real Estate',  "DisplayOrder" = 3, "ModifiedDate" = now() WHERE "ProductCode" = 'REAL-ESTATE';
UPDATE public."Products" SET "ProductName" = 'AppCore Consultancy',  "DisplayOrder" = 4, "ModifiedDate" = now() WHERE "ProductCode" = 'CONSULTANCY';

UPDATE public."SiteSettings"
SET "SettingValue" =
    ("SettingValue"::jsonb || jsonb_build_object
    (
        'HeroEyebrow', 'AppCore Technologies',
        'HeroTitle',   'Run your whole business from one seat.',
        'HeroText',    'Business software for automobile and two-wheeler dealers, real estate companies and consulting firms : every branch, one system, on your own web address.',
        'Stats',       jsonb_build_array
                       (
                           jsonb_build_object('Value', 'Multi-branch', 'Label', 'Every branch in one system'),
                           jsonb_build_object('Value', 'Tax ready',    'Label', 'VAT, GST or sales tax, your format'),
                           jsonb_build_object('Value', '4 industries', 'Label', 'One proven platform'),
                           jsonb_build_object('Value', 'Your address', 'Label', 'yourname.appcoretech.net')
                       ),
        'AboutTitle',  'Software built inside real businesses',
        'AboutText',   'AppCore Technologies builds business software for automobile and two-wheeler dealers, real estate companies and consulting firms. Our first product grew out of the daily work of a motorcycle dealership, so every screen follows how businesses actually sell, collect and account.' || chr(10) || chr(10)
                       || 'The same platform now carries four products : AppCore Automobiles, AppCore Two Wheelers, AppCore Real Estate and AppCore Consultancy, each shaped around its own industry.'
    ))::text,
    "ModifiedDate" = now()
WHERE "SettingKey" = 'website';

COMMIT;

SELECT "ProductCode", "ProductName", "Status", "DisplayOrder" FROM public."Products" ORDER BY "DisplayOrder";
