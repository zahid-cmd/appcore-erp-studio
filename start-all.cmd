@echo off
rem ==============================================================
rem  AppCore : start everything for the day (double-click)
rem    1. AppCore ERP (Studio) : dev agent, API, UI
rem    2. AppCore Console : API, Console UI, Website
rem ==============================================================
title AppCore : start all
start "AppCore ERP" "%~dp0Backend_Studio\dev-agent\start-appcore.cmd"
start "AppCore Console" "%~dp0Console_Studio\start-console.cmd"
exit /b 0
