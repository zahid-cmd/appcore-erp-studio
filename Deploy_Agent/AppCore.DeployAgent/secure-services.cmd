@echo off
rem ==============================================================
rem  AppCore : services under their own Windows accounts
rem  (2026-11-20, review B12 part 2). Live server (skyhost) only.
rem  Run from a cmd started with "Run as administrator".
rem
rem    secure-services.cmd status    who runs each service now
rem    secure-services.cmd console   AppCoreConsole -> its own account
rem    secure-services.cmd erp       AppCoreERP     -> its own account
rem    secure-services.cmd lock      C:\AppCore and the data folders :
rem                                  only the system, administrators
rem                                  and the two services may open them
rem    secure-services.cmd back      everything as it was (LocalSystem,
rem                                  folders open again)
rem
rem  Order : console, erp, lock. One at a time, at a quiet hour.
rem  After each step the service is asked if it answers. If it does
rem  not, the step is undone by itself and the service runs as
rem  before (LocalSystem), so the clients are back within a minute.
rem
rem  The Deploy Agent stays LocalSystem : it must stop, change and
rem  start services and write the release folders.
rem
rem  Other folders or service names : change the SET lines below.
rem ==============================================================
setlocal EnableDelayedExpansion
title AppCore : service accounts

set "ROOT=C:\AppCore"
set "ERP_SVC=AppCoreERP"
set "ERP_URL=http://localhost:8080/"
set "CON_SVC=AppCoreConsole"
set "CON_URL=http://localhost:8090/api/health"
set "CON_ROOT=%ROOT%\console-app"
set "CON_OLD=%ROOT%\console"
set "DATA1=C:\ProgramData\AppCore"
set "DATA2=C:\ProgramData\AppCoreERP"
rem the private key of the sealed database logins (the ERP gives
rem this file NO inherited rights, so a right on the folder does
rem not reach it : found 2026-11-21, Moto Corner said "not active")
set "KEYS=%DATA1%\keys"
set "KEYFILE=%KEYS%\tenant-credentials.pem"

rem SYSTEM and Administrators by number (any Windows language)
set "SID_SYSTEM=*S-1-5-18"
set "SID_ADMINS=*S-1-5-32-544"

net session >nul 2>&1
if errorlevel 1 goto notadmin

if /i "%~1"=="status"  goto status
if /i "%~1"=="console" goto console
if /i "%~1"=="erp"     goto erp
if /i "%~1"=="lock"    goto lock
if /i "%~1"=="back"    goto back

echo.
echo   Use :  secure-services.cmd status ^| console ^| erp ^| lock ^| back
echo   Order : console, erp, lock. See the top of this file.
exit /b 1

:notadmin
echo   Please run this from a cmd started with "Run as administrator".
exit /b 1


rem ==============================================================
:status
rem ==============================================================
echo.
for %%S in (%CON_SVC% %ERP_SVC% AppCoreDeployAgent) do call :showaccount %%S
echo.
echo   Who may open %ROOT% :
icacls "%ROOT%"
exit /b 0

:showaccount
set "WHO=(no such service)"
for /f "tokens=1,* delims=:" %%a in ('sc qc %~1 2^>nul ^| findstr /c:"SERVICE_START_NAME"') do set "WHO=%%b"
echo   %~1 runs as :!WHO!
exit /b 0


rem ==============================================================
:console
rem ==============================================================
set "SVC=%CON_SVC%"
set "URL=%CON_URL%"
set "ACC=NT SERVICE\%CON_SVC%"
call :needservice
if errorlevel 1 exit /b 1

echo   Rights for %ACC% on its own folders ...
if exist "%CON_ROOT%" icacls "%CON_ROOT%" /grant "%ACC%":(OI)(CI)M /T /C /Q >nul
if exist "%CON_OLD%"  icacls "%CON_OLD%"  /grant "%ACC%":(OI)(CI)M /T /C /Q >nul

call :switch
exit /b %errorlevel%


rem ==============================================================
:erp
rem ==============================================================
set "SVC=%ERP_SVC%"
set "URL=%ERP_URL%"
set "ACC=NT SERVICE\%ERP_SVC%"
call :needservice
if errorlevel 1 exit /b 1

echo   Rights for %ACC% on its own folders ...
if not exist "%DATA1%" mkdir "%DATA1%"
if not exist "%DATA2%" mkdir "%DATA2%"
if exist "%ROOT%\releases" icacls "%ROOT%\releases" /grant "%ACC%":(OI)(CI)M /T /C /Q >nul
if exist "%ROOT%\shared"   icacls "%ROOT%\shared"   /grant "%ACC%":(OI)(CI)RX /T /C /Q >nul
if exist "%ROOT%\current"  icacls "%ROOT%\current"  /grant "%ACC%":(RX) /L /C /Q >nul 2>&1
icacls "%DATA1%" /grant "%ACC%":(OI)(CI)M /T /C /Q >nul
icacls "%DATA2%" /grant "%ACC%":(OI)(CI)M /T /C /Q >nul
if exist "%KEYS%\*.pem" icacls "%KEYS%\*.pem" /grant "%ACC%":(M) /C /Q >nul

rem  the key must be open to the account BEFORE the switch
if not exist "%KEYFILE%" goto erpswitch
icacls "%KEYFILE%" | findstr /i /c:"%ERP_SVC%" >nul
if not errorlevel 1 goto erpswitch
echo   %ACC% could not be given the key file %KEYFILE%
echo   Clients with their own database login would say "not active". Nothing was changed.
exit /b 1

:erpswitch
call :switch
exit /b %errorlevel%


rem ==============================================================
:lock
rem ==============================================================
echo.
echo   Closing %ROOT%, %DATA1% and %DATA2% to other Windows users ...
icacls "%ROOT%" /inheritance:r /grant:r %SID_SYSTEM%:(OI)(CI)F %SID_ADMINS%:(OI)(CI)F /C /Q >nul
if errorlevel 1 goto lockfailed
if exist "%DATA1%" icacls "%DATA1%" /inheritance:r /grant:r %SID_SYSTEM%:(OI)(CI)F %SID_ADMINS%:(OI)(CI)F /C /Q >nul
if exist "%DATA2%" icacls "%DATA2%" /inheritance:r /grant:r %SID_SYSTEM%:(OI)(CI)F %SID_ADMINS%:(OI)(CI)F /C /Q >nul

set "BAD="
for %%S in (%CON_SVC% %ERP_SVC%) do call :restartcheck %%S
if defined BAD goto lockundo

echo.
echo   Done : the folders are closed, both services answer.
exit /b 0

:lockfailed
echo   The rights of %ROOT% could not be changed. Nothing else was done.
exit /b 1

:lockundo
echo.
echo   A service did not answer with the folders closed : opening them again.
call :openfolders
for %%S in (%CON_SVC% %ERP_SVC%) do call :restartcheck %%S
echo   The folders are open as before. Tell AppCore which service failed :%BAD%
exit /b 1

:restartcheck
sc query %~1 >nul 2>&1
if errorlevel 1 exit /b 0
set "SVC=%~1"
set "URL=%ERP_URL%"
if /i "%~1"=="%CON_SVC%" set "URL=%CON_URL%"
echo   Restarting %SVC% ...
call :stop
sc start %SVC% >nul 2>&1
call :health
if errorlevel 1 set "BAD=!BAD! %SVC%"
exit /b 0

:openfolders
icacls "%ROOT%" /inheritance:e /C /Q >nul
if exist "%DATA1%" icacls "%DATA1%" /inheritance:e /C /Q >nul
if exist "%DATA2%" icacls "%DATA2%" /inheritance:e /C /Q >nul
exit /b 0


rem ==============================================================
:back
rem ==============================================================
echo.
echo   Putting everything back as it was ...
call :openfolders
for %%S in (%CON_SVC% %ERP_SVC%) do call :backone %%S
echo.
echo   Done : both services run as LocalSystem, the folders are open as before.
exit /b 0

:backone
sc query %~1 >nul 2>&1
if errorlevel 1 exit /b 0
set "SVC=%~1"
set "URL=%ERP_URL%"
if /i "%~1"=="%CON_SVC%" set "URL=%CON_URL%"
call :stop
sc config %SVC% obj= LocalSystem >nul
sc start %SVC% >nul 2>&1
call :health
if errorlevel 1 echo   %SVC% does not answer yet : look at it in Services.
exit /b 0


rem ==============================================================
rem  helpers
rem ==============================================================

:needservice
sc query %SVC% >nul 2>&1
if not errorlevel 1 exit /b 0
echo   The Windows service %SVC% was not found. Nothing was changed.
exit /b 1

rem  stop, set the account, start, ask; back to LocalSystem if silent
:switch
echo   Stopping %SVC% ...
call :stop
echo   %SVC% now runs as %ACC% ...
sc config %SVC% obj= "%ACC%" >nul 2>&1
if errorlevel 1 sc config %SVC% obj= "%ACC%" password= "" >nul 2>&1
if errorlevel 1 goto switchnoaccount
sc start %SVC% >nul 2>&1
call :health
if errorlevel 1 goto switchundo
echo.
echo   Done : %SVC% runs as %ACC% and answers on %URL%
echo   Now try it for real : sign in, open a page with pictures, save something.
echo   If anything is wrong :  secure-services.cmd back
exit /b 0

:switchnoaccount
echo   Windows did not accept the account. %SVC% is started again as it was.
sc start %SVC% >nul 2>&1
exit /b 1

:switchundo
echo.
echo   %SVC% did not answer as %ACC% : switching back to LocalSystem ...
call :stop
sc config %SVC% obj= LocalSystem >nul
sc start %SVC% >nul 2>&1
call :health
if errorlevel 1 goto switchdead
echo   %SVC% runs as before (LocalSystem) and answers. Nothing else was changed.
echo   Look at : Event Viewer, Windows Logs, Application, for why it did not start.
exit /b 1

:switchdead
echo   %SVC% does not answer as LocalSystem either : look at it in Services now.
exit /b 1

:stop
sc stop %SVC% >nul 2>&1
set /a TRY=0
:stoploop
sc query %SVC% | findstr /c:"STOPPED" >nul
if not errorlevel 1 exit /b 0
set /a TRY+=1
if %TRY% GEQ 30 exit /b 1
ping -n 2 127.0.0.1 >nul
goto stoploop

rem  up to about 90 seconds; any answer below 500 = alive
:health
set /a TRY=0
:healthloop
set "CODE=000"
for /f %%c in ('curl -s -o nul -m 5 -w "%%{http_code}" "%URL%" 2^>nul') do set "CODE=%%c"
if %CODE% GEQ 200 if %CODE% LSS 500 exit /b 0
set /a TRY+=1
if %TRY% GEQ 30 exit /b 1
ping -n 4 127.0.0.1 >nul
goto healthloop
