/*===============================================================
  AccessRequests_Setup.sql   (2026-11-20)

  "Register Now" becomes a request for access (owner 2026-11-20) :
  the sign-in page no longer makes a user. It stores a request;
  the client's administrator approves it (choosing the role and
  branches, and only then is the user made) or rejects it.

  1. Table "AccessRequests" (the password only as a PBKDF2 hash).
  2. Page Security & Permission > User Management > Access
     Requests (/security-permission/user-management/access-requests),
     hand-written : never run Submenu / Code Sync for it.
  3. Given to every role that already has User Profile, with the
     same common activities (View opens it, Update decides).

  Run on each database : AppCoreERP_Studio, AppCoreTpl_TW,
  AppCore_TW_DEMO (and any client made before 2026-11-20).
  Query Tool on that database, the whole file (F5). Saves at once.
  Safe to run again. Users sign in again to see the page.
  ASCII only.
===============================================================*/

CREATE TABLE IF NOT EXISTS "AccessRequests"
(
    "AccessRequestId"  bigserial     PRIMARY KEY,
    "PublicId"         uuid          NOT NULL DEFAULT gen_random_uuid(),
    "UserName"         varchar(100)  NOT NULL,
    "DisplayName"      varchar(200)  NOT NULL DEFAULT '',
    "FullName"         varchar(200)  NOT NULL DEFAULT '',
    "Email"            varchar(200)  NOT NULL DEFAULT '',
    "MobileNo"         varchar(50)   NOT NULL DEFAULT '',
    "UserPhotoPath"    varchar(400)  NOT NULL DEFAULT '',
    "PasswordHash"     varchar(500)  NOT NULL,
    "Status"           varchar(20)   NOT NULL DEFAULT 'Pending',
    "RequestIp"        varchar(64)   NOT NULL DEFAULT '',
    "RequestedDate"    timestamp with time zone NOT NULL DEFAULT now(),
    "DecidedBy"        bigint        NULL,
    "DecidedByName"    varchar(200)  NOT NULL DEFAULT '',
    "DecidedDate"      timestamp with time zone NULL,
    "DecisionNote"     varchar(500)  NOT NULL DEFAULT '',
    "UserProfileId"    bigint        NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "IX_AccessRequests_PublicId" ON "AccessRequests" ("PublicId");
CREATE INDEX IF NOT EXISTS "IX_AccessRequests_Status_Date" ON "AccessRequests" ("Status", "RequestedDate" DESC);
CREATE INDEX IF NOT EXISTS "IX_AccessRequests_UserName" ON "AccessRequests" (lower("UserName"));

DO $$
DECLARE
    v_menu   record;
    v_page   bigint;
    v_code   text;
    v_seq    int;
    v_order  int;
    v_src    record;
    v_detail bigint;
    n        int := 0;
BEGIN
    SELECT m."Id", m."Code", m."NavigationModuleId" INTO v_menu
    FROM   "NavigationMenus" m
    JOIN   "NavigationModules" d ON d."Id" = m."NavigationModuleId"
    WHERE  lower(trim(m."RouteKey")) = 'user-management' AND m."IsDeleted" = false
    AND    lower(trim(d."RouteKey")) = 'security-permission' AND d."IsDeleted" = false
    LIMIT  1;

    IF v_menu."Id" IS NULL THEN
        RAISE EXCEPTION 'Security & Permission > User Management not found. Nothing was changed.';
    END IF;

    -- the page ----------------------------------------------------------
    SELECT "Id" INTO v_page
    FROM   "NavigationSubmenus"
    WHERE  lower(trim("RouteKey")) = 'access-requests' AND "IsDeleted" = false
    LIMIT  1;

    IF v_page IS NULL THEN
        SELECT COALESCE(MAX("SequenceNo"), 0) + 1 INTO v_seq
        FROM   "NavigationSubmenus" WHERE "NavigationMenuId" = v_menu."Id";

        SELECT COALESCE(MAX("DisplayOrder"), 0) + 1 INTO v_order
        FROM   "NavigationSubmenus" WHERE "NavigationMenuId" = v_menu."Id" AND "IsDeleted" = false;

        v_code := 'SUB-' || substr(v_menu."Code", 5) || '-' || lpad(v_seq::text, 3, '0');

        INSERT INTO "NavigationSubmenus"
            ("NavigationMenuId", "SequenceNo", "Code", "Name", "Icon", "RouteKey", "Route",
             "DisplayOrder", "Remarks", "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        VALUES
            (v_menu."Id", v_seq, v_code, 'Access Requests', 'fa-solid fa-user-clock', 'access-requests',
             '/security-permission/user-management/access-requests', v_order,
             'Requests from the sign-in page : approve (role, branches) or reject. Hand-written page : never run Submenu / Code Sync.',
             true, false, 1, now())
        RETURNING "Id" INTO v_page;

        RAISE NOTICE 'Page Access Requests created (%).', v_code;
    ELSE
        RAISE NOTICE 'Page Access Requests already there.';
    END IF;

    -- permissions : every role that has User Profile ----------------------
    FOR v_src IN
        SELECT d."ActivityAssignmentDetailId", d."ActivityAssignmentId"
        FROM   "ActivityAssignmentDetails" d
        JOIN   "NavigationSubmenus" s ON s."Id" = d."SubMenuId"
        WHERE  lower(trim(s."RouteKey")) = 'user-profile' AND s."IsDeleted" = false AND d."IsDeleted" = false
    LOOP
        v_detail := NULL;

        SELECT "ActivityAssignmentDetailId" INTO v_detail
        FROM   "ActivityAssignmentDetails"
        WHERE  "ActivityAssignmentId" = v_src."ActivityAssignmentId" AND "SubMenuId" = v_page;

        IF v_detail IS NULL THEN
            INSERT INTO "ActivityAssignmentDetails"
                ("ActivityAssignmentId", "ModuleId", "MenuId", "SubMenuId", "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
            VALUES (v_src."ActivityAssignmentId", v_menu."NavigationModuleId", v_menu."Id", v_page, true, false, 1, now())
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

    RAISE NOTICE 'Access Requests given to % role(s) that have User Profile.', n;
END $$;

-- Who has it now
SELECT r."ProfileName" AS "Role", string_agg(a."Name", ', ' ORDER BY a."Name") AS "Activities on Access Requests"
FROM   "ActivityAssignmentDetails" d
JOIN   "ActivityAssignments" x ON x."ActivityAssignmentId" = d."ActivityAssignmentId"
JOIN   "RoleProfiles" r ON r."RoleProfileId" = x."RoleProfileId"
JOIN   "NavigationSubmenus" s ON s."Id" = d."SubMenuId"
JOIN   "ActivityAssignmentPermissions" p ON p."ActivityAssignmentDetailId" = d."ActivityAssignmentDetailId" AND p."IsDeleted" = false
JOIN   "MasterActivities" a ON a."Id" = p."MasterActivityId"
WHERE  lower(s."RouteKey") = 'access-requests' AND d."IsDeleted" = false
GROUP  BY r."ProfileName"
ORDER  BY r."ProfileName";
