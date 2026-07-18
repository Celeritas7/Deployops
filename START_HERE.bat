@echo off
REM Launches the interactive ML book in your browser.
REM JupyterLite must be served over HTTP (double-clicking index.html will NOT work).
cd /d "%~dp0"
echo Starting local server for the Classical ML interactive book...
echo Leave this window open while you use the book. Close it when done.
start "" http://localhost:8000/index.html
where py >nul 2>nul && (py -m http.server 8000) || (python -m http.server 8000)
