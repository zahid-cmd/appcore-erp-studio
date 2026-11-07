@echo off
rem ============================================================
rem  AppCore Deploy Agent - install / update on the live server
rem  Run from the published agent folder, as Administrator:
rem     right-click cmd -> Run as administrator
rem     cd /d <folder with this file>
rem     install-agent.cmd
rem ============================================================
setlocal

set BASE=C:\AppCore
set SVC=AppCoreDeployAgent

net session >nul 2>&1
if errorlevel 1 (
    echo Please run this from a cmd started with "Run as administrator".
    exit /b 1
)

echo.
echo [1/5] Folders under %BASE%
for %%D in (agent releases shared backups incoming logs) do (
    if not exist "%BASE%\%%D" mkdir "%BASE%\%%D"
)

echo [2/5] Stopping the agent (if it runs)
sc query %SVC% >nul 2>&1
if not errorlevel 1 (
    sc stop %SVC% >nul 2>&1
    timeout /t 3 /nobreak >nul
)

echo [3/5] Copying the agent files
if exist "%BASE%\agent\appsettings.json" (
    rem keep the server's settings (token, database password)
    robocopy "%~dp0." "%BASE%\agent" /E /NFL /NDL /NJH /NJS /XF appsettings.json install-agent.cmd >nul
) else (
    robocopy "%~dp0." "%BASE%\agent" /E /NFL /NDL /NJH /NJS /XF install-agent.cmd >nul
)
if errorlevel 8 (
    echo Copy failed.
    exit /b 1
)

echo [4/5] Windows service %SVC%
sc query %SVC% >nul 2>&1
if errorlevel 1 (
    sc create %SVC% binPath= "\"%BASE%\agent\AppCore.DeployAgent.exe\"" start= auto DisplayName= "AppCore Deploy Agent" >nul
    sc description %SVC% "Receives AppCore ERP releases from the Deployment Center and switches the live site." >nul
    sc failure %SVC% reset= 86400 actions= restart/5000/restart/10000/restart/30000 >nul
)

echo [5/5] Firewall (Tailscale addresses only)
netsh advfirewall firewall delete rule name="AppCore Deploy Agent" >nul 2>&1
netsh advfirewall firewall add rule name="AppCore Deploy Agent" dir=in action=allow protocol=TCP localport=5099 remoteip=100.64.0.0/10 >nul
netsh advfirewall firewall delete rule name="AppCore ERP" >nul 2>&1
netsh advfirewall firewall add rule name="AppCore ERP" dir=in action=allow protocol=TCP localport=8080 remoteip=100.64.0.0/10 >nul

echo.
findstr /c:"CHANGE-ME" "%BASE%\agent\appsettings.json" >nul
if not errorlevel 1 (
    echo ------------------------------------------------------------
    echo  One more step: open %BASE%\agent\appsettings.json and set
    echo    Agent:Token              - a long random secret
    echo    Agent:Database:Password  - the postgres password
    echo  then run:  sc start %SVC%
    echo ------------------------------------------------------------
    exit /b 0
)

sc start %SVC% >nul
echo Done. The agent listens on port 5099 (Tailscale only).
endlocal
