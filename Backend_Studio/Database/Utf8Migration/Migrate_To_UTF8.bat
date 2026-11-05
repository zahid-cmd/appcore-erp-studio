@echo off
setlocal EnableExtensions

rem ==============================================================
rem  AppCore ERP : move the database from WIN1252 to UTF8
rem
rem  1. backup of the live database (converted to UTF8)
rem  2. new empty UTF8 database  AppCoreERP_Studio_UTF8
rem  3. restore the backup into it
rem  4. compare the rows of every table (old vs new)
rem  5. (asks first) swap : old -> AppCoreERP_Studio_W1252,
rem     new -> AppCoreERP_Studio
rem
rem  Nothing in the live database changes before step 5. Undo after
rem  step 5 : Rollback_UTF8.bat
rem ==============================================================

rem ---- settings (change PGBIN to your PostgreSQL bin folder) ----
set "PGBIN=C:\Program Files\PostgreSQL\16\bin"
set "PGHOST=100.117.11.97"
set "PGPORT=5433"
set "PGUSER=postgres"
set "DB=AppCoreERP_Studio"
set "NEWDB=AppCoreERP_Studio_UTF8"
set "KEEPDB=AppCoreERP_Studio_W1252"
set "HERE=%~dp0"
set "WORK=%HERE%work"

if not exist "%PGBIN%\pg_dump.exe" (
    echo pg_dump.exe not found in "%PGBIN%". Edit PGBIN at the top of this file.
    goto :fail
)

if not exist "%WORK%" mkdir "%WORK%"

set /p "PGPASSWORD=Password of %PGUSER% on %PGHOST%:%PGPORT% : "
cls

echo.
echo ===== Versions (pg_dump must be the same or newer than the server) =====
"%PGBIN%\pg_dump.exe" --version
"%PGBIN%\psql.exe" -d postgres -Atc "SELECT 'server : ' || current_setting('server_version')" || goto :fail

echo.
echo ===== Live database =====
"%PGBIN%\psql.exe" -d postgres -Atc "SELECT datname || ' : ' || pg_encoding_to_char(encoding) || ' / ' || datcollate || ' / ' || pg_size_pretty(pg_database_size(datname)) FROM pg_database WHERE datname IN ('%DB%','%NEWDB%','%KEEPDB%')" || goto :fail

echo.
echo Stop the AppCore API now (and close pgAdmin query tabs on %DB%),
echo so nothing is written during the copy.
pause

echo.
echo ===== 1. Backup (converted to UTF8) =====
"%PGBIN%\pg_dump.exe" -d "%DB%" -Fc -E UTF8 -f "%WORK%\%DB%_before_utf8.backup" || goto :fail
echo Backup : "%WORK%\%DB%_before_utf8.backup"

echo.
echo ===== 2. New UTF8 database %NEWDB% =====
"%PGBIN%\psql.exe" -d postgres -v old_db=%DB% -v new_db=%NEWDB% -f "%HERE%Create_UTF8_Database.sql" || goto :fail

echo.
echo ===== 3. Restore into %NEWDB% =====
"%PGBIN%\pg_restore.exe" -d "%NEWDB%" --exit-on-error "%WORK%\%DB%_before_utf8.backup" || goto :fail

echo.
echo ===== 4. Compare rows of every table =====
"%PGBIN%\psql.exe" -d "%DB%"    -At -F "|" -f "%HERE%RowCounts.sql" -o "%WORK%\rows_old.txt" || goto :fail
"%PGBIN%\psql.exe" -d "%NEWDB%" -At -F "|" -f "%HERE%RowCounts.sql" -o "%WORK%\rows_new.txt" || goto :fail
fc "%WORK%\rows_old.txt" "%WORK%\rows_new.txt" >nul
if errorlevel 1 (
    echo ROW COUNTS DIFFER. Compare "%WORK%\rows_old.txt" and "%WORK%\rows_new.txt".
    echo The live database is untouched. Drop %NEWDB% and send the two files.
    goto :fail
)
for /f %%n in ('type "%WORK%\rows_old.txt" ^| find /c /v ""') do set "TABLES=%%n"
echo All %TABLES% tables have the same rows.

echo.
echo ===== 5. Swap =====
echo %DB%  becomes  %KEEPDB%  (kept, untouched)
echo %NEWDB%  becomes  %DB%  (UTF8, used by the API)
set /p "GO=Type YES to swap now : "
if /i not "%GO%"=="YES" (
    echo Not swapped. %NEWDB% stays for you to check; run this file again later.
    goto :end
)
"%PGBIN%\psql.exe" -d postgres -v old_db=%DB% -v new_db=%NEWDB% -v keep_db=%KEEPDB% -f "%HERE%Swap_Databases.sql" || goto :fail

echo.
echo DONE. Start the API and test (e.g. a follow-up note in Bangla).
echo Keep %KEEPDB% for a week, then drop it.
goto :end

:fail
echo.
echo STOPPED : see the message above. The live database %DB% was not changed
echo unless step 5 had already finished.

:end
set "PGPASSWORD="
pause
endlocal
