ROLLBACK;

-- ============================================================
-- PromotionalOffers_Activities.sql                (2026-11-13)
--
-- Page actions of the three Promotional Offers pages :
--   Approve  (Activate : Draft -> Active)
--   Cancel   (Close and Cancel)
--   Restore  (bring back the last deleted offer)
--
-- The pages are found by their routes
--   /sales-operations/%/promotional-offers-sales-center
--   /sales-operations/%/promotional-offers-service-center
--   /sales-operations/%/promotional-offers-accessory-shop
--
-- After running : Role Assignment (or Special Assignment) ->
-- tick Approve / Cancel on each Promotional Offers page for the
-- roles that may activate, close or cancel offers.
--
-- Re-runnable : a link that exists is kept.
-- ============================================================

BEGIN;

INSERT INTO "MasterActivityPages" ("MasterActivityCode", "NavigationSubmenuCode", "CreatedBy")
SELECT a."Code", s."Code", 1
FROM   "MasterActivities" a
JOIN   "NavigationSubmenus" s
       ON  s."IsDeleted" = false
       AND (   s."Route" ILIKE '/sales-operations/%/promotional-offers-sales-center'
            OR s."Route" ILIKE '/sales-operations/%/promotional-offers-service-center'
            OR s."Route" ILIKE '/sales-operations/%/promotional-offers-accessory-shop')
WHERE  a."IsDeleted" = false
AND    a."ActivityScope" = 'Page'
AND    a."Name" IN ('Approve', 'Cancel', 'Restore')
ON CONFLICT ("MasterActivityCode", "NavigationSubmenuCode") DO NOTHING;

DO $$
DECLARE
    v_pages integer;
    v_acts  text;
BEGIN
    SELECT count(*) INTO v_pages
    FROM   "NavigationSubmenus" s
    WHERE  s."IsDeleted" = false
    AND    (   s."Route" ILIKE '/sales-operations/%/promotional-offers-sales-center'
            OR s."Route" ILIKE '/sales-operations/%/promotional-offers-service-center'
            OR s."Route" ILIKE '/sales-operations/%/promotional-offers-accessory-shop');

    IF v_pages < 3 THEN
        RAISE NOTICE 'Only % of the 3 Promotional Offers pages were found by route : create the missing page(s), then run this script again.', v_pages;
    END IF;

    SELECT string_agg(n, ', ') INTO v_acts
    FROM   unnest(ARRAY['Approve', 'Cancel', 'Restore']) AS n
    WHERE  NOT EXISTS (SELECT 1 FROM "MasterActivities" a
                       WHERE a."IsDeleted" = false
                       AND   a."ActivityScope" = 'Page'
                       AND   a."Name" = n);

    IF v_acts IS NOT NULL THEN
        RAISE NOTICE 'Page action(s) not found in Master Activities : % (add them there, then run this script again).', v_acts;
    END IF;
END $$;

COMMIT;


/*  Check (select and run on its own)

SELECT s."Code" AS "Submenu", s."Name" AS "Page", s."Route",
       COALESCE((SELECT string_agg(a."Name", ', ' ORDER BY a."DisplayOrder")
                 FROM   "MasterActivityPages" p
                 JOIN   "MasterActivities" a ON a."Code" = p."MasterActivityCode" AND a."IsDeleted" = false
                 WHERE  p."NavigationSubmenuCode" = s."Code"), '') AS "Page Actions"
FROM   "NavigationSubmenus" s
WHERE  s."Route" ILIKE '/sales-operations/%/promotional-offers-%'
AND    s."IsDeleted" = false;

*/
