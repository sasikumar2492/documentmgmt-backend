@echo off
cd /d "%~dp0"
echo ============================================
echo  FIX P3005: Using "db push" (NOT migrate)
echo ============================================
echo.
npx prisma db push
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Failed. Check .env DATABASE_URL and PostgreSQL.
  pause
  exit /b 1
)
echo.
echo Success. Try forgot-password API again.
pause
