@echo off
echo ===================================================
echo   IMEX N - KHOI DONG HE THONG (BACKEND + FRONTEND)
echo ===================================================

echo.
echo [1] Kiem tra va kill tien trinh tren cong 5000 (Backend)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    if NOT "%%a"=="0" taskkill /PID %%a /F >nul 2>&1
)

echo [2] Kiem tra va kill tien trinh tren cong 4200 (Frontend)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4200') do (
    if NOT "%%a"=="0" taskkill /PID %%a /F >nul 2>&1
)

echo.
echo [3] Khoi dong Backend (.NET 8) tai http://localhost:5000
start cmd /k "title XNK_BACKEND && dotnet run --project backend/XNK.API --urls=http://localhost:5000"

echo [4] Khoi dong Frontend (Vanilla JS) tai http://localhost:4200
start cmd /k "title XNK_FRONTEND && cd frontend && npx serve -s -p 4200"

echo.
echo Da hoan tat lenh khoi dong! 
echo Vui long truy cap vao Frontend tai: http://localhost:4200
echo ===================================================
pause
