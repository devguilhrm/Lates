$ErrorActionPreference = 'Stop'

Write-Host "==> Backend tests"
Push-Location "$PSScriptRoot\..\backend"
npm run test:ci
Pop-Location

Write-Host "==> Frontend tests"
Push-Location "$PSScriptRoot\..\frontend"
npm run test:ci
Pop-Location

Write-Host "==> Mobile tests"
Push-Location "$PSScriptRoot\..\mobile-app"
npm run test:ci
Pop-Location

Write-Host "Todos os testes passaram."
