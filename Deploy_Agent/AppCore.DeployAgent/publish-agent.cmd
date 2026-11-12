@echo off
rem ==============================================================
rem  AppCore Deploy Agent : make the package (development PC)
rem  Double-click. Result : this folder\publish
rem  Then copy "publish" to skyhost (e.g. C:\Temp\agent) and run
rem  install-agent.cmd there as administrator (keeps the server's
rem  appsettings.json : token and database password).
rem ==============================================================
title AppCore Deploy Agent : publish
cd /d "%~dp0"
if exist publish rmdir /s /q publish
dotnet publish -c Release -o publish
if errorlevel 1 (
    echo.
    echo   FAILED : see the messages above.
    pause
    exit /b 1
)
copy /y install-agent.cmd publish\ >nul
echo.
echo   Done : %~dp0publish
echo   Copy it to skyhost and run install-agent.cmd as administrator.
start "" explorer "%~dp0publish"
pause
