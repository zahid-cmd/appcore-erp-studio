/*===============================================================
  MenuOrder_Navigation.sql   (2026-11-20)

  Adds the page "Menu Order" to
      Settings > Application Configuration
  (route /settings/application-configuration/menu-order) and gives
  it to every role that already has Login Pages, with the same
  common activities (View, Add, Update ...). On a client database
  that is Administrator and AppCore Admin.

  Run AFTER ApplicationConfiguration_To_Settings.sql, on each
  database : AppCoreERP_Studio, AppCoreTpl_TW, AppCore_TW_DEMO.
  Query Tool on that database, the whole file (F5). Saves at once.
  Safe to run again. Hand-written page : never run Submenu / Code
  Sync for it. Users sign in again to see it. ASCII only.
===============================================================*/

DO $$
DECLARE
    v_menu   record;
    v_module record;
    v_page   bigint;
    v_code   text;
    v_seq    int;
    v_src    record;
    v_detail bigint;
    n        int := 0;
BEGIN
    SELECT m."Id", m."Code", m."RouteKey", m."NavigationModuleId" INTO v_menu
    FROM   "NavigationMenus" m
    JOIN   "NavigationModules" d ON d."Id" = m."NavigationModuleId"
    WHERE  lower(trim(m."RouteKey")) = 'application-configuration' AND m."IsDeleted" = false
    AND    lower(trim(d."RouteKey")) = 'settings' AND d."IsDeleted" = false
    LIMIT  1;

    IF v_menu."Id" IS NULL THEN
        RAISE EXCEPTION 'Settings > Application Configuration not found : run ApplicationConfiguration_To_Settings.sql (and COMMIT) first. Nothing was changed.';
    END IF;

    SELECT "Id", "RouteKey" INTO v_module FROM "NavigationModules" WHERE "Id" = v_menu."NavigationModuleId";

    -- the page ----------------------------------------------------------
    SELECT "Id" INTO v_page
    FROM   "NavigationSubmenus"
    WHERE  lower(trim("RouteKey")) = 'menu-order' AND "IsDeleted" = false
    LIMIT  1;

    IF v_page IS NULL THEN
        SELECT COALESCE(MAX("SequenceNo"), 0) + 1 INTO v_seq
        FROM   "NavigationSubmenus" WHERE "NavigationMenuId" = v_menu."Id";

        v_code := 'SUB-' || substr(v_menu."Code", 5) || '-' || lpad(v_seq::text, 3, '0');

        INSERT INTO "NavigationSubmenus"
            ("NavigationMenuId", "SequenceNo", "Code", "Name", "Icon", "RouteKey", "Route",
             "DisplayOrder", "Remarks", "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        VALUES
            (v_menu."Id", v_seq, v_code, 'Menu Order', 'fa-solid fa-arrow-down-short-wide', 'menu-order',
             '/settings/application-configuration/menu-order', 4,
             'Order of the menu and which parts are shown. Hand-written page : never run Submenu / Code Sync.',
             true, false, 1, now())
        RETURNING "Id" INTO v_page;

        RAISE NOTICE 'Page Menu Order created (%).', v_code;
    ELSE
        RAISE NOTICE 'Page Menu Order already there.';
    END IF;

    -- permissions : every role that has Login Pages ---------------------
    FOR v_src IN
        SELECT d."ActivityAssignmentDetailId", d."ActivityAssignmentId"
        FROM   "ActivityAssignmentDetails" d
        JOIN   "NavigationSubmenus" s ON s."Id" = d."SubMenuId"
        WHERE  lower(trim(s."RouteKey")) = 'login-pages' AND s."IsDeleted" = false AND d."IsDeleted" = false
    LOOP
        SELECT "ActivityAssignmentDetailId" INTO v_detail
        FROM   "ActivityAssignmentDetails"
        WHERE  "ActivityAssignmentId" = v_src."ActivityAssignmentId" AND "SubMenuId" = v_page;

        IF v_detail IS NULL THEN
            INSERT INTO "ActivityAssignmentDetails"
                ("ActivityAssignmentId", "ModuleId", "MenuId", "SubMenuId", "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
            VALUES (v_src."ActivityAssignmentId", v_module."Id", v_menu."Id", v_page, true, false, 1, now())
            RETURNING "ActivityAssignmentDetailId" INTO v_detail;

            n := n + 1;
        ELSE
            UPDATE "ActivityAssignmentDetails" SET "IsActive" = true, "IsDeleted" = false
            WHERE  "ActivityAssignmentDetailId" = v_detail;
        END IF;

        INSERT INTO "ActivityAssignmentPermissions"
            ("ActivityAssignmentDetailId", "MasterActivityId", "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        SELECT v_detail, p."MasterActivityId", true, false, 1, now()
        FROM   "ActivityAssignmentPermissions" p
        JOIN   "MasterActivities" a ON a."Id" = p."MasterActivityId"
        WHERE  p."ActivityAssignmentDetailId" = v_src."ActivityAssignmentDetailId"
        AND    p."IsDeleted" = false
        AND    a."ActivityScope" = 'Common'
        AND    NOT EXISTS (SELECT 1 FROM "ActivityAssignmentPermissions" x
                           WHERE x."ActivityAssignmentDetailId" = v_detail AND x."MasterActivityId" = p."MasterActivityId");
    END LOOP;

    RAISE NOTICE 'Menu Order given to % role(s) that have Login Pages.', n;
END $$;

-- Who has it now
SELECT r."ProfileName" AS "Role", string_agg(a."Name", ', ' ORDER BY a."Name") AS "Activities on Menu Order"
FROM   "ActivityAssignmentDetails" d
JOIN   "ActivityAssignments" x ON x."ActivityAssignmentId" = d."ActivityAssignmentId"
JOIN   "RoleProfiles" r ON r."RoleProfileId" = x."RoleProfileId"
JOIN   "NavigationSubmenus" s ON s."Id" = d."SubMenuId"
JOIN   "ActivityAssignmentPermissions" p ON p."ActivityAssignmentDetailId" = d."ActivityAssignmentDetailId" AND p."IsDeleted" = false
JOIN   "MasterActivities" a ON a."Id" = p."MasterActivityId"
WHERE  lower(s."RouteKey") = 'menu-order' AND d."IsDeleted" = false
GROUP  BY r."ProfileName"
ORDER  BY r."ProfileName";
