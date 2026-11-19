/*===============================================================
  Client_Remove_InfrastructureControl.sql   (2026-11-20)

  Infrastructure Control is AppCore's own. In a CLIENT database
  (the template AppCoreTpl_TW, AppCore_TW_DEMO, AppCore_TW_<CLIENT>)
  no role keeps a permission on it : its permission rows are marked
  deleted, so it is not even ticked in Activity / Special Assignment.
  (The ERP also hides and refuses it on every client address.)

  Run AFTER ApplicationConfiguration_To_Settings.sql on the same
  database (it stops otherwise : those pages must be under Settings
  first, or their permissions would go too).

  Never on AppCoreERP_Studio (development keeps it) : it stops.
  Query Tool on the client database, the whole file (F5).
  Safe to run again. ASCII only.
===============================================================*/

DO $$
DECLARE
    v_infra bigint;
    n_role  bigint := 0;
    n_spec  bigint := 0;
BEGIN
    IF current_database() = 'AppCoreERP_Studio' THEN
        RAISE EXCEPTION 'This is the development database : Infrastructure Control stays here. Nothing was changed.';
    END IF;

    IF EXISTS (SELECT 1
               FROM   "NavigationMenus" m
               JOIN   "NavigationModules" d ON d."Id" = m."NavigationModuleId"
               WHERE  lower(trim(m."RouteKey")) = 'application-configuration'
               AND    m."IsDeleted" = false
               AND    lower(trim(d."RouteKey")) = 'infrastructure-control') THEN
        RAISE EXCEPTION 'Application Configuration is still under Infrastructure Control. Run ApplicationConfiguration_To_Settings.sql (and COMMIT) on this database first. Nothing was changed.';
    END IF;

    SELECT "Id" INTO v_infra
    FROM   "NavigationModules"
    WHERE  lower(trim("RouteKey")) = 'infrastructure-control'
    ORDER  BY "Id" LIMIT 1;

    IF v_infra IS NULL THEN
        RAISE NOTICE 'No Infrastructure Control module here : nothing to do.';
        RETURN;
    END IF;

    UPDATE "ActivityAssignmentDetails"
    SET    "IsDeleted" = true, "IsActive" = false
    WHERE  "ModuleId" = v_infra AND "IsDeleted" = false;
    GET DIAGNOSTICS n_role = ROW_COUNT;

    IF to_regclass('public."SpecialAssignmentDetails"') IS NOT NULL THEN
        UPDATE "SpecialAssignmentDetails"
        SET    "IsDeleted" = true, "IsActive" = false
        WHERE  "ModuleId" = v_infra AND "IsDeleted" = false;
        GET DIAGNOSTICS n_spec = ROW_COUNT;
    END IF;

    RAISE NOTICE 'Infrastructure Control removed from the roles of %: % role permission row(s), % special row(s).', current_database(), n_role, n_spec;
END $$;

-- Check : must be 0
SELECT count(*) AS "Infrastructure Control permission rows (must be 0)"
FROM   "ActivityAssignmentDetails" a
JOIN   "NavigationModules" d ON d."Id" = a."ModuleId"
WHERE  lower(trim(d."RouteKey")) = 'infrastructure-control'
AND    a."IsDeleted" = false;
