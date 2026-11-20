/*===============================================================
  BrandPacks_Menu.sql   (2026-11-20)

  Puts "Brand Packs" in the sidebar, next to Menu Order
  (Settings > Application Configuration), for the AppCore Admin
  role (RP-001) ONLY. No other role gets it; the server also
  refuses anyone who is not a developer or AppCore Admin.

  Hand-written page : never run Submenu / Code Sync for it.
  The route is copied from the Menu Order row (same parent).

  Run on AppCoreERP_Studio now (later on any client where AppCore
  needs it). Query Tool on that database, the whole file (F5).
  Saves at once. Safe to run again. Sign in again to see it.
  ASCII only.
===============================================================*/

DO $$
DECLARE
    v_mo     record;
    v_page   bigint;
    v_code   text;
    v_seq    int;
    v_route  text;
    v_src    bigint;
    v_assign bigint;
    v_detail bigint;
BEGIN
    -- Menu Order : its menu, module and route
    SELECT s."Id", s."NavigationMenuId", s."Route", s."DisplayOrder", m."Code" AS "MenuCode", m."NavigationModuleId"
    INTO   v_mo
    FROM   "NavigationSubmenus" s
    JOIN   "NavigationMenus" m ON m."Id" = s."NavigationMenuId"
    WHERE  lower(trim(s."RouteKey")) = 'menu-order' AND s."IsDeleted" = false
    LIMIT  1;

    IF v_mo."Id" IS NULL THEN
        RAISE EXCEPTION 'Menu Order page not found (run its setup first). Nothing was changed.';
    END IF;

    v_route := regexp_replace(v_mo."Route", 'menu-order$', 'brand-packs');

    -- the page
    SELECT "Id" INTO v_page
    FROM   "NavigationSubmenus"
    WHERE  lower(trim("RouteKey")) = 'brand-packs' AND "IsDeleted" = false
    LIMIT  1;

    IF v_page IS NULL THEN
        SELECT COALESCE(MAX("SequenceNo"), 0) + 1 INTO v_seq
        FROM   "NavigationSubmenus" WHERE "NavigationMenuId" = v_mo."NavigationMenuId";

        v_code := 'SUB-' || substr(v_mo."MenuCode", 5) || '-' || lpad(v_seq::text, 3, '0');

        INSERT INTO "NavigationSubmenus"
            ("NavigationMenuId", "SequenceNo", "Code", "Name", "Icon", "RouteKey", "Route",
             "DisplayOrder", "Remarks", "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        VALUES
            (v_mo."NavigationMenuId", v_seq, v_code, 'Brand Packs', 'fa-solid fa-box-open', 'brand-packs',
             v_route, v_mo."DisplayOrder" + 1,
             'AppCore only : export / install a brand catalogue. Hand-written page : never run Submenu / Code Sync.',
             true, false, 1, now())
        RETURNING "Id" INTO v_page;

        RAISE NOTICE 'Page Brand Packs created (%), route %.', v_code, v_route;
    ELSE
        UPDATE "NavigationSubmenus" SET "Route" = v_route, "IsActive" = true WHERE "Id" = v_page;
        RAISE NOTICE 'Page Brand Packs already there, route %.', v_route;
    END IF;

    -- AppCore Admin (RP-001) only : same common activities as its Menu Order row
    SELECT a."ActivityAssignmentId" INTO v_assign
    FROM   "ActivityAssignments" a
    JOIN   "RoleProfiles" r ON r."RoleProfileId" = a."RoleProfileId"
    WHERE  r."ProfileCode" = 'RP-001'
    LIMIT  1;

    IF v_assign IS NULL THEN
        RAISE EXCEPTION 'AppCore Admin (RP-001) has no activity assignment. Nothing was given.';
    END IF;

    SELECT "ActivityAssignmentDetailId" INTO v_src
    FROM   "ActivityAssignmentDetails"
    WHERE  "ActivityAssignmentId" = v_assign AND "SubMenuId" = v_mo."Id" AND "IsDeleted" = false
    LIMIT  1;

    SELECT "ActivityAssignmentDetailId" INTO v_detail
    FROM   "ActivityAssignmentDetails"
    WHERE  "ActivityAssignmentId" = v_assign AND "SubMenuId" = v_page;

    IF v_detail IS NULL THEN
        INSERT INTO "ActivityAssignmentDetails"
            ("ActivityAssignmentId", "ModuleId", "MenuId", "SubMenuId", "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        VALUES (v_assign, v_mo."NavigationModuleId", v_mo."NavigationMenuId", v_page, true, false, 1, now())
        RETURNING "ActivityAssignmentDetailId" INTO v_detail;
    ELSE
        UPDATE "ActivityAssignmentDetails" SET "IsActive" = true, "IsDeleted" = false
        WHERE  "ActivityAssignmentDetailId" = v_detail;
    END IF;

    IF v_src IS NOT NULL THEN
        INSERT INTO "ActivityAssignmentPermissions"
            ("ActivityAssignmentDetailId", "MasterActivityId", "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        SELECT v_detail, p."MasterActivityId", true, false, 1, now()
        FROM   "ActivityAssignmentPermissions" p
        JOIN   "MasterActivities" a ON a."Id" = p."MasterActivityId"
        WHERE  p."ActivityAssignmentDetailId" = v_src
        AND    p."IsDeleted" = false
        AND    a."ActivityScope" = 'Common'
        AND    NOT EXISTS (SELECT 1 FROM "ActivityAssignmentPermissions" x
                           WHERE x."ActivityAssignmentDetailId" = v_detail AND x."MasterActivityId" = p."MasterActivityId");
    END IF;

    RAISE NOTICE 'Brand Packs given to AppCore Admin only.';
END $$;

-- Check : the page and who has it (must be AppCore Admin only)
SELECT s."Code", s."Name", s."Route", r."ProfileName" AS "Role"
FROM   "NavigationSubmenus" s
LEFT JOIN "ActivityAssignmentDetails" d ON d."SubMenuId" = s."Id" AND d."IsDeleted" = false
LEFT JOIN "ActivityAssignments" x ON x."ActivityAssignmentId" = d."ActivityAssignmentId"
LEFT JOIN "RoleProfiles" r ON r."RoleProfileId" = x."RoleProfileId"
WHERE  lower(s."RouteKey") = 'brand-packs' AND s."IsDeleted" = false;
