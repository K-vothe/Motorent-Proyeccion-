# ==============================================================================
# INICIADOR EN UN PASO DEL MVP MOTORENT (COPIA DE TRABAJO AISLADA)
# ==============================================================================
# Uso: .\iniciar-motorent-mvp.ps1
# 1. Inicia PostgreSQL 18 aislado en puerto 5433 (motorent_trabajo) sin tocar
#    la base estable del repositorio original (puerto 5432).
# 2. Sincroniza el esquema Prisma y carga los datos demo idempotentes.
# 3. Muestra comandos/credenciales para levantar Backend (3000) y Frontend (5173).

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`n[MotoRent MVP] 1/3 Iniciando PostgreSQL aislado (localhost:5433)..." -ForegroundColor Cyan
Push-Location "$root\backend"
npm run db:start

Write-Host "`n[MotoRent MVP] 2/3 Sincronizando Prisma y ejecutando Seed idempotente..." -ForegroundColor Cyan
npm run db:sync
npm run db:seed
Pop-Location

Write-Host "`n[MotoRent MVP] 3/3 Entorno listo!" -ForegroundColor Green
Write-Host "  - Backend:  cd backend  && npm run dev   (http://localhost:3000)"
Write-Host "  - Frontend: cd frontend && npm run dev   (http://localhost:5173)"
Write-Host "  - Detener BD: cd backend && npm run db:stop"
Write-Host "`nCuentas demo (clave comun: MotoRent2026*):" -ForegroundColor Yellow
Write-Host "  - ADMIN:     admin@motorent.co"
Write-Host "  - OWNER:     carlos.owner@motorent.co / laura.owner@motorent.co"
Write-Host "  - RENTER:    mateo.renter@motorent.co"
Write-Host "  - PENDIENTE: sofia.pendiente@motorent.co`n"
