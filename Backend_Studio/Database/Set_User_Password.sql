/*===============================================================
  Set_User_Password.sql   (2026-11-20)

  Sets (or replaces) the password of ERP users, in the ERP's own
  format (PBKDF2-HMAC-SHA256, 100000 rounds, random salt).
  For users made on User Profile, which have no password yet
  ("Login credentials are not configured").

  Query Tool on the client database (e.g. AppCore_TW_DEMO).
  Fill the list below (Login ID, password), run the whole file (F5).
  Then clear the passwords from the editor : pgAdmin keeps them in
  its Query History on this PC.
  Needs pgcrypto (made here when missing). ASCII only.
===============================================================*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

DO $$
DECLARE
    -- =========================================================
    -- Login ID, new password : one row per user
    -- =========================================================
    v_list text[][] := ARRAY[
        ['Manager',       ''],
        ['demo.sales',    ''],
        ['demo.service',  ''],
        ['demo.accounts', ''],
        ['demo.manager',  '']
    ];
    -- =========================================================
    i      int;
    v_user bigint;
    v_salt bytea;
BEGIN
    IF current_database() = 'AppCoreERP_Studio' THEN
        RAISE EXCEPTION 'Use the ERP screens on the development database. Nothing was changed.';
    END IF;

    FOR i IN 1..array_length(v_list, 1) LOOP
        IF coalesce(v_list[i][2], '') = '' THEN
            CONTINUE;
        END IF;

        SELECT "UserProfileId" INTO v_user
        FROM   "UserProfiles"
        WHERE  lower("UserName") = lower(trim(v_list[i][1])) AND "IsDeleted" = false;

        IF v_user IS NULL THEN
            RAISE NOTICE '%  : no such user, skipped', rpad(v_list[i][1], 16);
            CONTINUE;
        END IF;

        IF lower(trim(v_list[i][1])) = 'appcore' THEN
            RAISE NOTICE '%  : use Client_AppCore_Support_Account.sql for the support login, skipped', rpad(v_list[i][1], 16);
            CONTINUE;
        END IF;

        v_salt := gen_random_bytes(16);

        DELETE FROM "UserCredentials" WHERE "UserProfileId" = v_user;

        INSERT INTO "UserCredentials" ("UserProfileId", "PasswordHash", "PasswordChangedDate", "CreatedDate")
        VALUES (v_user,
                'PBKDF2.100000.' || encode(v_salt, 'base64') || '.' || encode(pg_temp.pbkdf2(v_list[i][2], v_salt, 100000), 'base64'),
                now(), now());

        RAISE NOTICE '%  : password set', rpad(v_list[i][1], 16);
    END LOOP;
END $$;
