-- =====================================================================
-- BackupCenter_Navigation.sql   (2026-11-05)
-- ---------------------------------------------------------------------
-- Client side of the backups :
--   1. Page  Settings > General Settings > Backup Center
--            /settings/general-settings/backup-center
--            (hand-written page : NEVER run Submenu / Code Sync)
--   2. Page activity "Take Backup" (scope Page), linked to that page
--      only. With it a user can take a backup from the Backup
--      Center (kind Client). View alone shows the status and the
--      last 10 backups. AppCore Admin (RP-001) may always do both.
--
-- Rows that already exist are skipped : safe to run again.
-- Run the whole script (F5).
--
-- AFTER : Security & Permission > Activity Assignment : tick View
-- (and Take Backup where wanted) on Backup Center for the roles,
-- then log in again.
-- ASCII only.
-- =====================================================================

DO $$
DECLARE
    v_module    record;
    v_menu      record;
    v_seq       int;
    v_sub_code  text;
    v_act_code  text;
    v_act_seq   int;
    v_cols      text;
    v_vals      text;
BEGIN
    -- ---------- Settings > General Settings ----------
    SELECT "Id", "SequenceNo", "RouteKey" INTO v_module
    FROM   "NavigationModules"
    WHERE  lower("RouteKey") = 'settings' AND "IsDeleted" = false;

    IF v_module."Id" IS NULL THEN
        RAISE EXCEPTION 'Module with route key settings not found - nothing changed.';
    END IF;

    SELECT "Id", "SequenceNo", "RouteKey" INTO v_menu
    FROM   "NavigationMenus"
    WHERE  "NavigationModuleId" = v_module."Id"
    AND    lower("RouteKey") = 'general-settings'
    AND    "IsDeleted" = false;

    IF v_menu."Id" IS NULL THEN
        RAISE EXCEPTION 'Menu general-settings not found under Settings - nothing changed.';
    END IF;

    -- ---------- 1. Submenu ----------
    SELECT "Code" INTO v_sub_code
    FROM   "NavigationSubmenus"
    WHERE  "NavigationMenuId" = v_menu."Id"
    AND    lower("RouteKey") = 'backup-center'
    AND    "IsDeleted" = false;

    IF v_sub_code IS NULL THEN
        IF EXISTS (SELECT 1 FROM "NavigationSubmenus"
                   WHERE lower("Name") = 'backup center' AND "IsDeleted" = false) THEN
            RAISE EXCEPTION 'A submenu named "Backup Center" already exists elsewhere - nothing changed.';
        END IF;

        SELECT COALESCE(MAX("SequenceNo"), 0) + 1 INTO v_seq
        FROM   "NavigationSubmenus"
        WHERE  "NavigationMenuId" = v_menu."Id";

        v_sub_code :=
            'SUB-' || lpad(v_module."SequenceNo"::text, 3, '0')
                   || '-' || lpad(v_menu."SequenceNo"::text, 3, '0')
                   || '-' || lpad(v_seq::text, 3, '0');

        INSERT INTO "NavigationSubmenus"
            ("NavigationMenuId", "SequenceNo", "Code", "Name", "Icon",
             "RouteKey", "Route", "DisplayOrder", "Remarks",
             "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        VALUES
            (v_menu."Id", v_seq, v_sub_code, 'Backup Center', 'fa-solid fa-shield-halved',
             'backup-center',
             '/' || v_module."RouteKey" || '/' || v_menu."RouteKey" || '/backup-center',
             v_seq, 'Nightly backup status and Take Backup (client side).',
             true, false, 1, now());

        RAISE NOTICE 'Submenu created : % Backup Center', v_sub_code;
    ELSE
        RAISE NOTICE 'Submenu exists, skipped : % Backup Center', v_sub_code;
    END IF;

    -- ---------- 2. Page activity "Take Backup" ----------
    SELECT "Code" INTO v_act_code
    FROM   "MasterActivities"
    WHERE  lower("Name") = 'take backup' AND "IsDeleted" = false;

    IF v_act_code IS NULL THEN
        SELECT COALESCE(MAX("SequenceNo"), 0) + 1 INTO v_act_seq FROM "MasterActivities";

        v_act_code := 'ACT-' || lpad(v_act_seq::text, 4, '0');

        IF EXISTS (SELECT 1 FROM "MasterActivities" WHERE "Code" = v_act_code) THEN
            RAISE EXCEPTION 'Activity code % already used - nothing changed.', v_act_code;
        END IF;

        v_cols := '"SequenceNo", "Code", "Name", "DisplayOrder", "Remarks", "ActivityScope", "LinkToSwitchPages", "IsActive", "IsDeleted"';
        v_vals := format('%s, %L, %L, %s, %L, %L, false, true, false',
                         v_act_seq, v_act_code, 'Take Backup', v_act_seq,
                         'Backup Center : take a backup of the App database now (kind Client).', 'Page');

        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'MasterActivities' AND column_name = 'CreatedBy') THEN
            v_cols := v_cols || ', "CreatedBy"';
            v_vals := v_vals || ', 1';
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'MasterActivities' AND column_name = 'CreatedDate') THEN
            v_cols := v_cols || ', "CreatedDate"';
            v_vals := v_vals || ', now()';
        END IF;

        EXECUTE format('INSERT INTO "MasterActivities" (%s) VALUES (%s)', v_cols, v_vals);

        RAISE NOTICE 'Activity created : % Take Backup', v_act_code;
    ELSE
        RAISE NOTICE 'Activity exists, skipped : % Take Backup', v_act_code;
    END IF;

    -- ---------- 3. Link the activity to the page ----------
    IF NOT EXISTS (SELECT 1 FROM "MasterActivityPages"
                   WHERE "MasterActivityCode" = v_act_code
                   AND   "NavigationSubmenuCode" = v_sub_code) THEN
        v_cols := '"MasterActivityCode", "NavigationSubmenuCode", "CreatedDate"';
        v_vals := format('%L, %L, now()', v_act_code, v_sub_code);

        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'MasterActivityPages' AND column_name = 'CreatedBy') THEN
            v_cols := v_cols || ', "CreatedBy"';
            v_vals := v_vals || ', 1';
        END IF;

        EXECUTE format('INSERT INTO "MasterActivityPages" (%s) VALUES (%s)', v_cols, v_vals);

        RAISE NOTICE 'Linked : % -> %', v_act_code, v_sub_code;
    ELSE
        RAISE NOTICE 'Link exists, skipped : % -> %', v_act_code, v_sub_code;
    END IF;
END
$$;


-- ---------------------------------------------------------------------
-- Check (run on its own)
-- ---------------------------------------------------------------------

SELECT s."Code" AS "Page Code", s."Name" AS "Page", s."Route",
       a."Code" AS "Activity Code", a."Name" AS "Activity", a."ActivityScope"
FROM   "NavigationSubmenus" s
LEFT   JOIN "MasterActivityPages" p ON p."NavigationSubmenuCode" = s."Code"
LEFT   JOIN "MasterActivities"    a ON a."Code" = p."MasterActivityCode" AND a."IsDeleted" = false
WHERE  lower(s."RouteKey") = 'backup-center' AND s."IsDeleted" = false;
