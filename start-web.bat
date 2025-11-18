@echo off
REM GTM Tag Management Web Interface - Setup and Launch Script (Windows)
REM This script installs all dependencies and starts the web interface
REM Author: Anthony Figgins
REM Version: 1.0.0
REM Date Updated: 2025-11-17

echo.
echo 🚀 GTM Tag Management Web Interface
echo ==================================
echo.

REM Get script directory
set "SCRIPT_DIR=%~dp0"
set "WEB_DIR=%SCRIPT_DIR%web"
set "AUTOMATION_DIR=%SCRIPT_DIR%automation"

REM Check for Node.js
echo Checking Node.js...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed.
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✓ Node.js found: %NODE_VERSION%

REM Check for npm
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm is not installed.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✓ npm found: %NPM_VERSION%

REM Check for Python
echo.
echo Checking Python...
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Python 3 is not installed.
    echo Please install Python 3.7+ from https://www.python.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo ✓ Python found: %PYTHON_VERSION%

REM Install Python dependencies
echo.
echo Installing Python dependencies...
cd /d "%AUTOMATION_DIR%"
if exist "requirements-gtm.txt" (
    python -m pip install -q -r requirements-gtm.txt --user
    echo ✓ Python dependencies installed
) else (
    echo ⚠️  requirements-gtm.txt not found, skipping Python dependencies
)

REM Install Node.js dependencies
echo.
echo Installing Node.js dependencies...
cd /d "%WEB_DIR%"

if not exist "node_modules" (
    echo Installing npm packages (this may take a minute)...
    call npm install
    echo ✓ Node.js dependencies installed
) else (
    echo ✓ Node.js dependencies already installed
    echo Running npm install to ensure everything is up to date...
    call npm install
)

REM Check for credentials
echo.
echo Checking credentials...
set "CREDENTIALS_FILE=%AUTOMATION_DIR%\gtm-oauth-credentials.json"
if not exist "%CREDENTIALS_FILE%" (
    echo ⚠️  OAuth credentials not found at: %CREDENTIALS_FILE%
    echo You'll need to set up OAuth credentials before using the interface.
    echo See: automation\OAUTH_SETUP.md
    echo.
    set /p CONTINUE="Continue anyway? (y/n) "
    if /i not "%CONTINUE%"=="y" (
        exit /b 1
    )
) else (
    echo ✓ OAuth credentials found
)

REM Start the web server
echo.
echo ==================================
echo Starting web interface...
echo ==================================
echo.
echo The web interface will be available at:
echo http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start Next.js dev server
echo Starting server...
start "" "http://localhost:3000"
timeout /t 2 /nobreak >nul
call npm run dev

pause

