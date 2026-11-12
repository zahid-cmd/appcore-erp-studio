@echo off
rem ==============================================================
rem  AppCore Console : install / update on the live server (skyhost)
rem  Run as administrator from the copied "console" folder.
rem    - copies the files to C:\AppCore\console (keeps its appsettings.json)
rem    - first time : creates appsettings.json from the template and
rem      opens it in Notepad; fill it in, then run this file again
rem    - creates / restarts the Windows service "AppCoreConsole"
rem      on http://localhost:8090 (the Cloudflare tunnel points there)
rem ==============================================================
setlocal
title AppCore Console : install
set "SRC=%~dp0"
set "DST=C:\AppCore\console"
set "SVC=AppCoreConsole"

net session >nul 2>&1
if errorlevel 1 (
    echo   Please run this file as administrator : right-click, Run as administrator.
    pause
    exit /b 1
)

sc query %SVC% >nul 2>&1
if not errorlevel 1 (
    echo   Stopping %SVC% ...
    sc stop %SVC% >nul 2>&1
    timeout /t 6 /nobreak >nul
)

if not exist "%DST%" mkdir "%DST%"
echo   Copying files to %DST% ...
robocopy "%SRC%." "%DST%" /MIR /XF appsettings.json install-console.cmd /XD logs /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 (
    echo   Copy failed.
    pause
    exit /b 1
)

if not exist "%DST%\appsettings.json" (
    copy /y "%SRC%appsettings.server-template.json" "%DST%\appsettings.json" >nul
    echo.
    echo   FIRST INSTALL : fill in %DST%\appsettings.json
    echo     - ConnectionStrings : Control  : the database password
    echo       ^(Host / Port as the ERP uses on this server^)
    echo     - Jwt : Key : a long random key. Make one with :
    echo       powershell -c "[guid]::NewGuid().ToString('N')+[guid]::NewGuid().ToString('N')"
    echo   Save, close Notepad, then run install-console.cmd again.
    start "" notepad "%DST%\appsettings.json"
    pause
    exit /b 0
)

sc query %SVC% >nul 2>&1
if errorlevel 1 (
    echo   Creating the service %SVC% ...
    sc create %SVC% binPath= "\"%DST%\AppCore.Console.API.exe\" --urls http://localhost:8090" start= auto DisplayName= "AppCore Console" >nul
    sc description %SVC% "AppCore Console API and the AppCore Technologies website (localhost:8090)" >nul
    sc failure %SVC% reset= 86400 actions= restart/5000/restart/5000/restart/30000 >nul
)

echo   Starting %SVC% ...
sc start %SVC% >nul 2>&1
timeout /t 8 /nobreak >nul

curl -s -f http://localhost:8090/api/health >nul 2>&1
if errorlevel 1 (
    echo.
    echo   The service did not answer on http://localhost:8090 yet.
    echo   Check : Event Viewer ^> Windows Logs ^> Application ^(source .NET Runtime / AppCoreConsole^)
    echo   Most often : a wrong database password or a Jwt Key shorter than 32 characters.
) else (
    echo.
    echo   AppCore Console is running : http://localhost:8090
    echo   Website : http://localhost:8090/   API : http://localhost:8090/api/health
)
pause
exit /b 0
