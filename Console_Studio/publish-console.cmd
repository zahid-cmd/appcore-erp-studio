@echo off
rem ==============================================================
rem  AppCore Console : make the package for the live server (skyhost)
rem  Run on the development PC (double-click). Builds the website
rem  and the Console UI (production) and the Console API, puts them
rem  inside the API (wwwroot\site, wwwroot\console) and adds the
rem  server install files.
rem  Result : Console_Studio\publish\console  (copy it to skyhost)
rem  Your development appsettings.json is NOT included.
rem ==============================================================
setlocal
title AppCore Console : publish
cd /d "%~dp0"
set "OUT=%~dp0publish\console"

echo.
echo   1/4  Building the website (production) ...
pushd "%~dp0Website\AppCore_Site"
if not exist node_modules call npm install
if errorlevel 1 goto fail
call npx ng build --configuration production
if errorlevel 1 goto fail
popd

echo.
echo   2/4  Building the Console UI (production) ...
pushd "%~dp0Console_Frontend\Console_UI"
if not exist node_modules call npm install
if errorlevel 1 goto fail
call npx ng build --configuration production
if errorlevel 1 goto fail
popd

echo.
echo   3/4  Publishing the Console API ...
if exist "%OUT%" rmdir /s /q "%OUT%"
pushd "%~dp0Console_Backend\AppCore.Console.API"
dotnet publish -c Release -o "%OUT%"
if errorlevel 1 goto fail
popd

echo.
echo   4/4  Adding the website, the Console UI and the install files ...
robocopy "%~dp0Website\AppCore_Site\dist\appcore-site\browser" "%OUT%\wwwroot\site" /MIR /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 goto fail
robocopy "%~dp0Console_Frontend\Console_UI\dist\appcore-console\browser" "%OUT%\wwwroot\console" /MIR /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 goto fail
copy /y "%~dp0server\install-console.cmd" "%OUT%\" >nul
copy /y "%~dp0server\appsettings.server-template.json" "%OUT%\" >nul

echo.
echo   Done : %OUT%
echo   Copy the whole "console" folder to skyhost (e.g. C:\Temp\console)
echo   and run install-console.cmd there as administrator.
start "" explorer "%~dp0publish"
pause
exit /b 0

:fail
echo.
echo   FAILED : see the messages above.
pause
exit /b 1
