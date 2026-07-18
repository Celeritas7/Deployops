@echo off
title DeployOps local server
REM DeployOps - run the app locally (no GitHub upload, no installs needed).
REM Put this file in your repo root (next to the "app" folder) and double-click.
REM Leave this window open while testing. Close it to stop the server.
cd /d "%~dp0"

if exist "app\index.html" (
  set PAGE=http://localhost:8000/app/index.html
) else (
  set PAGE=http://localhost:8000/index.html
)

echo Serving %CD%
echo Opening %PAGE%
echo Leave this window open while you test. Close it to stop.
start "" %PAGE%

powershell -NoProfile -ExecutionPolicy Bypass -Command "$l=New-Object Net.HttpListener;$l.Prefixes.Add('http://localhost:8000/');$l.Start();Write-Host 'Server running on http://localhost:8000/ ...';while($l.IsListening){$c=$l.GetContext();try{$lp=[Uri]::UnescapeDataString($c.Request.Url.LocalPath);$p=Join-Path (Get-Location) ($lp.TrimStart('/') -replace '/','\');if([IO.Directory]::Exists($p)){$p=Join-Path $p 'index.html'};if([IO.File]::Exists($p)){$b=[IO.File]::ReadAllBytes($p);$e=[IO.Path]::GetExtension($p).ToLower();$m=@{'.html'='text/html; charset=utf-8';'.htm'='text/html; charset=utf-8';'.js'='text/javascript';'.css'='text/css';'.png'='image/png';'.jpg'='image/jpeg';'.jpeg'='image/jpeg';'.gif'='image/gif';'.svg'='image/svg+xml';'.json'='application/json';'.pdf'='application/pdf';'.ico'='image/x-icon';'.woff'='font/woff';'.woff2'='font/woff2'}[$e];if(-not $m){$m='application/octet-stream'};$c.Response.ContentType=$m;$c.Response.OutputStream.Write($b,0,$b.Length)}else{$c.Response.StatusCode=404}}catch{};$c.Response.Close()}"

echo.
echo Server stopped.
pause
