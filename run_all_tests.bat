@echo off
echo Running All Test Suites for Chennai Disaster Simulation...
cd /d "%~dp0"
echo.
echo [1/2] Running Backend Unit Tests...
python -m pytest backend/tests -v
if %ERRORLEVEL% NEQ 0 (
    echo Backend unit tests failed!
    pause
    exit /b %ERRORLEVEL%
)
echo.
echo [2/2] Running End-to-End Test Suite...
python -m pytest e2e/ -v
if %ERRORLEVEL% NEQ 0 (
    echo E2E tests failed!
    pause
    exit /b %ERRORLEVEL%
)
echo.
echo ========================================================
echo ALL TESTS PASSED SUCCESSFULLY! (35 Unit + 95 E2E Tests)
echo ========================================================
pause
