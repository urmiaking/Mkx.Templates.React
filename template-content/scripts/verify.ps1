param([string]$Configuration='Release')
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$publish=Join-Path ([IO.Path]::GetTempPath()) ('mkx-react-publish-'+[guid]::NewGuid().ToString('N'))
Push-Location $root
try {
  dotnet restore Mkx.Templates.slnx
  if($LASTEXITCODE -ne 0){throw 'dotnet restore failed'}
  dotnet build Mkx.Templates.slnx -c $Configuration --no-restore
  if($LASTEXITCODE -ne 0){throw 'dotnet build failed'}
  dotnet test --solution Mkx.Templates.slnx -c $Configuration -v:q
  if($LASTEXITCODE -ne 0){throw 'dotnet test failed'}
  Push-Location src/Client
  try {
    npm ci --no-audit --no-fund
    if($LASTEXITCODE -ne 0){throw 'npm ci failed'}
    npm run lint
    if($LASTEXITCODE -ne 0){throw 'npm lint failed'}
    npm run typecheck
    if($LASTEXITCODE -ne 0){throw 'npm typecheck failed'}
    npm test
    if($LASTEXITCODE -ne 0){throw 'npm test failed'}
    npm run build
    if($LASTEXITCODE -ne 0){throw 'npm build failed'}
  } finally {Pop-Location}
  dotnet publish src/Server/Mkx.Templates.Server -c $Configuration --no-restore -o $publish
  if($LASTEXITCODE -ne 0){throw 'dotnet publish failed'}
  if(!(Test-Path (Join-Path $publish 'wwwroot/index.html'))){throw 'Published SPA index.html missing'}
  if(!(Get-ChildItem (Join-Path $publish 'wwwroot/assets') -Filter '*.js' -ErrorAction SilentlyContinue)){throw 'Published JS missing'}
  Write-Host "Generated solution verification passed: $publish"
} finally {Pop-Location}
