-- Puts the UTF8 copy in place : old -> <old>_W1252, copy -> old name.
-- Run from psql against the "postgres" database with
-- -v old_db=... -v new_db=... -v keep_db=...  (API stopped first)
\set ON_ERROR_STOP on

SELECT pg_terminate_backend(pid) FROM pg_stat_activity
WHERE datname IN (:'old_db', :'new_db') AND pid <> pg_backend_pid();

ALTER DATABASE :"old_db" RENAME TO :"keep_db";
ALTER DATABASE :"new_db" RENAME TO :"old_db";

SELECT datname, pg_encoding_to_char(encoding) AS encoding FROM pg_database
WHERE datname IN (:'old_db', :'keep_db') ORDER BY 1;
