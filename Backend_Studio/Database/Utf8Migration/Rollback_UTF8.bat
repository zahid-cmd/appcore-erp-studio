@echo off
setlocal EnableExtensions

rem Undo of the swap : the UTF8 database goes back to
rem AppCoreERP_Studio_UTF8 and the original (WIN1252) is live again.
rem Data entered after the swap stays only in the UTF8 database.

set "PGBIN=C:\Program Files\PostgreSQL\16\bin"
set "PGHOST=100.117.11.97"
set "PGPORT=5433"
set "PGUSER=postgres"

set /p "PGPASSWORD=Password of %PGUSER% : "
echo Stop the AppCore API first.
pause

"%PGBIN%\psql.exe" -d postgres -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname IN ('AppCoreERP_Studio','AppCoreERP_Studio_W1252') AND pid <> pg_backend_pid();" -c "ALTER DATABASE \"AppCoreERP_Studio\" RENAME TO \"AppCoreERP_Studio_UTF8\";" -c "ALTER DATABASE \"AppCoreERP_Studio_W1252\" RENAME TO \"AppCoreERP_Studio\";"

set "PGPASSWORD="
pause
endlocal
