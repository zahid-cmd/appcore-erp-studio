@echo off
rem ==============================================================
rem  AppCore ERP (Moto Zone development) : day start (double-click)
rem  One window : builds + starts the ERP API, starts the ERP
rem  screens (http://localhost:4100), opens Chrome.
rem  Later C# changes : ERP footer "Server online" -> Build & Restart.
rem  Closing this window stops the ERP only (never the Console).
rem ==============================================================
title AppCore ERP (development)
call "%~dp0Backend_Studio\dev-agent\start-appcore.cmd"
