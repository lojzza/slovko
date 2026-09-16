@echo off
rem Slovko - nouzove spusteni pres prikazovy radek
setlocal
set PY=pythonw.exe
where pythonw.exe >nul 2>nul || set PY=python.exe
start "" "%PY%" "%~dp0Slovko.py"
exit /b 0