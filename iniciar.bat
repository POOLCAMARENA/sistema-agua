@echo off
title Sistema de Agua
cd /d C:\SISTEMA_AGUA
echo Iniciando servicios...
pm2 resurrect
echo.
echo Servicios iniciados correctamente.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
pause