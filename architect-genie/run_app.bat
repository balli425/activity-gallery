@echo off
echo Starting Architect Genie...
echo Please wait while the application starts...
start http://localhost:5173
cd /d "%~dp0"
npm run dev
pause
