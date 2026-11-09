/*===============================================================
  Developer role and DUP / CUP profile codes  (2026-11-09)

  1. RoleProfiles gets "IsDeveloperRole" (false for every role).
  2. A "Developer" role is added (system role, marked developer).
  3. The user UP-001 gets the Developer role on top of the roles
     it already has (its permissions stay the same : full).
  4. Profile codes : no old UP- code is kept.
                     UP-001          -> DUP-001 (developer)
                     every other one -> CUP-001, CUP-002 ...
                                        (renumbered, old order)

  Only developers see the Developer role and developer accounts
  (User Profile, Role Profile, Role / Branch / Special / Activity
  Assignment). New users get CUP-, developers DUP-.

  Safe to run more than once. Everything in one transaction :
  if anything fails nothing changes.
===============================================================*/

BEGIN;

ALTER TABLE "RoleProfiles"
    ADD COLUMN IF NOT EXISTS "IsDeveloperRole" boolean NOT NULL DEFAULT false;

DO $$
DECLARE
    v_role_id    bigint;
    v_user_id    bigint;
    v_assign_id  bigint;
    v_next_no    int;
    v_next_order int;
BEGIN
    -------------------------------------------------------------
    -- The first developer : UP-001 (or DUP-001 when re-run)
    -------------------------------------------------------------
    SELECT "UserProfileId" INTO v_user_id
    FROM   "UserProfiles"
    WHERE  "ProfileCode" IN ('UP-001', 'DUP-001')
    AND    NOT "IsDeleted"
    ORDER  BY "UserProfileId"
    LIMIT  1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User UP-001 not found. Nothing changed.';
    END IF;

    -------------------------------------------------------------
    -- Developer role
    -------------------------------------------------------------
    SELECT "RoleProfileId" INTO v_role_id
    FROM   "RoleProfiles"
    WHERE  "IsDeveloperRole" AND NOT "IsDeleted"
    LIMIT  1;

    IF v_role_id IS NULL THEN
        SELECT COALESCE(MAX(NULLIF(regexp_replace("ProfileCode", '\D', '', 'g'), '')::int), 0) + 1
        INTO   v_next_no
        FROM   "RoleProfiles"
        WHERE  "ProfileCode" LIKE 'RP-%';

        SELECT COALESCE(MAX("DisplayOrder"), 0) + 1
        INTO   v_next_order
        FROM   "RoleProfiles";

        INSERT INTO "RoleProfiles"
            ("PublicId", "ProfileCode", "ProfileName", "Remarks", "DisplayOrder",
             "IsSystemRole", "IsDefaultRole", "IsDeveloperRole",
             "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        VALUES
            (gen_random_uuid(), 'RP-' || lpad(v_next_no::text, 3, '0'), 'Developer',
             'Developers : receive feedback, see developer accounts. Hidden from ERP users.',
             v_next_order,
             true, false, true,
             true, false, 1, now() AT TIME ZONE 'UTC')
        RETURNING "RoleProfileId" INTO v_role_id;

        RAISE NOTICE 'Developer role added (id %).', v_role_id;
    END IF;

    -------------------------------------------------------------
    -- Role assignment of the first developer
    -------------------------------------------------------------
    SELECT "RoleAssignmentId" INTO v_assign_id
    FROM   "RoleAssignments"
    WHERE  "UserProfileId" = v_user_id AND NOT "IsDeleted"
    ORDER  BY "RoleAssignmentId"
    LIMIT  1;

    IF v_assign_id IS NULL THEN
        INSERT INTO "RoleAssignments"
            ("PublicId", "UserProfileId", "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        VALUES
            (gen_random_uuid(), v_user_id, true, false, 1, now() AT TIME ZONE 'UTC')
        RETURNING "RoleAssignmentId" INTO v_assign_id;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM "RoleAssignmentDetails"
        WHERE  "RoleAssignmentId" = v_assign_id
        AND    "RoleProfileId"    = v_role_id
        AND    NOT "IsDeleted")
    THEN
        INSERT INTO "RoleAssignmentDetails"
            ("RoleAssignmentId", "RoleProfileId", "IsActive", "IsDeleted", "CreatedBy", "CreatedDate")
        VALUES
            (v_assign_id, v_role_id, true, false, 1, now() AT TIME ZONE 'UTC');

        RAISE NOTICE 'Developer role given to user id %.', v_user_id;
    END IF;

    -------------------------------------------------------------
    -- Codes : developer -> DUP-, everybody else -> CUP-
    -------------------------------------------------------------
    -- No old UP- code is kept : the developer becomes DUP-001,
    -- every other user is renumbered CUP-001, CUP-002 ... in the
    -- order of the old numbers (deleted users too, so a code is
    -- never reused)
    UPDATE "UserProfiles"
    SET    "ProfileCode" = 'DUP-001'
    WHERE  "UserProfileId" = v_user_id
    AND    "ProfileCode" NOT LIKE 'DUP-%';

    UPDATE "UserProfiles" p
    SET    "ProfileCode" = 'CUP-' || lpad(n.rn::text, 3, '0')
    FROM  (
            SELECT "UserProfileId",
                   row_number() OVER (
                       ORDER BY NULLIF(regexp_replace("ProfileCode", '\D', '', 'g'), '')::int NULLS LAST,
                                "UserProfileId") AS rn
            FROM   "UserProfiles"
            WHERE  "ProfileCode" NOT LIKE 'DUP-%'
            AND    "ProfileCode" NOT LIKE 'CUP-%'
            AND    "UserProfileId" <> v_user_id
          ) n
    WHERE  p."UserProfileId" = n."UserProfileId";

    RAISE NOTICE 'Profile codes changed to DUP- / CUP-.';
END $$;

COMMIT;

-- Check
SELECT p."ProfileCode", p."UserName", p."DisplayName",
       string_agg(r."ProfileName", ', ' ORDER BY d."RoleAssignmentDetailId") AS roles
FROM   "UserProfiles" p
LEFT   JOIN "RoleAssignments" a        ON a."UserProfileId" = p."UserProfileId" AND NOT a."IsDeleted"
LEFT   JOIN "RoleAssignmentDetails" d  ON d."RoleAssignmentId" = a."RoleAssignmentId" AND NOT d."IsDeleted"
LEFT   JOIN "RoleProfiles" r           ON r."RoleProfileId" = d."RoleProfileId"
WHERE  NOT p."IsDeleted"
GROUP  BY p."UserProfileId", p."ProfileCode", p."UserName", p."DisplayName"
ORDER  BY p."ProfileCode";
