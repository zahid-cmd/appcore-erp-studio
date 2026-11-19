/*===============================================================
  Client_Fix_InfrastructureControl_Rows.sql   (2026-11-20)

  For a CLIENT database (AppCore_TW_DEMO, AppCoreTpl_TW, ...).
  Activity Assignment refuses to save a role (not RP-001) when
  any of its rows points to the module "Infrastructure Control".

  Step 1 lists every such row (all roles), with the module the
  page really belongs to now.
  Step 2 fixes them :
    - a row whose page now lives in another module (e.g. the
      pages moved to Settings > Application Configuration) gets
      that module's Id;
    - a row whose page really is under Infrastructure Control is
      marked deleted (clients never keep it).
  Step 3 checks : must be 0.

  Never on AppCoreERP_Studio : it stops.
  Query Tool on the client database, the whole file (F5).
  Saves at once. Safe to run again. ASCII only.
===============================================================*/

-- Step 1 : what is wrong now
SELECT r."ProfileCode"  AS "Role code",
       r."ProfileName"  AS "Role",
       d."ActivityAssignmentDetailId" AS "Row",
       sm."Name"        AS "Page",
       mn."Name"        AS "Menu",
       pm."Name"        AS "Module the page is in now",
       CASE WHEN lower(trim(pm."RouteKey")) = 'infrastructure-control'
            THEN 'will be removed' ELSE 'module will be corrected' END AS "Action"
FROM   "ActivityAssignmentDetails" d
JOIN   "ActivityAssignments" a ON a."ActivityAssignmentId" = d."ActivityAssignmentId"
JOIN   "RoleProfiles"       r ON r."RoleProfileId" = a."RoleProfileId"
JOIN   "NavigationModules"  dm ON dm."Id" = d."ModuleId"
LEFT JOIN "NavigationSubmenus" sm ON sm."Id" = d."SubMenuId"
LEFT JOIN "NavigationMenus"    mn ON mn."Id" = COALESCE(sm."NavigationMenuId", d."MenuId")
LEFT JOIN "NavigationModules"  pm ON pm."Id" = mn."NavigationModuleId"
WHERE  d."IsDeleted" = false
AND    (lower(trim(dm."RouteKey")) = 'infrastructure-control' OR lower(trim(dm."Name")) = 'infrastructure control')
ORDER  BY r."ProfileCode", mn."Name", sm."Name";

-- Step 2 : fix
DO $$
DECLARE
    n_moved   bigint := 0;
    n_removed bigint := 0;
    n_spec    bigint := 0;
BEGIN
    IF current_database() = 'AppCoreERP_Studio' THEN
        RAISE EXCEPTION 'This is the development database : Infrastructure Control stays here. Nothing was changed.';
    END IF;

    -- rows whose page now lives in another module : follow the page
    UPDATE "ActivityAssignmentDetails" d
    SET    "ModuleId" = mn."NavigationModuleId",
           "MenuId"   = mn."Id"
    FROM   "NavigationModules" dm, "NavigationSubmenus" sm, "NavigationMenus" mn, "NavigationModules" pm
    WHERE  dm."Id" = d."ModuleId"
    AND    sm."Id" = d."SubMenuId"
    AND    mn."Id" = sm."NavigationMenuId"
    AND    pm."Id" = mn."NavigationModuleId"
    AND    d."IsDeleted" = false
    AND    (lower(trim(dm."RouteKey")) = 'infrastructure-control' OR lower(trim(dm."Name")) = 'infrastructure control')
    AND    lower(trim(pm."RouteKey")) <> 'infrastructure-control';
    GET DIAGNOSTICS n_moved = ROW_COUNT;

    -- rows that really are Infrastructure Control : removed
    UPDATE "ActivityAssignmentDetails" d
    SET    "IsDeleted" = true, "IsActive" = false
    FROM   "NavigationModules" dm
    WHERE  dm."Id" = d."ModuleId"
    AND    d."IsDeleted" = false
    AND    (lower(trim(dm."RouteKey")) = 'infrastructure-control' OR lower(trim(dm."Name")) = 'infrastructure control');
    GET DIAGNOSTICS n_removed = ROW_COUNT;

    IF to_regclass('public."SpecialAssignmentDetails"') IS NOT NULL THEN
        UPDATE "SpecialAssignmentDetails" d
        SET    "IsDeleted" = true, "IsActive" = false
        FROM   "NavigationModules" dm
        WHERE  dm."Id" = d."ModuleId"
        AND    d."IsDeleted" = false
        AND    (lower(trim(dm."RouteKey")) = 'infrastructure-control' OR lower(trim(dm."Name")) = 'infrastructure control');
        GET DIAGNOSTICS n_spec = ROW_COUNT;
    END IF;

    RAISE NOTICE '%: % row(s) moved to their real module, % row(s) removed, % special row(s) removed.',
                 current_database(), n_moved, n_removed, n_spec;
END $$;

-- Step 3 : check (must be 0)
SELECT count(*) AS "Infrastructure Control rows left (must be 0)"
FROM   "ActivityAssignmentDetails" d
JOIN   "NavigationModules" dm ON dm."Id" = d."ModuleId"
WHERE  d."IsDeleted" = false
AND    (lower(trim(dm."RouteKey")) = 'infrastructure-control' OR lower(trim(dm."Name")) = 'infrastructure control');
