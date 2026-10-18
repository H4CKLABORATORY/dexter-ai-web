@echo off
cd /d "%~dp0"
py -3 launch_studio.py
if errorlevel 1 python launch_studio.py
