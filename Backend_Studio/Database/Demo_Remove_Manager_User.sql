/*===============================================================
  Demo_Remove_Manager_User.sql   (2026-11-20)

  AppCore_TW_DEMO only. Owner : "delete cup-001 and reset code".
  Removes the test user "Manager" (CUP-001) for good, with its
  role / branch / special assignments and password, then gives
  "Admin" the code CUP-001.

  Query Tool on AppCore_TW_DEMO, the whole file (F5). All or
  nothing : if another table still points to the user, nothing is
  changed and the message names that table. ASCII only.
===============================================================*/

DO $$
DECLARE
    v_user  bigint;
    v_admin bigint;
    t       text;
BEGIN
    IF current_database() <> 'AppCore_TW_DEMO' THEN
        RAISE EXCEPTION 'Only for AppCore_TW_DEMO (this is %). Nothing was changed.', current_database();
    END IF;

    SELECT "UserProfileId" INTO v_user
    FROM   "UserProfiles"
    WHERE  "ProfileCode" = 'CUP-001' AND lower("UserName") = 'manager';

    IF v_user IS NULL THEN
        RAISE EXCEPTION 'User Manager (CUP-001) not found. Nothing was changed.';
    END IF;

    SELECT "UserProfileId" INTO v_admin
    FROM   "UserProfiles"
    WHERE  lower("UserName") = 'admin';

    -- assignments and password
    DELETE FROM "RoleAssignmentDetails"
    WHERE  "RoleAssignmentId" IN (SELECT "RoleAssignmentId" FROM "RoleAssignments" WHERE "UserProfileId" = v_user);
    DELETE FROM "RoleAssignments" WHERE "UserProfileId" = v_user;

    DELETE FROM "BranchAssignmentDetails"
    WHERE  "BranchAssignmentId" IN (SELECT "BranchAssignmentId" FROM "BranchAssignments" WHERE "UserProfileId" = v_user);
    DELETE FROM "BranchAssignments" WHERE "UserProfileId" = v_user;

    IF to_regclass('public."SpecialAssignments"') IS NOT NULL THEN
        IF to_regclass('public."SpecialAssignmentDetails"') IS NOT NULL THEN
            DELETE FROM "SpecialAssignmentDetails"
            WHERE  "SpecialAssignmentId" IN (SELECT "SpecialAssignmentId" FROM "SpecialAssignments" WHERE "UserProfileId" = v_user);
        END IF;
        DELETE FROM "SpecialAssignments" WHERE "UserProfileId" = v_user;
    END IF;

    -- per-user rows kept by the ERP (when the table exists)
    FOREACH t IN ARRAY ARRAY['UserCredentials', 'PasswordResetVerifications', 'UserSessions', 'LoginHistories',
                             'UserPreferences', 'UserFavorites', 'UserRecentPages', 'Notifications']
    LOOP
        IF to_regclass(format('public.%I', t)) IS NOT NULL
           AND EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = 'public' AND table_name = t AND column_name = 'UserProfileId') THEN
            EXECUTE format('DELETE FROM public.%I WHERE "UserProfileId" = $1', t) USING v_user;
        END IF;
    END LOOP;

    DELETE FROM "UserProfiles" WHERE "UserProfileId" = v_user;

    RAISE NOTICE 'User Manager (CUP-001) deleted.';

    IF v_admin IS NOT NULL THEN
        UPDATE "UserProfiles" SET "ProfileCode" = 'CUP-001' WHERE "UserProfileId" = v_admin;
        RAISE NOTICE 'Admin is now CUP-001.';
    END IF;
END $$;

SELECT "ProfileCode", "UserName", "DisplayName"
FROM   "UserProfiles"
WHERE  "IsDeleted" = false AND "ProfileCode" LIKE 'CUP-%'
ORDER  BY "ProfileCode";
