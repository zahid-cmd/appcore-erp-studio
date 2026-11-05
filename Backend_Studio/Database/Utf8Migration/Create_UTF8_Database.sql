-- Creates the empty UTF8 copy :new_db with the old database's locale
-- (Windows server) or C.UTF-8 (Linux server). Run from psql against
-- the "postgres" database with -v old_db=... -v new_db=...
\set ON_ERROR_STOP on

SELECT (version() ILIKE '%windows%' OR version() ILIKE '%mingw%' OR version() ILIKE '%visual c%') AS is_windows \gset
SELECT datcollate AS old_collate, datctype AS old_ctype FROM pg_database WHERE datname = :'old_db' \gset

\if :is_windows
    CREATE DATABASE :"new_db" WITH TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE :'old_collate' LC_CTYPE :'old_ctype';
\else
    CREATE DATABASE :"new_db" WITH TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C.UTF-8' LC_CTYPE 'C.UTF-8';
\endif

SELECT datname, pg_encoding_to_char(encoding) AS encoding, datcollate, datctype FROM pg_database WHERE datname = :'new_db';
