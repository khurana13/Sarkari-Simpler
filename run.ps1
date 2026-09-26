# Sarkari-Simpler Windows Startup Script
Write-Host "------------------------------------------------" -ForegroundColor Cyan
Write-Host "   Sarkari-Simpler Setup & Launch" -ForegroundColor Cyan
Write-Host "------------------------------------------------" -ForegroundColor Cyan

# Check if Node.js is installed
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: Node.js is not installed. Please install it from https://nodejs.org/" -ForegroundColor Red
    pause
    exit
}

Write-Host "📦 Installing basic serve utility..." -ForegroundColor Yellow
# Using npx directly in start.js, so no heavy install needed here

Write-Host "🚀 Launching Application..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop both servers later." -ForegroundColor Gray
Write-Host ""

node start.js
