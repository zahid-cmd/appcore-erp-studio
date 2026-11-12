@echo off
rem ==============================================================
rem  AppCore Console : day start (double-click)
rem  One window does everything (dev-agent\console-agent.js) :
rem    - builds and starts the Console API   http://localhost:5300
rem    - starts the Console UI               http://localhost:4300
rem    - starts the website                  http://localhost:4400
rem    - opens Chrome
rem  Later C# changes : click "API online" in the Console footer
rem  -> Build & Restart API (no commands to type).
rem  Keep this window open; closing it stops all three.
rem  Tip : don't click inside this window (Windows pauses it).
rem ==============================================================
title AppCore Console
cd /d "%~dp0dev-agent"
where node >nul 2>&1
if errorlevel 1 (
    echo   Node.js is not installed : https://nodejs.org
    pause
    exit /b 1
)
node console-agent.js --all
echo.
echo   The Console agent stopped.
pause
