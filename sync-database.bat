@echo off
cd /d "%~dp0"
echo.
echo Running: npx prisma db push
echo (This adds missing tables. Use this when migrate deploy gives P3005.)
echo.
call npx prisma db push
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Failed. Check .env DATABASE_URL and that PostgreSQL is running.
  pause
  exit /b 1
)
echo.
echo Done. Try forgot-password API again.
pause
