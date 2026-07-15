@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"

set "BUILD_SCRIPT=%~dp0packaging\build\Publish-ComicShrimp.ps1"
if not exist "%BUILD_SCRIPT%" (
  echo Build script was not found:
  echo %BUILD_SCRIPT%
  pause
  exit /b 1
)

where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo Windows PowerShell was not found.
  pause
  exit /b 1
)

powershell.exe -NoExit -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%BUILD_SCRIPT%"
set "BUILD_EXIT=%ERRORLEVEL%"
echo.
echo Build command exited with code %BUILD_EXIT%.
pause
exit /b %BUILD_EXIT%
