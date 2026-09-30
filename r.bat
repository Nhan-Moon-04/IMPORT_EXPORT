@echo off
title IMEX N - KHOI DONG HE THONG

echo ===================================================
echo   IMEX N - KHOI DONG HE THONG
echo ===================================================

echo.
echo [1] Tat PostgreSQL cua HIEPLOI neu dang chay...
docker stop hieploi_db >nul 2>&1

echo [2] Kiem tra PostgreSQL XNK...

docker inspect xnk_postgres >nul 2>&1

if errorlevel 1 (
    echo     XNK container chua ton tai - tao lai tu Docker Compose...
    cd /d D:\CODE\XNK
    docker compose up -d
) else (
    echo     Bat xnk_postgres...
    docker start xnk_postgres >nul 2>&1
)

echo.
echo [3] Cho PostgreSQL XNK san sang...

:WAIT_DB
docker exec xnk_postgres pg_isready -U xnk_admin -d xnk_db >nul 2>&1

if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto WAIT_DB
)

echo     PostgreSQL XNK da san sang!

echo.
echo [4] Kiem tra va kill tien trinh tren cong 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    if NOT "%%a"=="0" taskkill /PID %%a /F >nul 2>&1
)

echo [5] Kiem tra va kill tien trinh tren cong 4200...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4200') do (
    if NOT "%%a"=="0" taskkill /PID %%a /F >nul 2>&1
)

echo.
echo [6] Khoi dong Backend (.NET 8)...
cd /d D:\CODE\XNK
start cmd /k "title XNK_BACKEND && dotnet run --project backend/XNK.API --urls=http://localhost:5000"

echo [7] Khoi dong Frontend...
start cmd /k "title XNK_FRONTEND && cd /d D:\CODE\XNK\frontend && npx serve -s -p 4200"

echo.
echo ===================================================
echo   XNK DA KHOI DONG
echo.
echo   Database : xnk_postgres
echo   Backend  : http://localhost:5000
echo   Frontend : http://localhost:4200
echo ===================================================
pause