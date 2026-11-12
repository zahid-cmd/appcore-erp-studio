@echo off
rem ==============================================================
rem  AppCore Console development : day start (double-click)
rem  One window : builds + starts the Console API, starts the
rem  Console (http://localhost:4300) and the website
rem  (http://localhost:4400), opens Chrome.
rem  Later C# changes : Console footer "API online" -> Build & Restart.
rem  Closing this window stops the Console only (never the ERP).
rem ==============================================================
title AppCore Console (development)
call "%~dp0Console_Studio\start-console.cmd"
