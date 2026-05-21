@echo off
echo ============================================
echo  Gram Surya Darshan - Database Setup Script
echo  Run this as Administrator
echo ============================================
echo.

REM Reload PostgreSQL to pick up pg_hba.conf changes (trust auth)
echo [1/4] Reloading PostgreSQL service...
net stop postgresql-x64-16
net start postgresql-x64-16
if %errorlevel% neq 0 (
    echo ERROR: Could not restart PostgreSQL. Make sure you're running as Administrator.
    pause
    exit /b 1
)
echo PostgreSQL restarted successfully.
echo.

REM Wait for service to be ready
timeout /t 3 /nobreak > nul

REM Create the database
echo [2/4] Creating database gram_surya_darshan...
psql -U postgres -p 5433 -c "SELECT 1 FROM pg_database WHERE datname='gram_surya_darshan'" | findstr "(1 row)" > nul
if %errorlevel% neq 0 (
    psql -U postgres -p 5433 -c "CREATE DATABASE gram_surya_darshan;"
    echo Database created.
) else (
    echo Database already exists, skipping.
)
echo.

REM Set postgres password to 'postgres' for the app
echo [3/4] Setting postgres user password...
psql -U postgres -p 5433 -c "ALTER USER postgres WITH PASSWORD 'postgres';"
echo.

REM Run migrations and seeds
echo [4/4] Running migrations and seeds...
cd /d "%~dp0backend"
call npm run setup
if %errorlevel% neq 0 (
    echo ERROR: Migrations failed. Check your database connection.
    pause
    exit /b 1
)
echo.

REM Revert pg_hba.conf back to scram-sha-256
echo Done! Reverting pg_hba.conf to scram-sha-256...
powershell -Command "(Get-Content 'C:\Program Files\PostgreSQL\16\data\pg_hba.conf') -replace 'trust', 'scram-sha-256' | Set-Content 'C:\Program Files\PostgreSQL\16\data\pg_hba.conf'"
net stop postgresql-x64-16
net start postgresql-x64-16

echo.
echo ============================================
echo  Setup Complete! 
echo  Database: gram_surya_darshan
echo  User: postgres / Password: postgres
echo  Port: 5433
echo.
echo  Now start the servers:
echo    Backend:  cd backend && npm run dev
echo    Frontend: cd frontend && npx vite
echo ============================================
pause
